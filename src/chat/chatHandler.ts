import { ReassemblyError } from '../reassembly/reassemble';
import { TranslationError } from '../translation/errors';

// What @bhashabridge does with one chat message. Kept free of the VS Code API so it
// can be tested directly; participant.ts connects it to the Chat view.

export interface ChatOutput {
  progress(text: string): void;
  markdown(text: string): void;
  button(command: string, title: string): void;
}

export interface ChatDeps {
  languageName: string;
  // Asks the chat's model for an answer in English, with code in code blocks.
  answerInEnglish: (question: string) => Promise<string>;
  // The usual pipeline: code and glossary terms protected, then translated.
  translate: (markdown: string) => Promise<string>;
}

// Thrown by answerInEnglish when no model can answer, with a message for the person.
export class ChatModelError extends Error {}

export async function runChat(command: string | undefined, prompt: string, deps: ChatDeps, out: ChatOutput): Promise<void> {
  if (!prompt.trim()) {
    out.markdown(
      command === 'translate'
        ? 'Paste the text to translate after `/translate`.'
        : `Ask a coding question and I will answer in ${deps.languageName}, with code kept in English. Or use \`/translate\` with text you already have.`,
    );
    return;
  }

  try {
    let english = prompt;
    if (command !== 'translate') {
      out.progress('Writing the answer in English…');
      english = await deps.answerInEnglish(prompt);
    }
    out.progress(`Translating into ${deps.languageName}…`);
    out.markdown(await deps.translate(english));
  } catch (error) {
    if (error instanceof TranslationError || error instanceof ReassemblyError || error instanceof ChatModelError) {
      out.markdown(`**BhashaBridge could not finish:** ${error.message}`);
      if (error instanceof TranslationError && (error.code === 'missing-key' || error.code === 'invalid-key')) {
        out.button('bhashabridge.setSarvamApiKey', 'Set Sarvam API key');
      }
      return;
    }
    throw error;
  }
}

// Asks for markdown with code fenced and identifiers in backticks: exactly what the
// parser protects, so the translation cannot touch them.
export function englishAnswerPrompt(question: string): string {
  return [
    'Answer this developer question in English, in markdown.',
    'Put all code in fenced code blocks, and wrap every identifier, file name and command in backticks.',
    'Keep the explanation clear and short.',
    '',
    question,
  ].join('\n');
}
