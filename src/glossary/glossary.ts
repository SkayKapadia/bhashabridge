import { readFile } from 'fs/promises';
import * as path from 'path';
import type { Glossary, TargetLanguage } from '../translation/translationProvider';

// A term is either kept in English (guaranteed: protected like code before translation)
// or given a set rendering per language (requested: listed in the prompt).
export interface LoadedGlossary {
  keep: string[];
  translate: Record<string, Record<TargetLanguage, string>>;
}

export class GlossaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlossaryError';
  }
}

export async function loadDefaultGlossary(extensionPath: string): Promise<LoadedGlossary> {
  const file = path.join(extensionPath, 'glossary', 'default.json');
  let data: unknown;
  try {
    data = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new GlossaryError('The built-in glossary (glossary/default.json) could not be read.');
  }
  return parseGlossary(data);
}

// Checks every entry, so a mistake in a contributed term is named instead of crashing later.
export function parseGlossary(data: unknown): LoadedGlossary {
  const terms = (data as { terms?: unknown })?.terms;
  if (typeof terms !== 'object' || terms === null || Array.isArray(terms)) {
    throw new GlossaryError('The glossary needs a "terms" object.');
  }

  const glossary: LoadedGlossary = { keep: [], translate: {} };
  for (const [term, entry] of Object.entries(terms)) {
    const { treatment, gu, mr } = (entry ?? {}) as { treatment?: unknown; gu?: unknown; mr?: unknown };
    if (!term.trim()) {
      throw new GlossaryError('The glossary has an empty term.');
    }
    if (treatment === 'keep') {
      glossary.keep.push(term);
    } else if (treatment === 'translate' && typeof gu === 'string' && gu.trim() && typeof mr === 'string' && mr.trim()) {
      glossary.translate[term] = { gu, mr };
    } else {
      throw new GlossaryError(
        `Glossary term "${term}" needs "treatment": "keep", or "treatment": "translate" with "gu" and "mr" text.`,
      );
    }
  }
  return glossary;
}

// The set renderings for one language, in the shape a TranslateRequest carries.
export function promptGlossary(glossary: LoadedGlossary, language: TargetLanguage): Glossary {
  return Object.fromEntries(Object.entries(glossary.translate).map(([term, renderings]) => [term, renderings[language]]));
}
