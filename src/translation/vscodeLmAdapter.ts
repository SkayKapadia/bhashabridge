import { TranslationError } from './errors';
import { checkPlaceholders } from './placeholders';
import { buildSystemPrompt } from './prompt';
import type { TranslateRequest, TranslateResponse, TranslationProvider } from './translationProvider';

// A language model VS Code offers to extensions (GitHub Copilot's, for example):
// no key and no extra cost for someone who already has it. providers.ts connects
// this to VS Code's API; here it is plain functions, so it can be tested directly.
export interface ChatModel {
  send(prompt: string, signal: AbortSignal): AsyncIterable<string>;
}

export interface VscodeLmAdapterOptions {
  selectModel: () => Promise<ChatModel | undefined>;
  timeoutMs?: number;
}

export class VscodeLmAdapter implements TranslationProvider {
  readonly id = 'vscode-lm';
  readonly maxChunkChars = 3000;

  constructor(private readonly options: VscodeLmAdapterOptions) {}

  async translate(request: TranslateRequest, signal?: AbortSignal): Promise<TranslateResponse> {
    const model = await this.options.selectModel();
    if (!model) {
      throw new TranslationError(
        'unavailable',
        'No VS Code language model is available. Install and sign in to GitHub Copilot, or pick Sarvam AI.',
      );
    }

    const timeoutMs = this.options.timeoutMs ?? 60_000;
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const started = Date.now();

    // This API has no system role, so the instructions lead the one user message.
    const prompt = `${buildSystemPrompt(request.targetLanguage, request.glossary)}\n\nText to translate:\n\n${request.text}`;
    let text = '';
    try {
      for await (const part of model.send(prompt, combined)) {
        text += part;
      }
    } catch (error) {
      if (timeout.aborted) {
        throw new TranslationError('timeout', `The VS Code language model did not answer within ${timeoutMs / 1000} seconds. Please try again.`);
      }
      if (signal?.aborted) {
        throw new TranslationError('api', 'The translation was cancelled.');
      }
      throw error; // already a TranslationError from providers.ts, or unexpected
    }

    const translatedText = text.trim();
    if (!translatedText) {
      throw new TranslationError('api', 'The VS Code language model returned an empty translation. Please try again.');
    }
    checkPlaceholders(request.text, translatedText);
    return { translatedText, latencyMs: Date.now() - started };
  }
}
