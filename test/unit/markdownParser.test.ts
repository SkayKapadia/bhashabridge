import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../src/parser/markdownParser';

function restore(text: string, placeholders: Map<string, string>): string {
  let result = text;
  for (const [token, original] of placeholders) {
    result = result.replace(token, original);
  }
  return result;
}

describe('parseMarkdown', () => {
  it('returns plain text unchanged when there is no code', () => {
    const input = 'A loop runs the same block many times.\n\nIt stops when the condition is false.';
    const result = parseMarkdown(input);

    expect(result.text).toBe(input);
    expect(result.placeholders.size).toBe(0);
  });

  it('handles empty input', () => {
    const result = parseMarkdown('');

    expect(result.text).toBe('');
    expect(result.placeholders.size).toBe(0);
  });

  it('replaces a fenced code block, keeping fences and language in the original', () => {
    const code = '```ts\nconst x = 1;\n```';
    const result = parseMarkdown(`Look at this:\n\n${code}\n\nThat sets x.`);

    expect(result.text).toBe('Look at this:\n\nSKIP_001\n\nThat sets x.');
    expect(result.placeholders.get('SKIP_001')).toBe(code);
  });

  it('replaces inline code', () => {
    const result = parseMarkdown('Call `fetchData()` before rendering.');

    expect(result.text).toBe('Call SKIP_001 before rendering.');
    expect(result.placeholders.get('SKIP_001')).toBe('`fetchData()`');
  });

  it('numbers placeholders in document order', () => {
    const input = 'Use `map` and `filter`.\n\n```js\narr.map(f);\n```\n\nThen `reduce`.';
    const result = parseMarkdown(input);

    expect(result.text).toBe('Use SKIP_001 and SKIP_002.\n\nSKIP_003\n\nThen SKIP_004.');
    expect([...result.placeholders.entries()]).toEqual([
      ['SKIP_001', '`map`'],
      ['SKIP_002', '`filter`'],
      ['SKIP_003', '```js\narr.map(f);\n```'],
      ['SKIP_004', '`reduce`'],
    ]);
  });

  it('replaces tilde fences and indented code blocks', () => {
    const tilde = '~~~\nprint("hi")\n~~~';
    const indented = '    let y = 2;';
    const result = parseMarkdown(`${tilde}\n\nText.\n\n${indented}`);

    expect(result.text).toBe('SKIP_001\n\nText.\n\nSKIP_002');
    expect(result.placeholders.get('SKIP_001')).toBe(tilde);
    expect(result.placeholders.get('SKIP_002')).toBe(indented);
  });

  it('keeps inline code that contains backticks intact', () => {
    const result = parseMarkdown('Template: `` `${name}` `` is used.');

    expect(result.text).toBe('Template: SKIP_001 is used.');
    expect(result.placeholders.get('SKIP_001')).toBe('`` `${name}` ``');
  });

  it('finds code inside lists and blockquotes', () => {
    const input = '- Install with `npm install`\n\n> Run `npm test` after.';
    const result = parseMarkdown(input);

    expect(result.text).toBe('- Install with SKIP_001\n\n> Run SKIP_002 after.');
  });

  it('treats an unclosed backtick as plain text', () => {
    const input = 'This ` is not code.';
    const result = parseMarkdown(input);

    expect(result.text).toBe(input);
    expect(result.placeholders.size).toBe(0);
  });

  it('skips token names that already appear in the input', () => {
    const input = 'The text mentions SKIP_001 and `code`.';
    const result = parseMarkdown(input);

    // SKIP_001 in the input is itself code-shaped, so it is protected too, under a new token.
    expect(result.text).toBe('The text mentions SKIP_002 and SKIP_003.');
    expect(result.placeholders.get('SKIP_002')).toBe('SKIP_001');
    expect(result.placeholders.get('SKIP_003')).toBe('`code`');
    expect(result.placeholders.has('SKIP_001')).toBe(false);
  });

  it('preserves unicode text around code', () => {
    const input = 'આ `for` loop છે.';
    const result = parseMarkdown(input);

    expect(result.text).toBe('આ SKIP_001 loop છે.');
  });

  it('restores the exact original input from text and placeholders', () => {
    const input = [
      '# Fix',
      '',
      'The `useEffect` hook runs after render.',
      '',
      '1. Add a dependency array:',
      '',
      '   ```tsx',
      '   useEffect(() => {',
      '     load();',
      '   }, []);',
      '   ```',
      '',
      '2. Remove `load()` from the body.',
    ].join('\n');
    const result = parseMarkdown(input);

    expect(result.text).not.toContain('useEffect');
    expect(restore(result.text, result.placeholders)).toBe(input);
  });

  it('keeps every placeholder unique', () => {
    const input = 'Use `a`, `b` and `c`.\n\n```\none\n```\n\n```\ntwo\n```';
    const result = parseMarkdown(input);
    const tokens = [...result.placeholders.keys()];

    expect(tokens).toHaveLength(5);
    expect(new Set(tokens).size).toBe(5);
    expect(new Set(result.placeholders.values()).size).toBe(5);
  });
});

