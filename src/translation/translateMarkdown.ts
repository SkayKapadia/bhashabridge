import { parseMarkdown } from '../parser/markdownParser';
import { reassemble } from '../reassembly/reassemble';
import { TranslationError } from './errors';
import type { Glossary, TargetLanguage, TranslationProvider } from './translationProvider';

// Below this many characters there is too little to translate (SDD error type 5).
export const MIN_INPUT_LENGTH = 10;
const DEFAULT_CONCURRENCY = 3;

export interface TranslateMarkdownOptions {
  provider: TranslationProvider;
  targetLanguage: TargetLanguage;
  glossary?: Glossary;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  concurrency?: number;
}

// The whole pipeline: parse out the code, translate each paragraph, heading and list
// item, then put the translations and the original code back into the markdown.
export async function translateMarkdown(input: string, options: TranslateMarkdownOptions): Promise<string> {
  if (input.trim().length < MIN_INPUT_LENGTH) {
    throw new TranslationError('input', `Paste at least ${MIN_INPUT_LENGTH} characters of text to translate.`);
  }

  const parsed = parseMarkdown(input);
  const total = parsed.segments.length;
  if (total === 0) {
    return input; // only code: nothing to translate
  }

  const translations: string[] = new Array(total);
  let next = 0;
  let done = 0;
  let hasFailed = false;
  options.onProgress?.(0, total);

  // A few segments in flight at once; each result goes back to its own slot, so order holds.
  // After one failure no new segment is sent, so a bad key costs one call, not many.
  const worker = async (): Promise<void> => {
    while (!hasFailed && next < total) {
      const index = next++;
      try {
        const response = await options.provider.translate(
          { text: parsed.segments[index]!.text, targetLanguage: options.targetLanguage, glossary: options.glossary },
          options.signal,
        );
        translations[index] = response.translatedText;
      } catch (error) {
        hasFailed = true;
        throw error;
      }
      options.onProgress?.(++done, total);
    }
  };
  const workers = Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workers }, worker));

  return reassemble(parsed, translations);
}
