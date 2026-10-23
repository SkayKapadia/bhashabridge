import { describe, expect, it } from 'vitest';
import { renderBlockPairs, renderMarkdown } from '../../src/webview/renderMarkdown';

describe('renderMarkdown', () => {
  it('renders ordinary markdown', () => {
    const html = renderMarkdown('# શીર્ષક\n\n`users` undefined છે.\n\n```js\nconst names = users.map(getName);\n```');

    expect(html).toContain('<h1>શીર્ષક</h1>');
    expect(html).toContain('<code>users</code>');
    expect(html).toContain('const names = users.map(getName);');
    expect(html).toContain('<pre>');
  });

  it.each([
    ['a script tag', '<script>alert(1)</script>', /<script/i],
    ['an image with an onerror handler', '<img src=x onerror="alert(1)">', /onerror|<img/i],
    ['an inline event handler', '<a href="#" onclick="alert(1)">x</a>', /onclick/i],
    ['an iframe', '<iframe src="https://example.com"></iframe>', /<iframe/i],
    ['a javascript: link', '[click](javascript:alert(1))', /javascript:/i],
    ['a data: link', '[click](data:text/html,<script>alert(1)</script>)', /data:text|<script/i],
  ])('removes %s', (_name, markdown, unsafe) => {
    expect(renderMarkdown(markdown)).not.toMatch(unsafe);
  });

  it('shows HTML inside code as text, not markup', () => {
    const html = renderMarkdown('Use `<b>bold</b>` here.\n\n```html\n<script>run()</script>\n```');

    expect(html).toContain('&#x3C;b>bold&#x3C;/b>');
    expect(html).toContain('&#x3C;script>run()&#x3C;/script>');
    expect(html).not.toMatch(/<script/i);
  });

  it('keeps safe links', () => {
    expect(renderMarkdown('[docs](https://docs.sarvam.ai)')).toContain('href="https://docs.sarvam.ai"');
  });
});

describe('renderBlockPairs', () => {
  const english = '# Why it fails\n\nThe `users` array is undefined.\n\n```js\nrun();\n```\n\n- Add a check\n- Test it';
  const gujarati = '# તે કેમ નિષ્ફળ જાય છે\n\n`users` array undefined છે.\n\n```js\nrun();\n```\n\n- check ઉમેરો\n- તેને test કરો';

  it('pairs each translated block with the English it came from', () => {
    const pairs = renderBlockPairs(english, gujarati);

    expect(pairs).toHaveLength(4);
    expect(pairs[0]).toEqual({ english: '<h1>Why it fails</h1>', translated: '<h1>તે કેમ નિષ્ફળ જાય છે</h1>', isCode: false });
    expect(pairs[1]!.translated).toContain('<code>users</code> array undefined છે.');
    expect(pairs[2]!.english).toBe(pairs[2]!.translated); // code is identical on both sides
    expect(pairs.map(p => p.isCode)).toEqual([false, false, true, false]); // side by side shows it once
    expect(pairs[3]!.translated).toContain('<li>check ઉમેરો</li>');
  });

  it('falls back to the two whole texts when the structure differs', () => {
    const pairs = renderBlockPairs('One.\n\nTwo.', 'એક અને બે.');

    expect(pairs).toEqual([{ english: '<p>One.</p>\n<p>Two.</p>', translated: '<p>એક અને બે.</p>', isCode: false }]);
  });

  it('keeps every block safe', () => {
    const pairs = renderBlockPairs('Hello <script>x()</script> there.', 'નમસ્તે <script>x()</script>.');

    expect(JSON.stringify(pairs)).not.toMatch(/<script/i);
  });
});

describe('renderMarkdown keeps the layout', () => {
  it('keeps every line break', () => {
    expect(renderMarkdown('First line\nSecond line')).toBe('<p>First line<br>\nSecond line</p>');
  });

  it('draws tables, task lists and strikethrough', () => {
    const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~');

    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
    expect(html).toContain('<del>old</del>');
  });

  it('does not add breaks inside code', () => {
    expect(renderMarkdown('```\na\nb\n```')).toBe('<pre><code>a\nb\n</code></pre>');
  });
});
