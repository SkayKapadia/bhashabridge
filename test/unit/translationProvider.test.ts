import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_NAMES,
  type TranslateRequest,
  type TranslateResponse,
  type TranslationProvider,
} from '../../src/translation/translationProvider';

// A stand-in provider: proves the interface is enough to build one without touching anything else.
class EchoProvider implements TranslationProvider {
  readonly id = 'echo';

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    return { translatedText: `[${request.targetLanguage}] ${request.text}`, latencyMs: 0 };
  }
}

describe('TranslationProvider', () => {
  it('names the supported language', () => {
    expect(LANGUAGE_NAMES).toEqual({ gu: 'Gujarati' });
  });

  it('can be implemented and called through the interface alone', async () => {
    const provider: TranslationProvider = new EchoProvider();
    const response = await provider.translate({
      text: 'Call SKIP_001 first.',
      targetLanguage: 'gu',
      glossary: { callback: 'callback' },
    });

    expect(provider.id).toBe('echo');
    expect(response.translatedText).toBe('[gu] Call SKIP_001 first.');
  });
});
