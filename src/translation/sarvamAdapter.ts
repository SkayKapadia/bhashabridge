import { TranslationError } from './errors';
import { buildSystemPrompt } from './prompt';
import type { TranslateRequest, TranslateResponse, TranslationProvider } from './translationProvider';

// Sarvam's chat completions API (Chat Completion V1), checked against docs.sarvam.ai.
// Its translate API takes no instructions, so it cannot be told to keep technical terms in English.
export const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';
export const SARVAM_MODEL = 'sarvam-105b';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface SarvamAdapterOptions {
  // Reads the key from secure storage on every call, so a key set later is picked up.
  getApiKey: () => Promise<string | undefined>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface SarvamChatResponse {
  choices?: { message?: { content?: string | null } }[];
  usage?: { total_tokens?: number };
}

export class SarvamAdapter implements TranslationProvider {
  readonly id = 'sarvam';

  private readonly getApiKey: () => Promise<string | undefined>;
  private readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

  constructor(options: SarvamAdapterOptions) {
    this.getApiKey = options.getApiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async translate(request: TranslateRequest, signal?: AbortSignal): Promise<TranslateResponse> {
    const apiKey = (await this.getApiKey())?.trim();
    if (!apiKey) {
      throw new TranslationError(
        'missing-key',
        'No Sarvam AI API key is set. Run "BhashaBridge: Set Sarvam API Key" from the Command Palette.',
      );
    }

    if (signal?.aborted) {
      throw new TranslationError('api', 'The translation was cancelled.');
    }

    const timeout = AbortSignal.timeout(this.timeoutMs);
    const started = Date.now();

    let response: Response;
    try {
      response = await this.fetch(SARVAM_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The docs list both headers for this endpoint; both carry the same key.
          Authorization: `Bearer ${apiKey}`,
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          model: SARVAM_MODEL,
          messages: [
            { role: 'system', content: buildSystemPrompt(request.targetLanguage, request.glossary) },
            { role: 'user', content: request.text },
          ],
          temperature: 0.2,
          reasoning_effort: 'low',
          max_tokens: 4096,
        }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      throw this.requestFailure(error, timeout, signal);
    }

    if (!response.ok) {
      throw await this.httpFailure(response, apiKey);
    }

    const data = (await response.json()) as SarvamChatResponse;
    const translatedText = stripThinking(data.choices?.[0]?.message?.content ?? '').trim();
    if (!translatedText) {
      throw new TranslationError('api', 'Sarvam AI returned an empty translation. Please try again.');
    }

    checkPlaceholders(request.text, translatedText);

    return {
      translatedText,
      tokenCount: data.usage?.total_tokens,
      latencyMs: Date.now() - started,
    };
  }

  private requestFailure(error: unknown, timeout: AbortSignal, signal?: AbortSignal): TranslationError {
    if (timeout.aborted) {
      return new TranslationError('timeout', `Sarvam AI did not answer within ${this.timeoutMs / 1000} seconds. Please try again.`);
    }
    if (signal?.aborted) {
      return new TranslationError('api', 'The translation was cancelled.');
    }
    return new TranslationError('network', 'Could not reach Sarvam AI. Check your internet connection and try again.');
  }

  private async httpFailure(response: Response, apiKey: string): Promise<TranslationError> {
    if (response.status === 401 || response.status === 403) {
      return new TranslationError('invalid-key', 'Sarvam AI rejected the API key. Check it and set it again.');
    }
    if (response.status === 429) {
      return new TranslationError('rate-limit', 'Sarvam AI rate limit or quota reached. Wait a moment and try again.');
    }

    let detail = '';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? '';
    } catch {
      // No JSON body: the status alone has to do.
    }
    const message = `Sarvam AI request failed (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`;
    return new TranslationError('api', message.split(apiKey).join('[key hidden]'));
  }
}

// In case reasoning text ever arrives inside the content rather than beside it.
function stripThinking(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '');
}

// Code is swapped for SKIP_ tokens before translation; a token lost or doubled
// here would lose or duplicate code when the text is reassembled.
function checkPlaceholders(source: string, translated: string): void {
  const expected = countTokens(source);
  const actual = countTokens(translated);
  for (const token of new Set([...expected.keys(), ...actual.keys()])) {
    if ((actual.get(token) ?? 0) !== (expected.get(token) ?? 0)) {
      throw new TranslationError(
        'placeholders',
        `The translation changed the code placeholder ${token}, so code could be lost. Please try again.`,
      );
    }
  }
}

// Whole tokens only, so SKIP_100 is never counted inside SKIP_1000.
function countTokens(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of text.match(/SKIP_\d+/g) ?? []) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}
