import type { Nodes } from 'mdast';
import { looksLikeCodeLine } from './codeLine';
import { findCodeShapedWords, identifiersIn } from './codeWords';
import { parseMarkdownTree } from './markdownSyntax';

export interface Segment {
  // One paragraph, heading, list item or table cell to translate, with its placeholders in place.
  text: string;
  // A table cell: its translation must stay on one line with no bare | in it.
  isTableCell?: boolean;
  // Where the segment sits in ParseResult.text, so a translation can be spliced back.
  start: number;
  end: number;
}

export interface ParseResult {
  // Markdown with every code block, inline code span and bare code line replaced by a placeholder token.
  text: string;
  // Placeholder token -> exact original source of the code it replaced.
  placeholders: Map<string, string>;
  // The placeholders that stand for a whole block (a code block or a code line), which
  // must stay on a line of their own; every other placeholder sits inside a sentence.
  blockTokens: Set<string>;
  // The parts of `text` to translate, in document order. Code-only parts are left out.
  segments: Segment[];
}

interface Range {
  start: number;
  end: number;
  isBlock?: boolean;
  // Real code (a block, inline code or a code line), whose names are worth reusing.
  isCode?: boolean;
}

interface Block extends Range {
  isTableCell: boolean;
}

interface Replacement extends Range {
  token: string;
}

export function parseMarkdown(input: string): ParseResult {
  const tree = parseMarkdownTree(input);

  const spans: Range[] = [];
  collectCodeSpans(tree, spans, input);

  const blocks: Block[] = [];
  collectTextBlocks(tree, blocks);

  for (const block of blocks) {
    collectBareCodeLines(input, block, spans);
    collectSettingValues(input, block, spans);
  }
  // Names from the answer's own code are kept in English in its sentences too.
  const knownNames = new Set(spans.filter(span => span.isCode).flatMap(span => [...identifiersIn(input.slice(span.start, span.end))]));
  collectCodeShapedWords(tree, input, spans, knownNames);
  spans.sort((a, b) => a.start - b.start);

  const blockTokens = new Set<string>();
  const placeholders = new Map<string, string>();
  const replacements: Replacement[] = [];
  let text = '';
  let cursor = 0;
  let counter = 0;

  for (const span of spans) {
    let token: string;
    do {
      counter++;
      token = `SKIP_${String(counter).padStart(3, '0')}`;
    } while (input.includes(token)); // never reuse a token that already appears in the input

    placeholders.set(token, input.slice(span.start, span.end));
    if (span.isBlock) {
      blockTokens.add(token);
    }
    replacements.push({ ...span, token });
    text += input.slice(cursor, span.start) + token;
    cursor = span.end;
  }

  text += input.slice(cursor);

  const tokens = [...placeholders.keys()];
  const segments: Segment[] = [];
  for (const block of blocks) {
    const segment = trimSegment(text, toOutputOffset(block.start, replacements), toOutputOffset(block.end, replacements), tokens);
    if (segment) {
      segments.push(block.isTableCell ? { ...segment, isTableCell: true } : segment);
    }
  }

  return { text, placeholders, blockTokens, segments };
}

// Walks the AST in document order. Code nodes have no children, so spans never overlap.
function collectCodeSpans(node: Nodes, spans: Range[], input: string): void {
  if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'image' || isBareAddress(node)) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      spans.push({ start, end, isBlock: node.type === 'code', isCode: node.type === 'code' || node.type === 'inlineCode' });
    }
    return;
  }

  // A link's words are translated but its address is not: only "[the docs]" is sent,
  // and the "(https://…)" after it is hidden like code.
  if (node.type === 'link') {
    const textEnd = node.children.at(-1)?.position?.end.offset;
    const end = node.position?.end.offset;
    if (textEnd !== undefined && end !== undefined && input.slice(textEnd, textEnd + 2) === '](') {
      spans.push({ start: textEnd + 1, end });
    }
  }

  if ('children' in node) {
    for (const child of node.children) {
      collectCodeSpans(child, spans, input);
    }
  }
}

// Paragraphs and headings, as the range their content covers (a heading's # left out).
// A web address written as itself (https://example.com): a translator could change it.
function isBareAddress(node: Nodes): boolean {
  if (node.type !== 'link' || node.children.length !== 1 || node.children[0]?.type !== 'text') {
    return false;
  }
  const text = node.children[0].value;
  return node.url === text || node.url === `mailto:${text}` || node.url === `http://${text}` || node.url === `https://${text}`;
}

