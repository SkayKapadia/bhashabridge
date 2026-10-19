import { describe, expect, it } from 'vitest';
import { readSettings } from '../../src/settings/settings';

const PROVIDERS = ['sarvam'];
const from = (values: Record<string, unknown>) => (key: string) => values[key];

describe('readSettings', () => {
  it('reads valid settings', () => {
    expect(readSettings(from({ defaultLanguage: 'mr', defaultProvider: 'sarvam' }), PROVIDERS)).toEqual({
      defaultLanguage: 'mr',
      defaultProvider: 'sarvam',
    });
  });

  it('uses Gujarati and Sarvam when nothing is set', () => {
    expect(readSettings(from({}), PROVIDERS)).toEqual({ defaultLanguage: 'gu', defaultProvider: 'sarvam' });
  });

  it.each([
    [{ defaultLanguage: 'hi' }],
    [{ defaultLanguage: 42 }],
    [{ defaultProvider: 'gemini' }],
    [{ defaultProvider: null }],
  ])('falls back to the default for a hand-edited bad value %#', values => {
    expect(readSettings(from(values), PROVIDERS)).toEqual({ defaultLanguage: 'gu', defaultProvider: 'sarvam' });
  });
});
