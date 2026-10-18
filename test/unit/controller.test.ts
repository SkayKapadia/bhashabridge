import { describe, expect, it } from 'vitest';
import { TranslationError } from '../../src/translation/errors';
import type { TranslationProvider } from '../../src/translation/translationProvider';
import { handleTranslate } from '../../src/webview/controller';
import type { HostMessage } from '../../src/webview/messages';

const INPUT = 'The `users` array is undefined.\n\n```js\nconst names = users.map(getName);\n```';
const echo: TranslationProvider = { id: 'echo', translate: async r => ({ translatedText: `અનુવાદ: ${r.text}` }) };

async function run(message: { text: unknown; language: unknown }, provider = echo, signal?: AbortSignal): Promise<HostMessage[]> {
  const posted: HostMessage[] = [];
  await handleTranslate(message, provider, m => posted.push(m), signal);
  return posted;
}

describe('handleTranslate', () => {
  it('reports progress, then the final markdown and its safe HTML', async () => {
    const posted = await run({ text: INPUT, language: 'gu' });

    expect(posted.slice(0, -1)).toEqual([
      { type: 'progress', done: 0, total: 1 },
      { type: 'progress', done: 1, total: 1 },
    ]);
    const result = posted.at(-1);
    expect(result?.type).toBe('result');
    if (result?.type === 'result') {
      expect(result.markdown).toBe('અનુવાદ: The `users` array is undefined.\n\n```js\nconst names = users.map(getName);\n```');
      expect(result.html).toContain('<code>users</code>');
      expect(result.html).toContain('const names = users.map(getName);');
    }
  });

  it.each([
    [{ text: INPUT, language: 'hi' }],
    [{ text: 42, language: 'gu' }],
    [{ text: INPUT, language: undefined }],
  ])('rejects a malformed request %#', async message => {
    expect(await run(message)).toEqual([
      { type: 'error', message: 'The request from the panel was not understood. Please try again.', code: 'unknown' },
    ]);
  });

  it('passes a provider error on with its code', async () => {
    const failing: TranslationProvider = {
      id: 'f',
      translate: async () => {
        throw new TranslationError('missing-key', 'No Sarvam AI API key is set.');
      },
    };

    expect((await run({ text: INPUT, language: 'mr' }, failing)).at(-1)).toEqual({
      type: 'error',
      message: 'No Sarvam AI API key is set.',
      code: 'missing-key',
    });
  });

  it('reports a translation that lost code instead of showing it', async () => {
    const lossy: TranslationProvider = { id: 'l', translate: async () => ({ translatedText: 'કોડ ગયો.' }) };
    const last = (await run({ text: 'Call `fetchData()` first, then render the page.', language: 'gu' }, lossy)).at(-1);

    expect(last).toMatchObject({ type: 'error', code: 'reassembly' });
  });

  it('hides unexpected errors behind a plain message', async () => {
    const broken: TranslationProvider = {
      id: 'b',
      translate: async () => {
        throw new Error('internal details');
      },
    };

    expect((await run({ text: INPUT, language: 'gu' }, broken)).at(-1)).toEqual({
      type: 'error',
      message: 'Something went wrong while translating. Please try again.',
      code: 'unknown',
    });
  });

  it('says nothing more once a request has been replaced', async () => {
    const controller = new AbortController();
    const slow: TranslationProvider = {
      id: 's',
      translate: async r => {
        controller.abort();
        return { translatedText: r.text };
      },
    };

    const posted = await run({ text: INPUT, language: 'gu' }, slow, controller.signal);
    expect(posted.some(m => m.type === 'result' || m.type === 'error')).toBe(false);
  });
});
