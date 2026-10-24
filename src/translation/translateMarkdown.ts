import { joinChunk, joinParts, planChunks, splitChunkReply, splitSentences, type Piece } from '../chunking/chunker';
import { annotateFirstUse, protectTerms, restoreTerms } from '../glossary/protectTerms';
import { parseMarkdown } from '../parser/markdownParser';
import { reassemble } from '../reassembly/reassemble';
import { TranslationError } from './errors';
import type { Glossary, TargetLanguage, TranslationProvider } from './translationProvider';

// Below this many characters there is too little to translate (SDD error type 5).
export const MIN_INPUT_LENGTH = 10;
const DEFAULT_CONCURRENCY = 3;
// For a provider that does not state its own limit.
const DEFAULT_CHUNK_CHARS = 2000;

export interface TranslateMarkdownOptions {
  provider: TranslationProvider;
  targetLanguage: TargetLanguage;
  glossary?: Glossary;
  // Glossary terms that must stay in English: protected like code, so this is guaranteed.
  keepTerms?: readonly string[];
  // Term -> meaning added after its first use, e.g. "ledger" -> "ખાતાવહી". These terms
  // must also be in keepTerms, so they reach this step in English.
  annotations?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  // Counts requests (chunks), not paragraphs.
  onProgress?: (done: number, total: number) => void;
  // How many sentences were left in English because every try damaged their code
  // placeholders. Called once, only when there were some.
  onKeptEnglish?: (count: number) => void;
  concurrency?: number;
}

// The whole pipeline: parse out the code, group the paragraphs, headings and list items
// into as few requests as fit, protect glossary terms, translate, then put the terms,
// translations and original code back into the markdown.
export async function translateMarkdown(input: string, options: TranslateMarkdownOptions): Promise<string> {
  if (input.trim().length < MIN_INPUT_LENGTH) {
    throw new TranslationError('input', `Paste at least ${MIN_INPUT_LENGTH} characters of text to translate.`);
  }

  const parsed = parseMarkdown(input);
  if (parsed.segments.length === 0) {
    return input; // only code: nothing to translate
  }

  const codeTokens = new Set(parsed.placeholders.keys());
  const plan = planChunks(
    parsed.segments.map(s => s.text),
    options.provider.maxChunkChars ?? DEFAULT_CHUNK_CHARS,
  );
  const translatedParts: string[][] = plan.gaps.map(() => []);

  // Glossary terms are protected across the whole request, so their placeholders stay
  // unique when several segments travel together.
  const translateText = async (text: string): Promise<string> => {
    const guarded = protectTerms(text, options.keepTerms ?? [], codeTokens);
    const response = await options.provider.translate(
      { text: guarded.text, targetLanguage: options.targetLanguage, glossary: options.glossary },
      options.signal,
    );
    return restoreTerms(response.translatedText, guarded.placeholders);
  };

  // A piece on its own. If the reply damages a code placeholder, it is tried once more,
  // then sentence by sentence; a sentence that still fails stays in English, so one bad
  // reply never fails the whole answer and code is never lost.
  let keptEnglish = 0;
  const translatePiece = async (text: string): Promise<string> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return withoutMadeUpMarkers(await translateText(text));
      } catch (error) {
        if (!isPlaceholderError(error)) {
          throw error;
        }
      }
    }
    const sentences = splitSentences(text, 0);
    const parts: string[] = [];
    for (const sentence of sentences) {
      try {
        parts.push(sentences.length > 1 && hasWords(sentence.text) ? withoutMadeUpMarkers(await translateText(sentence.text)) : keep(sentence.text));
      } catch (error) {
        if (!isPlaceholderError(error)) {
          throw error;
        }
        parts.push(keep(sentence.text));
      }
    }
    return joinParts(parts, sentences.map(s => s.gap));
  };
  const keep = (text: string): string => {
    keptEnglish += hasWords(text) ? 1 : 0;
    return text;
  };

  // One request per chunk. If the reply loses a part marker or a placeholder, the
  // chunk's pieces are sent one at a time instead: slower, never wrong.
  const translateChunk = async (chunk: Piece[]): Promise<string[]> => {
    if (chunk.length === 1) {
      return [await translatePiece(chunk[0]!.text)];
    }
    try {
      const parts = splitChunkReply(await translateText(joinChunk(chunk.map(p => p.text))), chunk.length);
      // Each part must keep its own code placeholders: one moved to a neighbouring part
      // would put that code in the wrong paragraph.
      if (parts && parts.every((part, i) => sameTokens(chunk[i]!.text, part))) {
        return parts;
      }
    } catch (error) {
      if (!isPlaceholderError(error)) {
        throw error;
      }
    }
    const parts: string[] = [];
    for (const piece of chunk) {
      parts.push(await translatePiece(piece.text));
    }
    return parts;
  };

  const total = plan.chunks.length;
  let next = 0;
  let done = 0;
  let hasFailed = false;
  options.onProgress?.(0, total);

  // A few chunks in flight at once; each result goes back to its own slot, so order holds.
  // After one failure no new chunk is sent, so a bad key costs one call, not many.
  const worker = async (): Promise<void> => {
    while (!hasFailed && next < total) {
      const chunk = plan.chunks[next++]!;
      try {
        const parts = await translateChunk(chunk);
        chunk.forEach((piece, i) => (translatedParts[piece.segment]![piece.part] = parts[i]!));
      } catch (error) {
        hasFailed = true;
        throw error;
      }
      options.onProgress?.(++done, total);
    }
  };
  const workers = Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workers }, worker));

  let translations = translatedParts.map((parts, segment) => joinParts(parts, plan.gaps[segment]!));
  // A table cell holds one line and no bare |, or the table would break apart.
  translations = translations.map((text, i) =>
    parsed.segments[i]!.isTableCell ? text.replace(/\s*\n\s*/g, ' ').replace(/(?<!\\)\|/g, '\\|') : text,
  );
  if (options.annotations) {
    translations = annotateFirstUse(translations, options.annotations);
  }
  const result = reassemble(parsed, translations);
  if (keptEnglish > 0) {
    options.onKeptEnglish?.(keptEnglish);
  }
  return result;
}

// A single piece is sent without markers, so any in its reply were made up by the model,
// which then tends to repeat the text in several "parts". Keep the first one.
function withoutMadeUpMarkers(reply: string): string {
  if (!/<<<\d+>>>/.test(reply)) {
    return reply;
  }
  return reply.split(/\s*<<<\d+>>>\s*/).find(part => part.trim() !== '')?.trim() ?? reply;
}

function isPlaceholderError(error: unknown): boolean {
  return error instanceof TranslationError && error.code === 'placeholders';
}

// Has something to translate besides code placeholders.
function hasWords(text: string): boolean {
  return /\p{L}/u.test(text.replace(/SKIP_\d+/g, ''));
}

function sameTokens(source: string, translated: string): boolean {
  const tokens = (text: string) => (text.match(/SKIP_\d+/g) ?? []).sort().join(' ');
  return tokens(source) === tokens(translated);
}
