import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { Root } from 'mdast';

// Markdown as GitHub and the AI chat tools write it: CommonMark plus tables, task
// lists, strikethrough and bare web addresses. Every part of the extension reads
// markdown through this one function, so they always agree on the structure.
export function parseMarkdownTree(markdown: string): Root {
  return fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
}
