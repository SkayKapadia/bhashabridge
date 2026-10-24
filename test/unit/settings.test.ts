import { describe, expect, it } from 'vitest';
import { readGlossaryDomains, readSettings } from '../../src/settings/settings';

const PROVIDERS = ['sarvam'];
const from = (values: Record<string, unknown>) => (key: string) => values[key];

describe('readSettings', () => {
  it('reads valid settings', () => {
    expect(readSettings(from({ defaultLanguage: 'gu', defaultProvider: 'sarvam' }), PROVIDERS)).toEqual({
      defaultLanguage: 'gu',
      defaultProvider: 'sarvam',
    });
  });

  it('uses Gujarati and Sarvam when nothing is set', () => {
    expect(readSettings(from({}), PROVIDERS)).toEqual({ defaultLanguage: 'gu', defaultProvider: 'sarvam' });
  });

  it.each([
    [{ defaultLanguage: 'hi' }],
    [{ defaultLanguage: 'mr' }],
    [{ defaultLanguage: 42 }],
    [{ defaultProvider: 'gemini' }],
    [{ defaultProvider: null }],
  ])('falls back to the default for a hand-edited bad value %#', values => {
    expect(readSettings(from(values), PROVIDERS)).toEqual({ defaultLanguage: 'gu', defaultProvider: 'sarvam' });
  });
});

describe('readGlossaryDomains', () => {
  const DOMAINS = [
    { id: 'software-core', isDefault: true },
    { id: 'web-frontend', isDefault: true },
    { id: 'healthcare', isDefault: false },
  ];

  it('uses the chosen domains', () => {
    expect(readGlossaryDomains(from({ glossaryDomains: ['healthcare', 'software-core'] }), DOMAINS)).toEqual(['healthcare', 'software-core']);
  });

  it('uses the default domains when nothing valid is set', () => {
    expect(readGlossaryDomains(from({}), DOMAINS)).toEqual(['software-core', 'web-frontend']);
    expect(readGlossaryDomains(from({ glossaryDomains: 'healthcare' }), DOMAINS)).toEqual(['software-core', 'web-frontend']);
  });

  it('drops unknown ids and allows turning everything off', () => {
    expect(readGlossaryDomains(from({ glossaryDomains: ['nope', 'healthcare', 7] }), DOMAINS)).toEqual(['healthcare']);
    expect(readGlossaryDomains(from({ glossaryDomains: [] }), DOMAINS)).toEqual([]);
  });
});

