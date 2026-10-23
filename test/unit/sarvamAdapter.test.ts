import { describe, expect, it, vi } from 'vitest';
import { TranslationError } from '../../src/translation/errors';
import { buildSystemPrompt } from '../../src/translation/prompt';
import { SARVAM_CHAT_URL, SARVAM_MODEL, SarvamAdapter } from '../../src/translation/sarvamAdapter';

const KEY = 'sk_test_not_a_real_key_123';
const REQUEST = { text: 'Call SKIP_001 before rendering.', targetLanguage: 'gu' as const };

function reply(content: string, status = 200): Response {
  const body = status === 200
    ? { choices: [{ message: { role: 'assistant', content } }], usage: { total_tokens: 42 } }
    : { error: { message: content, code: 'x', request_id: 'r1' } };
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function adapter(fetch: typeof globalThis.fetch, key: string | undefined = KEY, timeoutMs?: number): SarvamAdapter {
  return new SarvamAdapter({ getApiKey: async () => key, fetch, timeoutMs });
}

async function failure(promise: Promise<unknown>): Promise<TranslationError> {
  const error = await promise.then(() => undefined, (e: unknown) => e);
  expect(error).toBeInstanceOf(TranslationError);
  expect((error as Error).message).not.toContain(KEY);
  return error as TranslationError;
}

describe('SarvamAdapter request', () => {
  it('sends the documented chat completions request over HTTPS', async () => {
    const fetch = vi.fn(async () => reply('SKIP_001 render પહેલાં call કરો.'));
    await adapter(fetch).translate({ ...REQUEST, glossary: { callback: 'callback' } });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(SARVAM_CHAT_URL);
    expect(url.startsWith('https://')).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
      'api-subscription-key': KEY,
    });

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(SARVAM_MODEL);
    expect(body).toHaveProperty('reasoning_effort', null);
    expect(body.messages).toEqual([
      { role: 'system', content: buildSystemPrompt('gu', { callback: 'callback' }) },
      { role: 'user', content: REQUEST.text },
    ]);
  });

  it('returns the translation with token count and latency', async () => {
    const response = await adapter(async () => reply('  SKIP_001 render પહેલાં call કરો.  ')).translate(REQUEST);

    expect(response.translatedText).toBe('SKIP_001 render પહેલાં call કરો.');
    expect(response.tokenCount).toBe(42);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('drops any reasoning text that arrives inside the content', async () => {
    const response = await adapter(async () => reply('<think>planning</think>SKIP_001 call કરો.')).translate(REQUEST);

    expect(response.translatedText).toBe('SKIP_001 call કરો.');
  });
});

describe('buildSystemPrompt', () => {
  it('names the language and asks to keep technical terms and placeholders', () => {
    const prompt = buildSystemPrompt('mr');

    expect(prompt).toContain('into Marathi');
    expect(prompt).toContain('programming keywords, variable names, function names, class names, library names, framework names, and technical terms');
    expect(prompt).toContain('SKIP_001');
    expect(prompt).not.toContain('Glossary');
  });

  it('asks the model never to spell English words in the target script', () => {
    expect(buildSystemPrompt('gu')).toContain('Never spell an English word in Gujarati script');
    expect(buildSystemPrompt('mr')).toContain('Never spell an English word in Devanagari script');
  });

  it('lists glossary entries', () => {
    const prompt = buildSystemPrompt('gu', { inheritance: 'anuvanshikta (inheritance)', API: 'API' });

    expect(prompt).toContain('into Gujarati');
    expect(prompt).toContain('- inheritance -> anuvanshikta (inheritance)');
    expect(prompt).toContain('- API -> API');
  });
});

describe('SarvamAdapter errors', () => {
  it('fails clearly without calling the API when no key is set', async () => {
    for (const key of [undefined, '', '   ']) {
      const fetch = vi.fn();
      const error = await failure(new SarvamAdapter({ getApiKey: async () => key, fetch }).translate(REQUEST));

      expect(error.code).toBe('missing-key');
      expect(error.message).toContain('Set Sarvam API Key');
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it('reports a network failure', async () => {
    const error = await failure(adapter(async () => { throw new TypeError('fetch failed'); }).translate(REQUEST));

    expect(error.code).toBe('network');
  });

  it('times out a request that takes too long', async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) reject(new DOMException('aborted', 'AbortError'));
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const error = await failure(adapter(hang, KEY, 20).translate(REQUEST));

    expect(error.code).toBe('timeout');
  });

  it('reports a cancelled request as cancelled, not as a timeout', async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) reject(new DOMException('aborted', 'AbortError'));
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const controller = new AbortController();
    const pending = adapter(hang).translate(REQUEST, controller.signal);
    controller.abort();
    const error = await failure(pending);

    expect(error.message).toContain('cancelled');
  });

  it.each([
    [403, 'invalid-key'],
    [401, 'invalid-key'],
    [429, 'rate-limit'],
    [500, 'api'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const error = await failure(adapter(async () => reply('server said no', status)).translate(REQUEST));

    expect(error.code).toBe(code);
  });

  it('never repeats the key, even if the API echoes it back', async () => {
    const error = await failure(adapter(async () => reply(`bad key ${KEY}`, 400)).translate(REQUEST));

    expect(error.message).toContain('[key hidden]');
  });

  it('rejects a translation that lost or duplicated a placeholder', async () => {
    for (const content of ['render પહેલાં call કરો.', 'SKIP_001 SKIP_001 call કરો.', 'SKIP_0011 call કરો.']) {
      const error = await failure(adapter(async () => reply(content)).translate(REQUEST));
      expect(error.code, content).toBe('placeholders');
    }
  });

  it('rejects an empty translation', async () => {
    const error = await failure(adapter(async () => reply('   ')).translate(REQUEST));

    expect(error.code).toBe('api');
  });

  it('says what came back instead of a translation, without the text itself', async () => {
    const body = {
      choices: [{ finish_reason: 'length', message: { content: null, reasoning_content: 'secret thoughts about the text' } }],
      usage: { completion_tokens: 4096, completion_tokens_details: { reasoning_tokens: 4096 } },
    };
    const error = await failure(adapter(async () => new Response(JSON.stringify(body), { status: 200 })).translate(REQUEST));

    expect(error.message).toContain('finish reason: length');
    expect(error.message).toContain('content: null');
    expect(error.message).toContain('reasoning: 30 characters');
    expect(error.message).toContain('reasoning tokens: 4096');
    expect(error.message).not.toContain('secret thoughts');
  });

  it('reads content sent as a list of text parts', async () => {
    const body = { choices: [{ message: { content: [{ type: 'text', text: 'SKIP_001 call ' }, { type: 'text', text: 'કરો.' }] } }] };
    const response = await adapter(async () => new Response(JSON.stringify(body), { status: 200 })).translate(REQUEST);

    expect(response.translatedText).toBe('SKIP_001 call કરો.');
  });
});
