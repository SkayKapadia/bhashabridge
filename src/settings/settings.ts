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

// The glossary domains in use (Settings > BhashaBridge > Glossary Domains). Unknown ids
// are dropped; with no valid setting, the domains marked as default are used.
export function readGlossaryDomains(
  get: (key: string) => unknown,
  domains: readonly { id: string; isDefault: boolean }[],
): string[] {
  const value = get('glossaryDomains');
  const known = new Set(domains.map(d => d.id));
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === 'string' && known.has(id));
  }
  return domains.filter(d => d.isDefault).map(d => d.id);
}

