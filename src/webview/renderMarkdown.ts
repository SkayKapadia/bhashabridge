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

export interface BlockPair {
  english: string; // safe HTML
  translated: string; // safe HTML
}

// Pairs each top-level block of the translation (heading, paragraph, list, code) with
// the English block it came from, for learning mode. Translation keeps the structure,
// so the blocks line up; if they ever do not, the two whole texts are one pair.
export function renderBlockPairs(englishMarkdown: string, translatedMarkdown: string): BlockPair[] {
  const english = topLevelBlocks(englishMarkdown);
  const translated = topLevelBlocks(translatedMarkdown);
  if (english.length === 0 || english.length !== translated.length) {
    return [{ english: renderMarkdown(englishMarkdown), translated: renderMarkdown(translatedMarkdown) }];
  }
  return english.map((block, i) => ({ english: renderMarkdown(block), translated: renderMarkdown(translated[i]!) }));
}

function topLevelBlocks(markdown: string): string[] {
  return fromMarkdown(markdown).children.flatMap(node => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    return start === undefined || end === undefined ? [] : [markdown.slice(start, end)];
  });
}
