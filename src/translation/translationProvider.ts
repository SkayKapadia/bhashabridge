// The contract every translation backend implements. The rest of the app talks only
// to this interface, so a new provider (Sarvam, Claude, Gemini, IndicTrans2) is a new
// class here and nothing else changes.

export type TargetLanguage = 'gu' | 'mr';

export const LANGUAGE_NAMES: Readonly<Record<TargetLanguage, string>> = {
  gu: 'Gujarati',
  mr: 'Marathi',
};

// English term -> how it should appear in the translation. A term mapped to itself
// stays in English: { callback: 'callback' }.
export type Glossary = Readonly<Record<string, string>>;

export interface TranslateRequest {
  // English text to translate. May contain placeholder tokens (SKIP_001) that must come back unchanged.
  text: string;
  targetLanguage: TargetLanguage;
  glossary?: Glossary;
}

export interface TranslateResponse {
  translatedText: string;
  // Optional metadata; a provider fills in what it knows.
  tokenCount?: number;
  latencyMs?: number;
}

export interface TranslationProvider {
  // Stable id used in settings and the provider dropdown, e.g. 'sarvam'.
  readonly id: string;
  // Rejects on failure. `signal` cancels a request that is no longer needed.
  translate(request: TranslateRequest, signal?: AbortSignal): Promise<TranslateResponse>;
}
