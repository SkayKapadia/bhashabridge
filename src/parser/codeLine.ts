// Decides whether one line of paragraph text is code that was pasted without backticks.
// The rules are strict on purpose: a missed code line gets translated, but a sentence
// mistaken for code would silently stay in English.

const CODE_CHARS = /[(){}[\]=<>]/;
const SENTENCE_END = /[.?!]$/;
const CLOSING_BRACES = /^[}\])]+[;,)]*$/;
const STATEMENT_KEYWORD = /^(const|let|var|function|return|if|else|for|while|switch|case|try|catch|async|await|export|public|private|static)\b/;
const ASSIGNMENT = /^[A-Za-z_$][\w$.[\]'"]*\s*([-+*/]?=|=>)\s*\S/;
const CALL = /^[A-Za-z_$][\w$.]*\(.*\);?$/;
const PYTHON_HEADER = /^(def|class)\s+\w+.*:$/;
const IMPORT = /^(import\s+[\w.]+|from\s+[\w.]+\s+import\s+[\w., *]+)$/;

export function looksLikeCodeLine(line: string): boolean {
  const text = line.trim();
  if (text === '') {
    return false;
  }
  if (CLOSING_BRACES.test(text)) {
    return true;
  }

  const plainRun = longestPlainWordRun(text);

  // A statement ending in ; or { with code punctuation before it.
  if (/[;{]$/.test(text) && CODE_CHARS.test(text.slice(0, -1)) && plainRun < 5) {
    return true;
  }

  if (SENTENCE_END.test(text)) {
    return false;
  }
  // Python imports are plain words by nature, so they are matched before the prose check.
  if (IMPORT.test(text)) {
    return true;
  }
  if (plainRun >= 3) {
    return false;
  }

  return (
    (STATEMENT_KEYWORD.test(text) && CODE_CHARS.test(text)) ||
    ASSIGNMENT.test(text) ||
    CALL.test(text) ||
    PYTHON_HEADER.test(text)
  );
}

// The most ordinary words in a row ("the value is"), a strong sign of prose.
function longestPlainWordRun(text: string): number {
  let longest = 0;
  let run = 0;
  for (const word of text.split(/\s+/)) {
    run = /^[A-Za-z]+,?$/.test(word) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}
