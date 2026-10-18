import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes } from 'mdast';

export interface ParseResult {
  // Markdown with every code block and inline code span replaced by a placeholder token.
  text: string;
  // Placeholder token -> exact original source of the code it replaced.
  placeholders: Map<string, string>;
}

interface CodeSpan {
  start: number;
  end: number;
}

export function parseMarkdown(input: string): ParseResult {
  const tree = fromMarkdown(input);

  const spans: CodeSpan[] = [];
  collectCodeSpans(tree, spans);

  const placeholders = new Map<string, string>();
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
    text += input.slice(cursor, span.start) + token;
    cursor = span.end;
  }

  text += input.slice(cursor);

  return { text, placeholders };
}

// Walks the AST in document order. Code nodes have no children, so spans never overlap.
function collectCodeSpans(node: Nodes, spans: CodeSpan[]): void {
  if (node.type === 'code' || node.type === 'inlineCode') {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      spans.push({ start, end });
    }
    return;
  }

  if ('children' in node) {
    for (const child of node.children) {
      collectCodeSpans(child, spans);
    }
  }
}
