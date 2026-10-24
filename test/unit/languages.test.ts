import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { isTargetLanguage, LANGUAGES, languageInfo } from '../../src/languages';
import { buildSystemPrompt } from '../../src/translation/prompt';

describe('language list', () => {
  it('matches the defaultLanguage setting in package.json, so Settings offers every language', () => {
    const setting = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')).contributes.configuration
      .properties['bhashabridge.defaultLanguage'];

    expect(setting.enum).toEqual(LANGUAGES.map(l => l.code));
    expect(setting.enumItemLabels).toEqual(LANGUAGES.map(l => l.name));
    expect(LANGUAGES.map(l => l.code)).toContain(setting.default);
  });

  it('gives every language a two- or three-letter code, a name, a native name and a script', () => {
    for (const language of LANGUAGES) {
      expect(language.code, language.name).toMatch(/^[a-z]{2,3}$/);
      expect(language.name.trim(), language.code).not.toBe('');
      expect(language.nativeName.trim(), language.code).not.toBe('');
      expect(language.script.trim(), language.code).not.toBe('');
    }
  });

  it('builds a prompt for every language naming it and its script', () => {
    for (const language of LANGUAGES) {
      const prompt = buildSystemPrompt(language.code);
      expect(prompt).toContain(`into ${language.name}`);
      expect(prompt).toContain(`in ${languageInfo(language.code).script} script`);
    }
  });

  it('accepts only listed languages', () => {
    expect(isTargetLanguage('gu')).toBe(true);
    for (const code of ['ta', 'hi', '', 7, undefined]) {
      expect(isTargetLanguage(code), String(code)).toBe(false);
    }
  });
});
