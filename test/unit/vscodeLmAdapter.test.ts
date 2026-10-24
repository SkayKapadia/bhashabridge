import { describe, expect, it } from 'vitest';
import { TranslationError } from '../../src/translation/errors';
import { buildSystemPrompt } from '../../src/translation/prompt';
import { VscodeLmAdapter, type ChatModel } from '../../src/translation/vscodeLmAdapter';

const REQUEST = { text: 'Call SKIP_001 before rendering.', targetLanguage: 'gu' as const, glossary: { inheritance: 'અનુવંશિકતા' } };

function model(parts: string[], prompts: string[] = []): ChatModel {
  return {
    async *send(prompt) {
      prompts.push(prompt);
      yield* parts;
    },
  };
}

function hanging(): ChatModel {
  return {
    async *send(_prompt, signal) {
      await new Promise((_resolve, reject) => {
        if (signal.aborted) reject(new Error('aborted'));
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
      yield '';
    },
  };
}

async function failure(promise: Promise<unknown>): Promise<TranslationError> {
  const error = await promise.then(() => undefined, (e: unknown) => e);
  expect(error).toBeInstanceOf(TranslationError);
  return error as TranslationError;
}

describe('VscodeLmAdapter', () => {
  it('sends the instructions and the text in one message and joins the streamed reply', async () => {
    const prompts: string[] = [];
    const adapter = new VscodeLmAdapter({ selectModel: async () => model(['SKIP_001 render ', 'પહેલાં call કરો.  '], prompts) });

    const response = await adapter.translate(REQUEST);

    expect(response.translatedText).toBe('SKIP_001 render પહેલાં call કરો.');
    expect(prompts).toEqual([`${buildSystemPrompt('gu', REQUEST.glossary, REQUEST.text)}\n\nText to translate:\n\n${REQUEST.text}`]);
  });

  it('says clearly when no model is available, for people without Copilot', async () => {
    const error = await failure(new VscodeLmAdapter({ selectModel: async () => undefined }).translate(REQUEST));

    expect(error.code).toBe('unavailable');
    expect(error.message).toContain('pick Sarvam AI');
  });

  it('rejects a reply that lost a placeholder', async () => {
    const error = await failure(new VscodeLmAdapter({ selectModel: async () => model(['render પહેલાં call કરો.']) }).translate(REQUEST));

    expect(error.code).toBe('placeholders');
  });

  it('rejects an empty reply', async () => {
    const error = await failure(new VscodeLmAdapter({ selectModel: async () => model(['  ']) }).translate(REQUEST));

    expect(error.code).toBe('api');
  });

  it('times out', async () => {
    const error = await failure(new VscodeLmAdapter({ selectModel: async () => hanging(), timeoutMs: 20 }).translate(REQUEST));

    expect(error.code).toBe('timeout');
  });

  it('reports a cancelled request as cancelled', async () => {
    const controller = new AbortController();
    const pending = new VscodeLmAdapter({ selectModel: async () => hanging() }).translate(REQUEST, controller.signal);
    controller.abort();

    expect((await failure(pending)).message).toContain('cancelled');
  });

  it('passes on a refusal already turned into a TranslationError', async () => {
    const refusing: ChatModel = {
      // eslint-disable-next-line require-yield
      async *send() {
        throw new TranslationError('unavailable', 'The VS Code language model refused the request: no permission');
      },
    };

    expect((await failure(new VscodeLmAdapter({ selectModel: async () => refusing }).translate(REQUEST))).code).toBe('unavailable');
  });
});
