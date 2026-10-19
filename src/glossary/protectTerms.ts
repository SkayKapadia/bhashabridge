// Swaps glossary terms in one piece of text for placeholder tokens before it is
// translated, so the model never sees them and cannot translate them.

export interface ProtectedText {
  text: string;
  // Token -> the term exactly as it was written ("Arrays", "dependency array").
  placeholders: Map<string, string>;
}

export function protectTerms(text: string, terms: readonly string[], takenTokens: ReadonlySet<string> = new Set()): ProtectedText {
  const placeholders = new Map<string, string>();
  const matcher = compileTerms(terms);
  if (!matcher) {
    return { text, placeholders };
  }

  let counter = 0;
  const result = replaceTerms(text, matcher, match => {
    let token: string;
    do {
      counter++;
      token = `SKIP_${String(counter).padStart(3, '0')}`;
    } while (takenTokens.has(token) || text.includes(token) || placeholders.has(token));
    placeholders.set(token, match);
    return token;
  });

  return { text: result, placeholders };
}

// Puts the terms back. A token left out or repeated is caught earlier, by the
// provider's placeholder check, since the protected text is what it was sent.
export function restoreTerms(translated: string, placeholders: ReadonlyMap<string, string>): string {
  return translated.replace(/SKIP_\d+/g, token => placeholders.get(token) ?? token);
}

// Adds the meaning after the first use of each annotated term across the texts, in
// order: "ledger" -> "ledger (ખાતાવહી)". Later uses stay plain, so the text stays readable.
export function annotateFirstUse(texts: readonly string[], annotations: Readonly<Record<string, string>>): string[] {
  const result = [...texts];
  for (const [term, meaning] of Object.entries(annotations)) {
    const matcher = compileTerms([term]);
    if (!matcher) {
      continue;
    }
    for (let i = 0; i < result.length; i++) {
      let isDone = false;
      result[i] = replaceTerms(result[i]!, matcher, match => {
        if (isDone) {
          return match;
        }
        isDone = true;
        return `${match} (${meaning})`;
      });
      if (isDone) {
        break;
      }
    }
  }
  return result;
}

interface TermMatcher {
  pattern: RegExp;
  terms: string[]; // in the order of the pattern's capture groups
}

// Longest terms first, so "dependency array" wins over "array". Whole words only, an
// optional plural (s, es, or y -> ies), and spaces in a phrase may be any whitespace.
// A term written in capitals only (API, IT, PO) matches only in capitals, so adding
// "IT" never freezes the word "it"; every other term matches in any capitalisation.
function compileTerms(terms: readonly string[]): TermMatcher | undefined {
  const sorted = [...new Set(terms.map(t => t.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) {
    return undefined;
  }
  const alternatives = sorted.map(term => {
    const body = term.endsWith('y') ? `${escapeWords(term.slice(0, -1))}(?:y|ies)` : escapeWords(term);
    return `(${body})`;
  });
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_.-])(?:${alternatives.join('|')})(?:e?s)?(?![\\p{L}\\p{N}_])`, 'giu');
  return { pattern, terms: sorted };
}

function replaceTerms(text: string, matcher: TermMatcher, replace: (match: string) => string): string {
  return text.replace(matcher.pattern, (match: string, ...groups: unknown[]) => {
    const index = groups.findIndex((g, i) => i < matcher.terms.length && typeof g === 'string');
    const term = matcher.terms[index]!;
    const written = groups[index] as string;
    if (isCapitalsOnly(term) && written.replace(/\s+/g, ' ') !== term) {
      return match; // "it" is not the acronym IT
    }
    return replace(match);
  });
}

function isCapitalsOnly(term: string): boolean {
  return /\p{Lu}/u.test(term) && !/\p{Ll}/u.test(term);
}

function escapeWords(text: string): string {
  return text
    .split(/\s+/)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
}