describe('parseMarkdown bare code lines', () => {
  const sentence = 'The function fails because users is undefined. Add a check before calling map.';
  const codeLine = 'const names = users.map(getName);';

  it('extracts a code line pasted without backticks (checklist sample)', () => {
    const input = `${sentence}\n${codeLine}`;
    const result = parseMarkdown(input);

    expect(result.text).toBe(`${sentence}\nSKIP_001`);
    expect(result.placeholders.get('SKIP_001')).toBe(codeLine);
    expect(result.segments.map(s => s.text)).toEqual([sentence]);
    expect(restore(result.text, result.placeholders)).toBe(input);
  });

  it('extracts the sample code line when it is its own paragraph', () => {
    const result = parseMarkdown(`${sentence}\n\n${codeLine}`);

    expect(result.placeholders.get('SKIP_001')).toBe(codeLine);
    expect(result.segments.map(s => s.text)).toEqual([sentence]);
  });

  it('extracts several kinds of bare code lines', () => {
    const lines = [
      'if (!users) {',
      '  return [];',
      '}',
      'x = 5',
      'console.log(names)',
      'import os',
      'def get_name(user):',
    ];
    const result = parseMarkdown(`Try this:\n\n${lines.join('\n')}`);

    expect([...result.placeholders.values()]).toEqual(lines.map(l => l.trim()));
    expect(result.segments.map(s => s.text)).toEqual(['Try this:']);
  });

  it('leaves ordinary sentences alone', () => {
    const sentences = [
      'Set the value to 5.',
      'Return the list when it is empty.',
      'If you want, you can import the file later:',
      'For each user, check the name first.',
      'The value x = 5 is the default.',
      'Use a function to wrap it.',
    ];
    for (const line of sentences) {
      const result = parseMarkdown(line);
      expect(result.placeholders.size, line).toBe(0);
      expect(result.segments.map(s => s.text), line).toEqual([line]);
    }
  });
});

describe('parseMarkdown segments', () => {
  it('returns each paragraph, heading and list item separately', () => {
    const input = '# Why it fails\n\nFirst paragraph.\n\nSecond paragraph.\n\n- Item one\n- Item two\n\n> A quoted note.';
    const result = parseMarkdown(input);

    expect(result.segments.map(s => s.text)).toEqual([
      'Why it fails',
      'First paragraph.',
      'Second paragraph.',
      'Item one',
      'Item two',
      'A quoted note.',
    ]);
  });

  it('gives ranges that point into the replaced text', () => {
    const result = parseMarkdown('Call `fetchData()` first.\n\n```js\nrun();\n```\n\nThen check `users`.');

    for (const segment of result.segments) {
      expect(result.text.slice(segment.start, segment.end)).toBe(segment.text);
    }
    expect(result.segments.map(s => s.text)).toEqual(['Call SKIP_001 first.', 'Then check SKIP_003.']);
  });

  it('leaves out paragraphs that are only code', () => {
    const result = parseMarkdown('`npm install`\n\nRun the tests.');

    expect(result.segments.map(s => s.text)).toEqual(['Run the tests.']);
  });

  it('returns no segments for empty or whitespace-only input', () => {
    expect(parseMarkdown('').segments).toEqual([]);
    expect(parseMarkdown('   \n\n  ').segments).toEqual([]);
  });
});

