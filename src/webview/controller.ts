import { isTargetLanguage } from '../languages';
import { glossaryOptions, type LoadedGlossary } from '../glossary/glossary';
import { normalizePastedText } from '../parser/normalizePaste';
import { ReassemblyError } from '../reassembly/reassemble';
import { TranslationError } from '../translation/errors';
import { translateMarkdown } from '../translation/translateMarkdown';
import type { TargetLanguage, TranslationProvider } from '../translation/translationProvider';
import type { HostMessage } from './messages';
import { renderBlockPairs, renderMarkdown } from './renderMarkdown';


// Handles one translate request from the webview and reports back through `post`.
// Kept free of the VS Code API so it can be tested directly.
export async function handleTranslate(
  message: { text: unknown; language: unknown; provider: unknown },
  providers: ReadonlyMap<string, TranslationProvider>,
  post: (message: HostMessage) => void,
  signal?: AbortSignal,
  glossary?: LoadedGlossary,
): Promise<void> {
  // The message comes from the webview, so its fields are checked, not trusted.
  if (typeof message.text !== 'string' || !isTargetLanguage(message.language)) {
    post({ type: 'error', message: 'The request from the panel was not understood. Please try again.', code: 'unknown' });
    return;
  }
  const provider = typeof message.provider === 'string' ? providers.get(message.provider) : undefined;
  if (!provider) {
    post({ type: 'error', message: 'That translation provider is not available. Pick one from the list.', code: 'unknown' });
    return;
  }

  // Text copied from a rendered page gets its tables and lists back first, and the
  // English side of learning mode uses the same repaired text, so the blocks line up.
  const input = normalizePastedText(message.text);

  try {
    let keptEnglish = 0;
    const markdown = await translateMarkdown(input, {
      provider,
      targetLanguage: message.language as TargetLanguage,
      ...glossaryOptions(glossary, message.language as TargetLanguage),
      signal,
      onProgress: (done, total) => post({ type: 'progress', done, total }),
      onKeptEnglish: count => (keptEnglish = count),
    });
    if (!signal?.aborted) {
      post({ type: 'result', html: renderMarkdown(markdown), markdown, blocks: renderBlockPairs(input, markdown), ...(keptEnglish ? { keptEnglish } : {}) });
    }
  } catch (error) {
    if (signal?.aborted) {
      return; // replaced by a newer request: say nothing
    }
    if (error instanceof TranslationError) {
      post({ type: 'error', message: error.message, code: error.code });
    } else if (error instanceof ReassemblyError) {
      post({ type: 'error', message: error.message, code: 'reassembly' });
    } else {
      post({ type: 'error', message: 'Something went wrong while translating. Please try again.', code: 'unknown' });
    }
  }
}
