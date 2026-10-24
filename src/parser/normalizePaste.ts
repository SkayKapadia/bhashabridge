// Text copied from a rendered page (a chat window, a web page) loses its markdown: a
// table arrives as lines of tab-separated cells, a list as "•" lines, a code block as its
// language name on a line above the code, and a file link as a line of its own that cuts
// its sentence in two. This puts that structure back before parsing, so the translation
// keeps the same layout and translates whole sentences. Text inside fenced code blocks is
// never touched.

import { looksLikeCodeLine } from './codeLine';
import { isCodeShapedWord } from './codeWords';

const BULLET = /^(\s*)[•◦▪‣·]\s+/;
const FENCE = /^\s*(```|~~~)/;
const LANGUAGE_LABELS = new Set([
  'bash', 'c', 'cpp', 'csharp', 'css', 'dockerfile', 'go', 'html', 'java', 'javascript', 'js', 'json', 'jsx',
  'kotlin', 'php', 'powershell', 'python', 'py', 'ruby', 'rust', 'sh', 'shell', 'sql', 'swift', 'toml', 'ts',
  'tsx', 'typescript', 'xml', 'yaml', 'yml', 'zsh',
]);
// A file link as copied: `agent.py`, `runs/x.log`, `agent.py:L72`, `app.ts#L10-L20`.
const LINE_SUFFIX = /(?::L?\d+(?:-L?\d+)?|#L\d+(?:-L?\d+)?)$/;

export function normalizePastedText(input: string): string {
  const lines = markBareCode(joinSplitReferences(fenceLabelledCode(input.replace(/\r\n?/g, '\n').split('\n'))));
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // Two or more lines in a row with tab-separated cells: a table, first line the header.
    if (isTabRow(line) && isTabRow(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && isTabRow(lines[i])) {
        rows.push(lines[i]!.split('\t').map(cell => cell.trim()));
        i++;
      }
      i--;
      if (out.length > 0 && out.at(-1)!.trim() !== '') {
        out.push('');
      }
      out.push(...pipeTable(rows), '');
      continue;
    }

    out.push(line.replace(BULLET, '$1- '));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

// "python" alone on a line, straight above code, is a code block's label: fence the code
// under it, up to a blank line or a line of prose.
function fenceLabelledCode(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      inFence = !inFence;
    }
    const label = line.trim();
    if (inFence || !LANGUAGE_LABELS.has(label) || !looksLikeCodeOrCommand(lines[i + 1])) {
      out.push(line);
      continue;
    }
    const indent = line.slice(0, line.length - line.trimStart().length);
    out.push(`${indent}\`\`\`${label}`);
    i++;
    while (i < lines.length && lines[i]!.trim() !== '' && !FENCE.test(lines[i]!) && !isSentence(lines[i]!)) {
      out.push(lines[i]!);
      i++;
    }
    out.push(`${indent}\`\`\``);
    i--;
  }
  return out;
}

function looksLikeCodeOrCommand(line: string | undefined): boolean {
  if (line === undefined || line.trim() === '' || isSentence(line)) {
    return false;
  }
  return looksLikeCodeLine(line) || /[=(){}[\]<>;$]|--|\w\.\w|\w\/\w/.test(line) || /^\s*[A-Za-z_][\w.-]*:\s*\S+\s*$/.test(line);
}

// Ends like a sentence and has a run of ordinary words.
function isSentence(line: string): boolean {
  return /[.!?]\)?\s*$/.test(line) && /[A-Za-z]+ [A-Za-z]+ [A-Za-z]+/.test(line) && !looksLikeCodeLine(line);
}

// "As seen in" / "runs/x.log" / ", the best score…": a file link copied out of a chat
// lands on a line of its own. Rejoin the three when the sentence clearly runs through it:
// the line before does not end a sentence and the line after carries on with punctuation
// or a lowercase word. Blank lines around the link are dropped too, and the link gets
// backticks, as code, so `__init__` in it is not read as bold.
function joinSplitReferences(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      inFence = !inFence;
    }
    if (inFence || !isReference(line)) {
      out.push(line);
      continue;
    }
    let before = out.length - 1;
    while (before >= 0 && out[before]!.trim() === '') {
      before--;
    }
    let after = i + 1;
    while (after < lines.length && lines[after]!.trim() === '') {
      after++;
    }
    if (before < 0 || after >= lines.length || !continuesBefore(out[before]!) || !continuesAfter(lines[after]!)) {
      out.push(line);
      continue;
    }
    const next = lines[after]!.trim();
    out.length = before + 1;
    out[before] = `${out[before]!.trimEnd()} \`${line.trim()}\`${/^[,.;:)]/.test(next) ? '' : ' '}${next}`;
    i = after;
  }
  return out;
}

// Code lines pasted without backticks would otherwise be read as markdown, so
// `def __init__(self):` showed as "def init" in bold. Code standing as its own block gets
// a fence, which keeps its indentation; a code line inside a sentence gets backticks, so
// the sentence stays whole for the translator.
const MARKDOWN_MARKER = /^\s*([-*+]\s|\d+[.)]\s|>|#{1,6}\s|\|)/;

function markBareCode(lines: string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      inFence = !inFence;
    }
    if (inFence || !startsBareCode(line)) {
      out.push(line);
      continue;
    }
    let end = i;
    while (end + 1 < lines.length && lines[end + 1]!.trim() !== '' && !FENCE.test(lines[end + 1]!) && !lines[end + 1]!.includes('`') && looksLikeCodeLine(lines[end + 1]!)) {
      end++;
    }
    const before = out.at(-1)?.trim();
    const after = lines[end + 1]?.trim();
    const standsAlone = (before === undefined || before === '' || before.endsWith(':')) && (after === undefined || after === '' || /^[A-Z(]/.test(after));
    if (standsAlone) {
      out.push('```', ...lines.slice(i, end + 1), '```');
    } else {
      out.push(...lines.slice(i, end + 1).map(inlineCode));
    }
    i = end;
  }
  return out;
}

function startsBareCode(line: string): boolean {
  const indent = line.length - line.trimStart().length;
  return indent < 4 && !MARKDOWN_MARKER.test(line) && !line.includes('`') && looksLikeCodeLine(line);
}

function inlineCode(line: string): string {
  const text = line.trim();
  return `${line.slice(0, line.length - line.trimStart().length)}\`${text}\``;
}

function isReference(line: string): boolean {
  const token = line.trim();
  return token !== '' && !/[\s`]/.test(token) && isCodeShapedWord(token.replace(LINE_SUFFIX, ''));
}

function continuesBefore(line: string): boolean {
  const text = line.trim();
  return !/[.!?:]$/.test(text) && !text.startsWith('#') && !FENCE.test(line) && !isTabRow(line) && !looksLikeCodeLine(line);
}

function continuesAfter(line: string): boolean {
  const text = line.trim();
  return /^([,.;:)]|[a-z])/.test(text) && !isReference(line) && !FENCE.test(line) && !looksLikeCodeLine(line);
}

function isTabRow(line: string | undefined): boolean {
  return line !== undefined && line.includes('\t') && line.trim() !== '';
}

function pipeTable(rows: string[][]): string[] {
  const width = Math.max(...rows.map(row => row.length));
  const cells = (row: string[]) => Array.from({ length: width }, (_, i) => (row[i] ?? '').replace(/\|/g, '\\|'));
  const line = (row: string[]) => `| ${cells(row).join(' | ')} |`;
  return [line(rows[0]!), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)];
}
