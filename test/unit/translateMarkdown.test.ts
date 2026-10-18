import { describe, expect, it, vi } from 'vitest';
import { TranslationError } from '../../src/translation/errors';
import { translateMarkdown } from '../../src/translation/translateMarkdown';
import type { TranslateRequest, TranslationProvider } from '../../src/translation/translationProvider';

// Marks each segment as translated and keeps its placeholders, like a well-behaved provider.
function fakeProvider(delayFor: (text: string) => number = () => 0): TranslationProvider & { calls: TranslateRequest[] } {
  const calls: TranslateRequest[] = [];
  return {
    id: 'fake',
    calls,
    async translate(request) {
      calls.push(request);
      await new Promise(resolve => setTimeout(resolve, delayFor(request.text)));
      return { translatedText: `[${request.targetLanguage}] ${request.text}` };
    },
  };
}

describe('translateMarkdown', () => {
  it('translates the text and keeps the code exactly (checklist sample)', async () => {
    const provider = fakeProvider();
    const input = 'The function fails because users is undefined. Add a check before calling map.\nconst names = users.map(getName);';

    const result = await translateMarkdown(input, { provider, targetLanguage: 'gu' });

    expect(result).toBe('[gu] The function fails because users is undefined. Add a check before calling map.\nconst names = users.map(getName);');
    expect(provider.calls.map(c => c.text)).toEqual(['The function fails because users is undefined. Add a check before calling map.']);
  });

  it('keeps segment order even when replies arrive out of order', async () => {
    const provider = fakeProvider(text => (text.startsWith('First') ? 30 : 0));
    const input = 'First paragraph here.\n\nSecond paragraph here.\n\n- Third item here';

    const result = await translateMarkdown(input, { provider, targetLanguage: 'mr' });

    expect(result).toBe('[mr] First paragraph here.\n\n[mr] Second paragraph here.\n\n- [mr] Third item here');
  });

  it('reports progress', async () => {
    const onProgress = vi.fn();
    await translateMarkdown('One paragraph.\n\nTwo paragraph.', { provider: fakeProvider(), targetLanguage: 'gu', onProgress });

    expect(onProgress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
  });

  it('refuses very short input without calling the provider', async () => {
    const provider = fakeProvider();
    const error = await translateMarkdown('  hi  ', { provider, targetLanguage: 'gu' }).catch(e => e);

    expect(error).toBeInstanceOf(TranslationError);
    expect(error.code).toBe('input');
    expect(provider.calls).toHaveLength(0);
  });

  it('returns code-only input unchanged without calling the provider', async () => {
    const provider = fakeProvider();
    const input = '```js\nconst names = users.map(getName);\n```';

    expect(await translateMarkdown(input, { provider, targetLanguage: 'gu' })).toBe(input);
    expect(provider.calls).toHaveLength(0);
  });

  it('stops sending segments after the first failure', async () => {
    const translate = vi.fn(async () => {
      throw new TranslationError('invalid-key', 'bad key');
    });
    const input = Array.from({ length: 10 }, (_, i) => `Paragraph number ${i}.`).join('\n\n');

    await expect(translateMarkdown(input, { provider: { id: 'x', translate }, targetLanguage: 'gu', concurrency: 1 })).rejects.toThrow('bad key');
    expect(translate).toHaveBeenCalledTimes(1);
  });
});