describe('parseMarkdown setting values', () => {
  it('protects a setting written into a sentence without backticks (the real Gujarati test)', () => {
    const result = parseMarkdown('A rendering is used only when it is marked "reviewed": true. Until then it stays in English.');

    expect(result.text).toBe('A rendering is used only when it is marked SKIP_001. Until then it stays in English.');
    expect(result.placeholders.get('SKIP_001')).toBe('"reviewed": true');
  });

  it.each([
    ['"reviewed": false', 'boolean'],
    ['"timeout": 30', 'number'],
    ['"retries": -1', 'negative number'],
    ['"provider": "sarvam"', 'string'],
    ['"bhashabridge.defaultLanguage": "gu"', 'dotted key'],
    ['"value": null', 'null'],
  ])('treats %s as code (%s)', setting => {
    const result = parseMarkdown(`Set ${setting} in the file.`);

    expect([...result.placeholders.values()]).toEqual([setting]);
  });

  it('leaves ordinary quotes and colons alone', () => {
    for (const text of ['He said "yes": then left.', 'The word "false" means not true.', 'Note: "draft" items are hidden.']) {
      expect(parseMarkdown(text).placeholders.size, text).toBe(0);
    }
  });

  it('does not double-protect a setting already in backticks', () => {
    const result = parseMarkdown('Mark it `"reviewed": true` first.');

    expect([...result.placeholders.values()]).toEqual(['`"reviewed": true`']);
  });
});

describe('parseMarkdown tables, task lists and addresses', () => {
  it('translates each table cell on its own and never sends the table structure', () => {
    const input = '| Option | Needs |\n| --- | --- |\n| Share the `.vsix` | VS Code |';
    const result = parseMarkdown(input);

    expect(result.segments.map(s => s.text)).toEqual(['Option', 'Needs', 'Share the SKIP_001', 'SKIP_002 Code']);
    expect(result.segments.every(s => s.isTableCell)).toBe(true);
    expect(result.text).toBe('| Option | Needs |\n| --- | --- |\n| Share the SKIP_001 | SKIP_002 Code |');
  });

  it('keeps task list markers out of the text to translate', () => {
    const result = parseMarkdown('- [ ] Add a check\n- [x] Run the tests');

    expect(result.segments.map(s => s.text)).toEqual(['Add a check', 'Run the tests']);
  });

  it('protects a bare web address', () => {
    const result = parseMarkdown('Get a key at https://dashboard.sarvam.ai today.');

    expect(result.text).toBe('Get a key at SKIP_001 today.');
    expect(result.placeholders.get('SKIP_001')).toBe('https://dashboard.sarvam.ai');
  });

  it('still translates the words of a normal link', () => {
    const result = parseMarkdown('Read [the guide](https://example.com/guide) first.');

    expect(result.placeholders.size).toBe(0);
  });
});

describe('parseMarkdown code-shaped words without backticks', () => {
  // From the real plain-text paste: everything here was code, but the backticks were lost.
  const PASTED =
    'This machine has photos in backend/uploads/profile-photos/ and the DB has records whose files were never in the GCS bucket. ' +
    "JollySparrow665's photos are missing. The column needs min-h-0/overflow-hidden inside h-[calc(100vh-200px)], " +
    'not min-height: auto, so flex-1 overflow-y-auto works. See config.ts and useEffect for API_KEY.';

  it('protects paths, acronyms, names with digits, CSS classes, files, camelCase and snake_case', () => {
    const protectedWords = [...parseMarkdown(PASTED).placeholders.values()];

    expect(protectedWords).toEqual([
      'backend/uploads/profile-photos/',
      'DB',
      'GCS',
      'JollySparrow665',
      'min-h-0/overflow-hidden',
      'h-[calc(100vh-200px)]',
      'min-height: auto',
      'flex-1',
      'overflow-y-auto',
      'config.ts',
      'useEffect',
      'API_KEY',
    ]);
  });

  it('marks them as inline, so they stay inside their sentence', () => {
    const result = parseMarkdown('The GCS bucket is empty.');

    expect(result.blockTokens.size).toBe(0);
  });

  it('marks code blocks and code lines as blocks', () => {
    const result = parseMarkdown('Run this:\nconst x = 1;\n\n```js\nrun();\n```');

    expect(result.blockTokens.size).toBe(2);
  });

  it.each([
    'It is up-to-date and state-of-the-art, one at a time.',
    'Use and/or as you like; it is OK, and NOT a problem.',
    'On the 2nd and 3rd day (dev era) we met in Ahmedabad.',
    "Don't worry: it's fine, e.g. when you're done.",
    'The A team said: I agree.',
    'Read [the guide](https://example.com/guide) first.',
  ])('leaves ordinary writing alone: %s', text => {
    expect(parseMarkdown(text).placeholders.size).toBe(0);
  });
});

