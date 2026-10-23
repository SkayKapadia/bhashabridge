// Words whose shape says "code" even when nobody put them in backticks, as happens
// when an answer is copied from a rendered chat window: paths, file names, snake_case,
// camelCase, CSS classes, names with digits and short acronyms. Ordinary words never
// have these shapes, so treating them as code freezes no normal sentence.

const FILE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'py', 'java', 'kt', 'swift', 'go', 'rs', 'rb', 'php',
  'cs', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'vue', 'svelte', 'yml', 'yaml', 'toml', 'xml', 'sql', 'sh',
  'env', 'lock', 'txt', 'csv', 'log', 'ini', 'cfg', 'gradle', 'vsix', 'dockerfile',
]);

// Capitals that are ordinary English words, not acronyms.
const NOT_ACRONYMS = new Set(['A', 'I', 'OR', 'AND', 'NOT', 'THE', 'IS', 'IT', 'TO', 'OF', 'IN', 'ON', 'NO', 'YES', 'OK', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'IF', 'SO', 'UP', 'WE', 'MY', 'ME', 'US']);

export function isCodeShapedWord(word: string): boolean {
  if (word.length < 2) {
    return false;
  }
  return (
    isPath(word) ||
    isFileName(word) ||
    /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+$/.test(word) || // snake_case, UPPER_SNAKE
    /^[a-z]+[A-Z][A-Za-z0-9]*$/.test(word) || // camelCase
    /^[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*$/.test(word) || // PascalCase: JollySparrow665, GitHub
    isKebabCode(word) ||
    /[A-Za-z0-9_]\(|[[\]{}=<>;]/.test(word) || // calls and brackets: getName(), h-[calc(...)]
    (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9.]+$/.test(word) && !/^\d+(?:st|nd|rd|th)$/i.test(word)) || // v2, 100vh
    isAcronym(word)
  );
}

// Common English words that also turn up in code (keywords, comments). Seeing one in
// code is no reason to keep it in English in the explanation.
const ENGLISH_WORDS = new Set(
  ('the and for not but with from this that these those there their they them then than are was were has have had ' +
    'can could will would should may might must you your its our out all any one two new old use get set put add ' +
    'run let var try end not now how why who what when where which while each else into onto over under about ' +
    'after before again also just only more most some such very here same other first last next true false null')
    .split(' '),
);

// Names used in the code of an answer (`users`, `setUsers`, `getName`), so the same
// names in its sentences can be kept in English even when written without backticks.
export function identifiersIn(code: string): Set<string> {
  // Comments and quoted strings hold English text, not names.
  const withoutProse = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/(^|\s)#[^\n]*/g, '$1 ')
    .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, ' ');
  const names = new Set<string>();
  for (const [name] of withoutProse.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (name.length >= 3 && !ENGLISH_WORDS.has(name.toLowerCase())) {
      names.add(name);
    }
  }
  return names;
}

// Every code-shaped word in the text, as offsets, with surrounding punctuation left out.
// A "property: value" pair (min-height: auto) is one span, and a word in `knownNames`
// (a name from the answer's own code) counts as code whatever its shape.
export function findCodeShapedWords(text: string, knownNames: ReadonlySet<string> = new Set()): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/[a-z]+(?:-[a-z]+)+:\s*[\w#.%-]+/g)) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  for (const match of text.matchAll(/\S+/g)) {
    const { word, offset } = trimPunctuation(match[0]);
    const start = match.index + offset;
    const end = start + word.length;
    if ((isCodeShapedWord(word) || knownNames.has(word)) && !spans.some(s => s.start < end && s.end > start)) {
      spans.push({ start, end });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}

function isPath(word: string): boolean {
  if (!/[A-Za-z]/.test(word) || !word.includes('/') || /^[a-z]+:\/\//i.test(word)) {
    return false;
  }
  const slashes = word.split('/').length - 1;
  return /^(?:\.{0,2}|~)\//.test(word) || word.endsWith('/') || slashes >= 2 || /[._-]/.test(word);
}

function isFileName(word: string): boolean {
  const match = word.match(/^[\w.-]*[A-Za-z0-9_]\.([A-Za-z]+)$/);
  return match !== null && FILE_EXTENSIONS.has(match[1]!.toLowerCase());
}

// Hyphenated words that carry a digit or a one-letter part (flex-1, min-h-0,
// overflow-y-auto): CSS utilities and ids, never English like "up-to-date".
function isKebabCode(word: string): boolean {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(word)) {
    return false;
  }
  const parts = word.split('-');
  return /\d/.test(word) || parts.some(part => part.length === 1 && part !== 'a');
}

function isAcronym(word: string): boolean {
  const bare = word.replace(/s$/, '');
  return /^[A-Z]{2,6}$/.test(bare) && !NOT_ACRONYMS.has(bare);
}

// Strips sentence punctuation around a word, but keeps a closing bracket that closes
// one opened inside the word: getName() stays whole, "(getName)" loses its brackets.
function trimPunctuation(raw: string): { word: string; offset: number } {
  let start = 0;
  let end = raw.length;
  const balanced = (open: string, close: string, text: string) => text.split(open).length === text.split(close).length;

  for (;;) {
    const word = raw.slice(start, end);
    const first = word[0];
    const last = word.at(-1);
    if (first && /["'“‘(`]/.test(first) && (first !== '(' || !balanced('(', ')', word))) {
      start++;
    } else if (/['’]s$/.test(word)) {
      end -= 2; // a possessive: JollySparrow665's
    } else if (last && /[.,;:!?"'”’`]/.test(last)) {
      end--;
    } else if (last === ')' && !balanced('(', ')', word)) {
      end--;
    } else if (last === ']' && !balanced('[', ']', word)) {
      end--;
    } else {
      return { word, offset: start };
    }
    if (end <= start) {
      return { word: '', offset: start };
    }
  }
}
