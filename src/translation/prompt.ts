import { languageInfo } from '../languages';
import { LANGUAGE_NAMES, type Glossary, type TargetLanguage } from './translationProvider';

// Marker lines that separate the parts of a joined chunk (see src/chunking/chunker.ts).
export const PART_MARKER = /^[ \t]*<<<\d+>>>[ \t]*$/m;

// The instructions sent with every translation, shared by any provider that takes a prompt.
// The marker rule is added only when the text has markers: told about them for a single
// paragraph, Sarvam made some up, and they showed in the translation.
export function buildSystemPrompt(targetLanguage: TargetLanguage, glossary: Glossary = {}, text = ''): string {
  const language = LANGUAGE_NAMES[targetLanguage];
  const lines = [
    `Translate the user's English text into ${language}.`,
    'Keep these in English exactly as written: programming keywords, variable names, function names, class names, library names, framework names, and technical terms.',
    'Translate only the surrounding explanation, grammar, and connecting words.',
    `When a word stays in English, write it in English letters exactly as in the source. Never spell an English word in ${languageInfo(targetLanguage).script} script: either translate it or keep it in English letters.`,
    'Tokens like SKIP_001 stand for code. Copy every such token unchanged, exactly once, in the right place.',
    'Keep the markdown formatting and line breaks.',
    ...(PART_MARKER.test(text)
      ? ['Lines like <<<1>>> separate parts of the text. Copy each one exactly, on its own line, and translate each part on its own.']
      : []),
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
