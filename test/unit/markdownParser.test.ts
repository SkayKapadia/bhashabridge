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

    expect(result.text).toBe('The text mentions SKIP_001 and SKIP_002.');
    expect(result.placeholders.get('SKIP_002')).toBe('`code`');
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
});
