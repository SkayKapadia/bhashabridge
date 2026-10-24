// The languages BhashaBridge translates into. This list is the one place a language is
// added: the dropdown, settings, prompt and checks all read it. To add one, follow
// docs/ADDING_A_LANGUAGE.md (package.json and glossary renderings need it too).

export interface Language {
  // Short code used in settings, glossary files and messages: 'gu'.
  code: string;
  // English name, used in the prompt and the interface: 'Gujarati'.
  name: string;
  // The language's own name, shown in the dropdown: 'ગુજરાતી'.
  nativeName: string;
  // Its writing system, named in the prompt: 'Gujarati'.
  script: string;
}

export const LANGUAGES = [
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
] as const satisfies readonly Language[];

export type TargetLanguage = (typeof LANGUAGES)[number]['code'];

export const LANGUAGE_CODES: readonly string[] = LANGUAGES.map(language => language.code);

export function isTargetLanguage(code: unknown): code is TargetLanguage {
  return typeof code === 'string' && LANGUAGE_CODES.includes(code);
}

export function languageInfo(code: TargetLanguage): Language {
  return LANGUAGES.find(language => language.code === code)!;
}
