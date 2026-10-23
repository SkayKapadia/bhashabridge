import type { ParseResult } from '../parser/markdownParser';

// Thrown when a translation lost or repeated a placeholder: putting code back would
// then drop or duplicate it, so nothing is returned rather than wrong code.
export class ReassemblyError extends Error {
  constructor(
    readonly missing: string[],
    readonly duplicated: string[],
  ) {
    const parts = [
      missing.length > 0 ? `missing ${missing.join(', ')}` : '',
      duplicated.length > 0 ? `repeated ${duplicated.join(', ')}` : '',
    ].filter(Boolean);
    super(`The translation changed the code placeholders (${parts.join('; ')}), so the code cannot be put back safely.`);
    this.name = 'ReassemblyError';
  }
}

const TOKEN = /SKIP_\d+/g;
const TOKEN_WITH_SPACES = /([ \t]*)(SKIP_\d+)([ \t]*)/g;

// Splices each translated segment into the parsed text in place of its English, then
// puts the code back. Everything outside the segments (heading marks, list bullets,
// blank lines, code) is never sent for translation, so it comes back as it was.
export function reassemble(parsed: ParseResult, translatedSegments: readonly string[]): string {
  if (translatedSegments.length !== parsed.segments.length) {
    throw new Error(`Expected ${parsed.segments.length} translated segments, got ${translatedSegments.length}.`);
  }

  let text = parsed.text;
  // Last segment first, so earlier ranges stay valid.
  for (let i = parsed.segments.length - 1; i >= 0; i--) {
    const { start, end } = parsed.segments[i]!;
    text = text.slice(0, start) + translatedSegments[i] + text.slice(end);
  }

  return restorePlaceholders(text, parsed.placeholders, parsed.blockTokens);
}

// Replaces each placeholder token with the exact original code from the parser's map.
// `blockTokens` names the placeholders that stand for a whole block; without it, a
// block is recognised by its content (multi-line, or not wrapped in backticks).
export function restorePlaceholders(
  translated: string,
  placeholders: ReadonlyMap<string, string>,
  blockTokens?: ReadonlySet<string>,
): string {
  const counts = new Map<string, number>();
  for (const token of translated.match(TOKEN) ?? []) {
    if (placeholders.has(token)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const missing = [...placeholders.keys()].filter(token => !counts.has(token));
  const duplicated = [...counts].filter(([, count]) => count > 1).map(([token]) => token);
  if (missing.length > 0 || duplicated.length > 0) {
    throw new ReassemblyError(missing, duplicated);
  }

  // One pass with a replacer function: code is inserted verbatim (no $& patterns) and
  // never scanned again, so code that happens to contain "SKIP_002" stays untouched.
  // A token that is not in the map was ordinary text in the input and is left alone.
  return translated.replace(TOKEN_WITH_SPACES, (match: string, lead: string, token: string, trail: string, offset: number) => {
    const code = placeholders.get(token);
    if (code === undefined || !(blockTokens ? blockTokens.has(token) : isBlock(code))) {
      return lead + (code ?? token) + trail;
    }
    return onOwnLine(code, translated, offset, match.length, lead);
  });
}

// Inline code starts with a backtick and fits on one line; everything else (fenced
// and indented blocks, bare code lines) stood on its own line in the input.
function isBlock(code: string): boolean {
  return code.includes('\n') || !code.startsWith('`');
}

// A translator may pull a block's token into a sentence ("... map. SKIP_001"). The code
// is still exact, but a fence mid-line is no longer a code block, so the line is split
// there, dropping the spaces that stood beside the token.
function onOwnLine(code: string, text: string, offset: number, length: number, lead: string): string {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset + length);
  const before = text.slice(lineStart, offset);
  const after = text.slice(offset + length, lineEnd === -1 ? undefined : lineEnd);
  // An indented code block cannot interrupt a paragraph, so it needs a blank line.
  const separator = /^( {4}|\t)/.test(code) ? '\n\n' : '\n';

  // With nothing before it on the line, the spaces are indentation (a list item) and stay.
  return (before.trim() ? separator : lead) + code + (after.trim() ? separator : '');
}
