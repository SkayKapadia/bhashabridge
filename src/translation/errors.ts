export type TranslationErrorCode =
  | 'input'
  | 'missing-key'
  | 'invalid-key'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'api'
  | 'placeholders'
  | 'unavailable';

// Every failure a provider reports. Messages are written for the person using the
// extension and never contain an API key. `retryable` marks a passing problem (a rate
// limit, a dropped connection, a busy server) that is worth one more try, and
// `retryAfterMs` how long the service asked to wait.
export class TranslationError extends Error {
  constructor(
    readonly code: TranslationErrorCode,
    message: string,
    readonly retryable = code === 'rate-limit' || code === 'network',
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}