// Paragraphs, headings and table cells, as the range their content covers (a heading's
// # and a cell's | borders left out, so the table's structure is never sent).
function collectTextBlocks(node: Nodes, blocks: Block[]): void {
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
    const start = node.children[0]?.position?.start.offset;
    const end = node.children.at(-1)?.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      blocks.push({ start, end, isTableCell: node.type === 'tableCell' });
    }
    return;
  }

  if ('children' in node) {
    for (const child of node.children) {
      collectTextBlocks(child, blocks);
    }
  }
}

// Code pasted into prose without backticks reads as paragraph text to the markdown
// parser, so each line of a block is checked on its own.
// A setting written into a sentence without backticks, such as "reviewed": false. Left
// as prose, the value reads as an ordinary word ("false" becomes "wrong"), so the
// whole key-value pair is treated as code.
const SETTING_VALUE = /"[\w.@/-]+"\s*:\s*(?:true|false|null|-?\d+(?:\.\d+)?|"[^"\n]*")/g;

// Paths, file names, snake_case, camelCase, CSS classes and acronyms written without
// backticks (src/parser/codeWords.ts says which shapes count). Only the document's
// own text is read, never markdown syntax such as a link's [text](address).
function collectCodeShapedWords(node: Nodes, input: string, spans: Range[], knownNames: ReadonlySet<string>): void {
  if (node.type === 'text') {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    // Skip text whose source differs from its value (escapes, entities): offsets would not line up.
    if (start === undefined || end === undefined || input.slice(start, end) !== node.value) {
      return;
    }
    for (const word of findCodeShapedWords(node.value, knownNames)) {
      const wordStart = start + word.start;
      const wordEnd = start + word.end;
      if (!spans.some(span => span.start < wordEnd && span.end > wordStart)) {
        spans.push({ start: wordStart, end: wordEnd });
      }
    }
    return;
  }
  if ('children' in node) {
    for (const child of node.children) {
      collectCodeShapedWords(child, input, spans, knownNames);
    }
  }
}

function collectSettingValues(input: string, block: Range, spans: Range[]): void {
  for (const match of input.slice(block.start, block.end).matchAll(SETTING_VALUE)) {
    const start = block.start + match.index;
    const end = start + match[0].length;
    if (!spans.some(span => span.start < end && span.end > start)) {
      spans.push({ start, end });
    }
  }
}

function collectBareCodeLines(input: string, block: Range, spans: Range[]): void {
  let lineStart = block.start;
  for (const line of input.slice(block.start, block.end).split('\n')) {
    const prefix = line.match(/^[\s>]*/)?.[0].length ?? 0; // indentation and blockquote markers
    const start = lineStart + prefix;
    const end = lineStart + line.trimEnd().length;
    lineStart += line.length + 1;

    const overlapsCode = spans.some(span => span.start < end && span.end > start);
    if (end > start && !overlapsCode && looksLikeCodeLine(input.slice(start, end))) {
      spans.push({ start, end, isBlock: true, isCode: true });
    }
  }
}

// Maps an offset in the input to the same place in the text after replacement.
// Offsets passed here never fall inside a replaced span.
function toOutputOffset(offset: number, replacements: Replacement[]): number {
  let shift = 0;
  for (const r of replacements) {
    if (r.end <= offset) {
      shift += r.token.length - (r.end - r.start);
    }
  }
  return offset + shift;
}

// A list label at the start of a segment: "A. ", "b) ", "(c) ", "ii. ". The model wrote
// some of them in Gujarati letters ("B." as "બી."), so they are left out of the segment
// and stay exactly as written.
const LEADING_LABEL = /^(?:\(?[A-Za-z]\)|[A-Za-z][.)]|\(?(?:[ivx]{2,4}|[IVX]{2,4})[.)])[ \t]+/;

// Drops lines at either end that hold only placeholders, so code is never sent for
// translation, and a leading list label; returns undefined when nothing translatable is left.
function trimSegment(text: string, start: number, end: number, tokens: string[]): Segment | undefined {
  const lines = text.slice(start, end).split('\n');
  const isCodeOnly = (line: string): boolean => removeTokens(line, tokens).trim() === '';

  while (lines.length > 0 && isCodeOnly(lines[0]!)) {
    start += lines.shift()!.length + 1;
  }
  while (lines.length > 0 && isCodeOnly(lines.at(-1)!)) {
    end -= lines.pop()!.length + 1;
  }

  let segmentText = lines.join('\n');
  const label = (segmentText + ' ').match(LEADING_LABEL)?.[0].trimEnd();
  if (label) {
    const rest = segmentText.slice(label.length).trimStart();
    start += segmentText.length - rest.length;
    segmentText = rest;
  }
  if (!/\p{L}/u.test(removeTokens(segmentText, tokens))) {
    return undefined;
  }
  return { text: segmentText, start, end };
}

function removeTokens(line: string, tokens: string[]): string {
  return tokens.reduce((rest, token) => rest.split(token).join(''), line);
}
