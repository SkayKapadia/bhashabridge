import { TranslationError } from './errors';

// Code is swapped for SKIP_ tokens before translation; a token lost or doubled
// here would lose or duplicate code when the text is reassembled.
export function checkPlaceholders(source: string, translated: string): void {
  const expected = countTokens(source);
  const actual = countTokens(translated);
  for (const token of new Set([...expected.keys(), ...actual.keys()])) {
    if ((actual.get(token) ?? 0) !== (expected.get(token) ?? 0)) {
      throw new TranslationError(
        'placeholders',
        `The translation changed the code placeholder ${token}, so code could be lost. Please try again.`,
      );
    }
  }
}

// Whole tokens only, so SKIP_100 is never counted inside SKIP_1000.
function countTokens(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of text.match(/SKIP_\d+/g) ?? []) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}
