import * as vscode from 'vscode';
import { glossaryOptions } from '../glossary/glossary';
import { currentGlossary, currentSettings } from '../settings/current';
import { TranslationError } from '../translation/errors';
import { createProviders } from '../translation/providers';
import { translateMarkdown } from '../translation/translateMarkdown';
import { LANGUAGE_NAMES } from '../translation/translationProvider';
import { ChatModelError, englishAnswerPrompt, runChat } from './chatHandler';

// @bhashabridge in VS Code's Chat view. The Chat view comes from a chat extension such
// as GitHub Copilot; without one there is nowhere to show it, and nothing is registered.
export function registerChatParticipant(context: vscode.ExtensionContext): void {
  if (typeof vscode.chat?.createChatParticipant !== 'function') {
    return;
  }

  const providers = createProviders(context);

  const participant = vscode.chat.createChatParticipant('bhashabridge.chat', async (request, _chatContext, stream, token) => {
    const controller = new AbortController();
    const cancel = token.onCancellationRequested(() => controller.abort());
    const settings = currentSettings();

    try {
      await runChat(
        request.command,
        request.prompt,
        {
          languageName: LANGUAGE_NAMES[settings.defaultLanguage],
          // The English answer comes from the chat's model; the translation from the
          // Default Provider setting, so a Sarvam user translates with their own key.
          answerInEnglish: question => answerWithChatModel(question, token),
          translate: async markdown => {
            const provider = providers.get(settings.defaultProvider);
            if (!provider) {
              throw new TranslationError('api', 'The default provider in Settings > BhashaBridge is not available.');
            }
            return translateMarkdown(markdown, {
              provider,
              targetLanguage: settings.defaultLanguage,
              ...glossaryOptions(await currentGlossary(context), settings.defaultLanguage),
              signal: controller.signal,
            });
          },
        },
        {
          progress: text => stream.progress(text),
          markdown: text => stream.markdown(text),
          button: (command, title) => stream.button({ command, title }),
        },
      );
    } finally {
      cancel.dispose();
    }
  });

  context.subscriptions.push(participant);
}

async function answerWithChatModel(question: string, token: vscode.CancellationToken): Promise<string> {
  const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (!model) {
    throw new ChatModelError('No chat model is available. Sign in to GitHub Copilot, or use /translate with text you already have.');
  }
  try {
    const response = await model.sendRequest([vscode.LanguageModelChatMessage.User(englishAnswerPrompt(question))], {}, token);
    let text = '';
    for await (const part of response.text) {
      text += part;
    }
    return text;
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      throw new ChatModelError(`The chat model could not answer: ${error.message}`);
    }
    throw error;
  }
}
