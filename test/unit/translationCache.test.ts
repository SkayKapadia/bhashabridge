import { describe, expect, it, vi } from 'vitest';
import { cacheKey, TranslationCache, withCache, type KeyValueStore } from '../../src/cache/translationCache';
import { TranslationError } from '../../src/translation/errors';
import type { TranslateRequest, TranslationProvider } from '../../src/translation/translationProvider';

function memoryStore(): KeyValueStore & { writes: number } {
  const values = new Map<string, unknown>();
  const store = {
    writes: 0,
    get: <T>(key: string) => values.get(key) as T | undefined,
    update: async (key: string, value: unknown) => {
      store.writes++;
      values.set(key, value === undefined ? undefined : structuredClone(value));
    },
  };
  return store;
}

function counting(): TranslationProvider & { translate: ReturnType<typeof vi.fn> } {
  return { id: 'sarvam', maxChunkChars: 2000, translate: vi.fn(async (r: TranslateRequest) => ({ translatedText: `[${r.targetLanguage}] ${r.text}`, tokenCount: 50 })) };
}

const REQUEST: TranslateRequest = { text: 'Call SKIP_001 first.', targetLanguage: 'gu' };

describe('withCache', () => {
  it('answers a repeated request from the cache, with no API call', async () => {
    const provider = counting();
    const cached = withCache(provider, new TranslationCache(memoryStore()));

    const first = await cached.translate(REQUEST);
    const second = await cached.translate(REQUEST);

    expect(provider.translate).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ translatedText: first.translatedText, tokenCount: 0, latencyMs: 0 });
    expect(cached.id).toBe('sarvam');
    expect(cached.maxChunkChars).toBe(2000);
  });

  it.each([
    ['a different language', { ...REQUEST, targetLanguage: 'mr' as const }],
    ['different text', { ...REQUEST, text: 'Call SKIP_001 later.' }],
    ['a different glossary', { ...REQUEST, glossary: { inheritance: 'અનુવંશિકતા' } }],
  ])('asks again for %s', async (_name, other) => {
    const provider = counting();
    const cached = withCache(provider, new TranslationCache(memoryStore()));

    await cached.translate(REQUEST);
    await cached.translate(other);

    expect(provider.translate).toHaveBeenCalledTimes(2);
  });

  it('keeps providers apart', () => {
    expect(cacheKey('sarvam', REQUEST)).not.toBe(cacheKey('vscode-lm', REQUEST));
  });

  it('never stores a failed translation', async () => {
    const translate = vi.fn().mockRejectedValueOnce(new TranslationError('network', 'offline')).mockResolvedValue({ translatedText: 'ok' });
    const cached = withCache({ id: 'x', translate }, new TranslationCache(memoryStore()));

    await expect(cached.translate(REQUEST)).rejects.toThrow('offline');
    expect((await cached.translate(REQUEST)).translatedText).toBe('ok');
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it('keeps every entry when several chunks finish at once', async () => {
    const cache = new TranslationCache(memoryStore());
    const cached = withCache(counting(), cache);

    await Promise.all(['A one.', 'B two.', 'C three.'].map(text => cached.translate({ ...REQUEST, text })));

    for (const text of ['A one.', 'B two.', 'C three.']) {
      expect(await cache.get(cacheKey('sarvam', { ...REQUEST, text })), text).toBe(`[gu] ${text}`);
    }
  });
});

describe('TranslationCache', () => {
  it('drops the least recently used entry beyond the limit', async () => {
    let time = 0;
    const cache = new TranslationCache(memoryStore(), 2, () => ++time);

    await cache.set('a', 'A');
    await cache.set('b', 'B');
    await cache.get('a'); // a is now more recent than b
    await cache.set('c', 'C');

    expect(await cache.get('b')).toBeUndefined();
    expect(await cache.get('a')).toBe('A');
    expect(await cache.get('c')).toBe('C');
  });

  it('clears everything and says how much', async () => {
    const cache = new TranslationCache(memoryStore());
    await cache.set('a', 'A');
    await cache.set('b', 'B');

    expect(await cache.clear()).toBe(2);
    expect(await cache.get('a')).toBeUndefined();
  });
});
