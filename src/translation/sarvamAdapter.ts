import { TranslationError } from './errors';
import { checkPlaceholders } from './placeholders';
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
  choices?: {
    finish_reason?: string;
    message?: { content?: string | { type?: string; text?: string }[] | null; reasoning_content?: string | null };
  }[];
  usage?: { total_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
}

export class SarvamAdapter implements TranslationProvider {
  readonly id = 'sarvam';
  // Leaves room for a reply in an Indian script, which takes more tokens than the
  // English sent, within the 4096-token reply limit.
  readonly maxChunkChars = 2000;

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
            { role: 'system', content: buildSystemPrompt(request.targetLanguage, request.glossary, request.text) },
            { role: 'user', content: request.text },
          ],
          temperature: 0.2,
          // Translation needs no reasoning, and with it on the model can spend the whole token
          // budget thinking and return nothing. The docs: disabled by setting it to None (null).
          reasoning_effort: null,
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
    const content = textOf(data.choices?.[0]?.message?.content);
    const translatedText = stripThinking(content).trim();
    if (!translatedText) {
      throw new TranslationError('api', `Sarvam AI returned an empty translation. ${describeEmptyReply(data, content)}`);
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
      return new TranslationError('rate-limit', 'Sarvam AI rate limit or quota reached. Wait a moment and try again.', true, retryAfter(response));
    }

    let detail = '';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? '';
    } catch {
      // No JSON body: the status alone has to do.
    }
    const message = `Sarvam AI request failed (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`;
    const isBusy = [500, 502, 503, 504].includes(response.status);
    return new TranslationError('api', message.split(apiKey).join('[key hidden]'), isBusy, isBusy ? retryAfter(response) : undefined);
  }
}

// The Retry-After header in milliseconds, when it is a number of seconds.
function retryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers?.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

// The content as text, whether it came as a string or as OpenAI-style parts.
function textOf(content: string | { type?: string; text?: string }[] | null | undefined): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(part => (typeof part?.text === 'string' ? part.text : '')).join('');
  }
  return '';
}

// What came back instead of a translation: field names and counts only, never the
// text itself, so it is safe to show and to share when reporting the problem.
function describeEmptyReply(data: SarvamChatResponse, content: string): string {
  const choice = data.choices?.[0];
  const reasoning = choice?.message?.reasoning_content;
  const details = [
    `finish reason: ${choice?.finish_reason ?? 'none'}`,
    `content: ${content ? `${content.length} characters, all inside <think>` : choice?.message?.content === null ? 'null' : 'empty'}`,
    `reasoning: ${typeof reasoning === 'string' && reasoning ? `${reasoning.length} characters` : 'none'}`,
    `output tokens: ${data.usage?.completion_tokens ?? '?'}`,
    `reasoning tokens: ${data.usage?.completion_tokens_details?.reasoning_tokens ?? '?'}`,
  ];
  return `Details for the developer: ${details.join(', ')}.`;
}

// In case reasoning text ever arrives inside the content rather than beside it.
function stripThinking(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '');
}
