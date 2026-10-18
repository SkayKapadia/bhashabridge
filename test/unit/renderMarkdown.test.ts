import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/webview/renderMarkdown';

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
