import { fromMarkdown } from 'mdast-util-from-markdown';
import { sanitize } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import { toHast } from 'mdast-util-to-hast';

// Markdown to HTML that is safe to show in the webview. Raw HTML in the markdown is
// dropped (toHast keeps none by default), and the sanitizer removes anything left that
// could run code, such as javascript: links or event handler attributes.
export function renderMarkdown(markdown: string): string {
  return toHtml(sanitize(toHast(fromMarkdown(markdown))));
}
