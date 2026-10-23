import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../src/parser/markdownParser';
import { ReassemblyError, reassemble, restorePlaceholders } from '../../src/reassembly/reassemble';

const CODE = 'const names = users.map(getName);';
const SENTENCE = 'The function fails because users is undefined.';

// What a translator returns for one segment: its own language, tokens kept.
// What a translator returns for the sentence: its own language, the placeholder for
// `users` (a name from the code, so hidden too) kept in place.
const GUJARATI = 'SKIP_001 undefined હોવાથી function fail થાય છે.';
const MARATHI = 'SKIP_001 undefined असल्यामुळे function fail होते.';

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

describe('reassemble (test example)', () => {
  it.each([
    ['Gujarati', GUJARATI],
    ['Marathi', MARATHI],
  ])('puts the code back exactly after a %s translation', (_language, translation) => {
    const parsed = parseMarkdown(`${SENTENCE}\n${CODE}`);
    expect(parsed.segments.map(s => s.text)).toEqual(['The function fails because SKIP_001 is undefined.']);

    const result = reassemble(parsed, [translation]);

    expect(result).toBe(`${translation.replace('SKIP_001', 'users')}\n${CODE}`);
    expect(occurrences(result, CODE)).toBe(1);
    expect(result).not.toContain('SKIP_');
  });

  it('keeps the code exact when it is a fenced block', () => {
    const fenced = '```js\nconst names = users.map(getName);\n```';
    const parsed = parseMarkdown(`${SENTENCE}\n\n${fenced}`);

    const result = reassemble(parsed, [GUJARATI]);

    expect(result).toBe(`${GUJARATI.replace('SKIP_001', 'users')}\n\n${fenced}`);
  });
});

describe('reassemble markdown structure', () => {
  const input = [
    '# Why it fails',
    '',
    'The `users` array is undefined.',
    '',
    '- Add a check',
    '- Call `map` after it',
    '',
    '```ts',
    'if (!users) {',
    '  return [];',
    '}',
    '```',
    '',
    '> Remember to test it.',
  ].join('\n');

  it('changes only the translated text: marks, bullets, blank lines and code stay', () => {
    const parsed = parseMarkdown(input);
    const translated = parsed.segments.map(s => `«${s.text}»`);

    const result = reassemble(parsed, translated);

    expect(result).toBe([
      '# «Why it fails»',
      '',
      '«The `users` array is undefined.»',
      '',
      '- «Add a check»',
      '- «Call `map` after it»',
      '',
      '```ts',
      'if (!users) {',
      '  return [];',
      '}',
      '```',
      '',
      '> «Remember to test it.»',
    ].join('\n'));
  });

  it('rebuilds the exact input when nothing is translated', () => {
    const parsed = parseMarkdown(input);

    expect(reassemble(parsed, parsed.segments.map(s => s.text))).toBe(input);
    expect(restorePlaceholders(parsed.text, parsed.placeholders)).toBe(input);
  });

  it('refuses a translation with the wrong number of segments', () => {
    const parsed = parseMarkdown(input);

    expect(() => reassemble(parsed, ['only one'])).toThrow(/Expected 5 translated segments, got 1/);
  });
});

describe('restorePlaceholders never modifies code', () => {
  it('inserts code containing replacement patterns verbatim', () => {
    const code = "`s.replace(/x/, '$& $1 $$ $\\'')`";
    const result = restorePlaceholders('Use SKIP_001 here.', new Map([['SKIP_001', code]]));

    expect(result).toBe(`Use ${code} here.`);
  });

  it('does not replace token-like text inside restored code', () => {
    const placeholders = new Map([
      ['SKIP_001', '`log("SKIP_002")`'],
      ['SKIP_002', '`other`'],
    ]);
    const result = restorePlaceholders('SKIP_001 then SKIP_002.', placeholders);

    expect(result).toBe('`log("SKIP_002")` then `other`.');
  });

  it('tells SKIP_100 and SKIP_1000 apart', () => {
    const placeholders = new Map([
      ['SKIP_100', '`a`'],
      ['SKIP_1000', '`b`'],
    ]);

    expect(restorePlaceholders('SKIP_1000 and SKIP_100', placeholders)).toBe('`b` and `a`');
  });

  it('leaves token-like text that was ordinary input alone', () => {
    const parsed = parseMarkdown('The log says SKIP_001 when `run()` fails.');
    const result = restorePlaceholders(parsed.text, parsed.placeholders, parsed.blockTokens);

    expect(result).toBe('The log says SKIP_001 when `run()` fails.');
  });

  it('keeps every original exactly once for a mixed document', () => {
    const parsed = parseMarkdown('Use `a`, `b`.\n\n```\nx\n```\n\n    indented();\n\nlet y = 2;');
    const result = restorePlaceholders(parsed.text, parsed.placeholders);

    for (const code of parsed.placeholders.values()) {
      expect(occurrences(result, code), code).toBe(1);
    }
  });
});

describe('restorePlaceholders rejects changed code', () => {
  const placeholders = new Map([['SKIP_001', '`fetchData()`'], ['SKIP_002', '`users`']]);

  it('throws when a placeholder is missing', () => {
    const error = (() => {
      try {
        restorePlaceholders('Call SKIP_001 first.', placeholders);
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(ReassemblyError);
    expect((error as ReassemblyError).missing).toEqual(['SKIP_002']);
    expect((error as ReassemblyError).message).toContain('missing SKIP_002');
  });

  it('throws when a placeholder is repeated', () => {
    expect(() => restorePlaceholders('SKIP_001 SKIP_001 SKIP_002', placeholders)).toThrow(/repeated SKIP_001/);
  });

  it('throws when a placeholder was altered', () => {
    expect(() => restorePlaceholders('SKIP_01 and SKIP_002', placeholders)).toThrow(ReassemblyError);
  });
});

describe('restorePlaceholders keeps code blocks on their own line', () => {
  it('moves a fenced block back onto its own line if the translator merged it', () => {
    const fenced = '```js\nrun();\n```';
    const result = restorePlaceholders('પહેલાં આ ચલાવો: SKIP_001 પછી તપાસો.', new Map([['SKIP_001', fenced]]));

    expect(result).toBe(`પહેલાં આ ચલાવો:\n${fenced}\nપછી તપાસો.`);
    expect([...parseMarkdown(result).placeholders.values()]).toContain(fenced);
  });

  it('puts a blank line around an indented block, which cannot interrupt a paragraph', () => {
    const result = restorePlaceholders('Text SKIP_001', new Map([['SKIP_001', '    indented();']]));

    expect(result).toBe('Text\n\n    indented();');
  });

  it('leaves inline code inline', () => {
    const result = restorePlaceholders('Call SKIP_001 first.', new Map([['SKIP_001', '`fetchData()`']]));

    expect(result).toBe('Call `fetchData()` first.');
  });
});

describe('reassemble keeps code-shaped words in their sentence', () => {
  it('restores a word protected without backticks inline, not on its own line', () => {
    const parsed = parseMarkdown('The GCS bucket has no files in backend/uploads/ yet.');
    const translated = parsed.segments.map(s => `[gu] ${s.text}`);

    expect(reassemble(parsed, translated)).toBe('[gu] The GCS bucket has no files in backend/uploads/ yet.');
  });
});

