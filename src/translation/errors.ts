export type TranslationErrorCode =
  | 'input'
  | 'missing-key'
  | 'invalid-key'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'api'
  | 'placeholders';

// Every failure a provider reports. Messages are written for the person using the
// extension and never contain an API key.
export class TranslationError extends Error {
  constructor(
    readonly code: TranslationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}
