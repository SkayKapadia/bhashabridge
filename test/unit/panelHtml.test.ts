import { describe, expect, it } from 'vitest';
import { panelHtml, type PanelHtmlOptions } from '../../src/webview/panelHtml';

const OPTIONS: PanelHtmlOptions = {
  scriptUri: 'vscode-resource://ext/media/main.js',
  styleUri: 'vscode-resource://ext/media/main.css',
  cspSource: 'vscode-resource:',
  providers: [{ id: 'sarvam', label: 'Sarvam AI' }],
  defaults: { defaultLanguage: 'gu', defaultProvider: 'sarvam' },
};

describe('panelHtml', () => {
  it('hands the default language and provider to the page', () => {
    const html = panelHtml(OPTIONS);

    expect(html).toContain('data-default-language="gu"');
    expect(html).toContain('data-default-provider="sarvam"');
  });

  it('has the input, language and provider dropdowns, translate button and output', () => {
    const html = panelHtml(OPTIONS);

    for (const id of ['input', 'language', 'provider', 'translate', 'status', 'error', 'output', 'set-key', 'get-key', 'side-by-side', 'report', 'input-area', 'input-summary', 'edit-input', 'new-translation']) {
      expect(html, id).toContain(`id="${id}"`);
    }
    expect(html).toContain('<option value="sarvam">Sarvam AI</option>');
  });

  it('allows only the extension script and stylesheet, and no inline script', () => {
    const html = panelHtml(OPTIONS);

    expect(html).toContain("default-src 'none'; script-src vscode-resource:; style-src vscode-resource:;");
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain('<script src="vscode-resource://ext/media/main.js"></script>');
  });

  it('escapes provider names and settings values', () => {
    const html = panelHtml({
      ...OPTIONS,
      providers: [{ id: 'x"><script>', label: '<b>Evil</b>' }],
      defaults: { defaultLanguage: 'gu', defaultProvider: '"><script>' },
    });

    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain('&#60;b&#62;Evil&#60;/b&#62;');
  });

  it('starts with the input open and its one-line summary hidden', () => {
    const html = panelHtml(OPTIONS);

    expect(html).toMatch(/<div id="input-area">/);
    expect(html).toMatch(/<div id="input-summary" class="input-summary" hidden>/);
  });

  it('offers every supported language in the dropdown, from the language list', () => {
    const options = [...panelHtml(OPTIONS).matchAll(/<option value="(\w+)">([^<]+)<\/option>/g)].map(m => [m[1], m[2]]);

    expect(options).toEqual([
      ['gu', 'Gujarati (ગુજરાતી)'],
      ['sarvam', 'Sarvam AI'],
    ]);
  });
});

