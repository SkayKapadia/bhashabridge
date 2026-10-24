import { TranslationError } from './errors';
import type { TranslateRequest, TranslateResponse, TranslationProvider } from './translationProvider';

// Waits before each retry. A service's own Retry-After is used instead, up to MAX_WAIT_MS.
const DELAYS_MS = [1000, 3000];
const MAX_WAIT_MS = 10_000;

export interface RetryOptions {
  delaysMs?: readonly number[];
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

// Tries a request again after a passing failure (rate limit, dropped connection, busy
// server), so one hiccup does not fail a whole translation. A wrong key, a timeout or a
// cancelled request fails at once.
export function withRetry(provider: TranslationProvider, options: RetryOptions = {}): TranslationProvider {
  const delays = options.delaysMs ?? DELAYS_MS;
  const sleep = options.sleep ?? abortableSleep;
  return {
    id: provider.id,
    maxChunkChars: provider.maxChunkChars,
    async translate(request: TranslateRequest, signal?: AbortSignal): Promise<TranslateResponse> {
      for (let attempt = 0; ; attempt++) {
        try {
          return await provider.translate(request, signal);
        } catch (error) {
          if (!(error instanceof TranslationError && error.retryable) || attempt >= delays.length || signal?.aborted) {
            throw error;
          }
          await sleep(Math.min(error.retryAfterMs ?? delays[attempt]!, MAX_WAIT_MS), signal);
          if (signal?.aborted) {
            throw new TranslationError('api', 'The translation was cancelled.');
          }
        }
      }
    },
  };
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    }
  });
}
