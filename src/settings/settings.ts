import type { TargetLanguage } from '../translation/translationProvider';

// The user's BhashaBridge settings (VS Code Settings > BhashaBridge), declared in
// package.json under contributes.configuration.
export interface BhashaBridgeSettings {
  defaultLanguage: TargetLanguage;
  defaultProvider: string;
}

export const SETTINGS_SECTION = 'bhashabridge';
const LANGUAGES: readonly string[] = ['gu', 'mr'];
const FALLBACK: BhashaBridgeSettings = { defaultLanguage: 'gu', defaultProvider: 'sarvam' };

// Settings files are hand-editable, so a value VS Code did not validate (a typo, a
// provider that no longer exists) falls back to the default instead of breaking the panel.
export function readSettings(
  get: (key: string) => unknown,
  providerIds: readonly string[],
): BhashaBridgeSettings {
  const language = get('defaultLanguage');
  const provider = get('defaultProvider');
  return {
    defaultLanguage: typeof language === 'string' && LANGUAGES.includes(language) ? (language as TargetLanguage) : FALLBACK.defaultLanguage,
    defaultProvider: typeof provider === 'string' && providerIds.includes(provider) ? provider : FALLBACK.defaultProvider,
  };
}
