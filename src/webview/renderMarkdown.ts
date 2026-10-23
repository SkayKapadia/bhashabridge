import type { Nodes, PhrasingContent } from 'mdast';
import { sanitize } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import { toHast } from 'mdast-util-to-hast';
import { parseMarkdown } from '../parser/markdownParser';
import { parseMarkdownTree } from '../parser/markdownSyntax';

// Markdown to HTML that is safe to show in the webview. Raw HTML in the markdown is
// dropped (toHast keeps none by default), and the sanitizer removes anything left that
// could run code, such as javascript: links or event handler attributes.
// Every line break in the text is kept on screen, as written: pasted text often has
// one line per point, and plain markdown would run those lines together.
export function renderMarkdown(markdown: string): string {
  const tree = parseMarkdownTree(markdown);
  keepLineBreaks(tree);
  return toHtml(sanitize(toHast(tree)));
}

function keepLineBreaks(node: Nodes): void {
  if (!('children' in node)) {
    return;
  }
  for (const child of node.children) {
    keepLineBreaks(child);
  }
  if (node.children.some(child => child.type === 'text' && child.value.includes('\n'))) {
    (node.children as PhrasingContent[]) = (node.children as PhrasingContent[]).flatMap(child =>
      child.type === 'text' && child.value.includes('\n')
        ? child.value.split('\n').flatMap((line, i): PhrasingContent[] => (i === 0 ? [{ type: 'text', value: line }] : [{ type: 'break' }, { type: 'text', value: line }]))
        : [child],
    );
  }
}

export interface BlockPair {
  english: string; // safe HTML
  translated: string; // safe HTML
  // Nothing in this block was translated (a code block, a command line): side by side
  // shows it once, on the English side, instead of repeating it.
  isCode: boolean;
}

// Pairs each top-level block of the translation (heading, paragraph, list, code) with
// the English block it came from, for learning mode. Translation keeps the structure,
// so the blocks line up; if they ever do not, the two whole texts are one pair.
export function renderBlockPairs(englishMarkdown: string, translatedMarkdown: string): BlockPair[] {
  const english = topLevelBlocks(englishMarkdown);
  const translated = topLevelBlocks(translatedMarkdown);
  if (english.length === 0 || english.length !== translated.length) {
    return [{ english: renderMarkdown(englishMarkdown), translated: renderMarkdown(translatedMarkdown), isCode: false }];
  }
  return english.map((block, i) => ({
    english: renderMarkdown(block),
    translated: renderMarkdown(translated[i]!),
    isCode: parseMarkdown(block).segments.length === 0,
  }));
}

function topLevelBlocks(markdown: string): string[] {
  return parseMarkdownTree(markdown).children.flatMap(node => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    return start === undefined || end === undefined ? [] : [markdown.slice(start, end)];
  });
}
