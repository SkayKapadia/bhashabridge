import { LANGUAGE_NAMES, type Glossary, type TargetLanguage } from './translationProvider';

// The instructions sent with every translation, shared by any provider that takes a prompt.
export function buildSystemPrompt(targetLanguage: TargetLanguage, glossary: Glossary = {}): string {
  const language = LANGUAGE_NAMES[targetLanguage];
  const lines = [
    `Translate the user's English text into ${language}.`,
    'Keep these in English exactly as written: programming keywords, variable names, function names, class names, library names, framework names, and technical terms.',
    'Translate only the surrounding explanation, grammar, and connecting words.',
    'Tokens like SKIP_001 stand for code. Copy every such token unchanged, exactly once, in the right place.',
    'Keep the markdown formatting and line breaks.',
    'Reply with the translation only: no notes, no quotes, no explanation.',
  ];

  const entries = Object.entries(glossary);
  if (entries.length > 0) {
    lines.push('', 'Glossary (English term -> what to write):');
    for (const [term, rendering] of entries) {
      lines.push(`- ${term} -> ${rendering}`);
    }
  }

  return lines.join('\n');
}
