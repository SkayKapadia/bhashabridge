// Swaps "keep" glossary terms in one segment for placeholder tokens before it is
// translated, so the model never sees them and cannot translate them.

export interface ProtectedText {
  text: string;
  // Token -> the term exactly as it was written ("Arrays", "dependency array").
  placeholders: Map<string, string>;
}

export function protectTerms(text: string, keepTerms: readonly string[], takenTokens: ReadonlySet<string> = new Set()): ProtectedText {
  const placeholders = new Map<string, string>();
  const pattern = termPattern(keepTerms);
  if (!pattern) {
    return { text, placeholders };
  }

  let counter = 0;
  const result = text.replace(pattern, match => {
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

// Longest terms first, so "dependency array" wins over "array". Whole words only, any
// capitalisation, an optional plural s/es, and spaces in a phrase may be any whitespace.
function termPattern(terms: readonly string[]): RegExp | undefined {
  const alternatives = [...new Set(terms.map(t => t.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(term => term.split(/\s+/).map(escapeRegExp).join('\\s+'));
  if (alternatives.length === 0) {
    return undefined;
  }
  return new RegExp(`(?<![\\p{L}\\p{N}_.-])(?:${alternatives.join('|')})(?:e?s)?(?![\\p{L}\\p{N}_])`, 'giu');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
