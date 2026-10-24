import { describe, expect, it, vi } from 'vitest';
import { TranslationError } from '../../src/translation/errors';
import { withRetry } from '../../src/translation/retry';
import type { TranslationProvider } from '../../src/translation/translationProvider';

const REQUEST = { text: 'Call SKIP_001 first.', targetLanguage: 'gu' as const };

// A provider that fails with the given errors, in order, then answers.
function flaky(...errors: TranslationError[]) {
  const translate = vi.fn(async () => {
    const error = errors.shift();
    if (error) {
      throw error;
    }
    return { translatedText: 'SKIP_001 પહેલાં call કરો.' };
  });
  return { provider: { id: 'flaky', maxChunkChars: 1234, translate } satisfies TranslationProvider, translate };
}

const rateLimit = () => new TranslationError('rate-limit', 'Slow down.');
const waits: number[] = [];
const sleep = async (ms: number) => void waits.push(ms);

describe('withRetry', () => {
  it('tries again after a rate limit or a dropped connection, waiting longer each time', async () => {
    waits.length = 0;
    const { provider, translate } = flaky(rateLimit(), new TranslationError('network', 'Offline.'));

    const response = await withRetry(provider, { sleep }).translate(REQUEST);

    expect(response.translatedText).toBe('SKIP_001 પહેલાં call કરો.');
    expect(translate).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([1000, 3000]);
  });

  it('gives up after two retries with the last error', async () => {
    const { provider, translate } = flaky(rateLimit(), rateLimit(), new TranslationError('rate-limit', 'Still too fast.'));

    await expect(withRetry(provider, { sleep }).translate(REQUEST)).rejects.toThrow('Still too fast.');
    expect(translate).toHaveBeenCalledTimes(3);
  });

  it('fails at once for a wrong key, a timeout, lost placeholders or a non-passing API error', async () => {
    for (const error of [
      new TranslationError('invalid-key', 'Bad key.'),
      new TranslationError('timeout', 'Too slow.'),
      new TranslationError('placeholders', 'Lost one.'),
      new TranslationError('api', 'HTTP 400.'),
    ]) {
      const { provider, translate } = flaky(error);
      await expect(withRetry(provider, { sleep }).translate(REQUEST)).rejects.toBe(error);
      expect(translate, error.code).toHaveBeenCalledTimes(1);
    }
  });

  it('waits as long as the service asks, up to 10 seconds', async () => {
    waits.length = 0;
    const { provider } = flaky(
      new TranslationError('rate-limit', 'Wait.', true, 5000),
      new TranslationError('api', 'HTTP 503.', true, 60_000),
    );

    await withRetry(provider, { sleep }).translate(REQUEST);
    expect(waits).toEqual([5000, 10_000]);
  });

  it('stops when the request is cancelled during the wait', async () => {
    const controller = new AbortController();
    const { provider, translate } = flaky(rateLimit());

    const result = withRetry(provider, { sleep: async () => controller.abort() }).translate(REQUEST, controller.signal);

    await expect(result).rejects.toThrow('cancelled');
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('waits for real by default, and a cancel ends the wait early', async () => {
    const controller = new AbortController();
    const { provider } = flaky(rateLimit());
    const started = Date.now();
    setTimeout(() => controller.abort(), 20);

    await expect(withRetry(provider).translate(REQUEST, controller.signal)).rejects.toThrow('cancelled');
    expect(Date.now() - started).toBeLessThan(900);
  });

  it('keeps the provider id and chunk size', () => {
    const wrapped = withRetry(flaky().provider);
    expect([wrapped.id, wrapped.maxChunkChars]).toEqual(['flaky', 1234]);
  });
});
