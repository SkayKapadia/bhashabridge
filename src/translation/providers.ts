import * as vscode from 'vscode';
import { getSarvamApiKey } from '../secrets/apiKeys';
import { TranslationError } from './errors';
import { SarvamAdapter } from './sarvamAdapter';
import type { TranslationProvider } from './translationProvider';
import { VscodeLmAdapter, type ChatModel } from './vscodeLmAdapter';

// Every provider the panel offers, in dropdown order. Adding a provider (Claude,
// Gemini, IndicTrans2) is one entry here plus its adapter class.
export const PROVIDER_OPTIONS: readonly { id: string; label: string }[] = [
  { id: 'sarvam', label: 'Sarvam AI' },
  { id: 'vscode-lm', label: 'VS Code model (Copilot)' },
];

export function createProviders(secrets: vscode.SecretStorage): ReadonlyMap<string, TranslationProvider> {
  return new Map<string, TranslationProvider>([
    ['sarvam', new SarvamAdapter({ getApiKey: () => getSarvamApiKey(secrets) })],
    ['vscode-lm', new VscodeLmAdapter({ selectModel: selectCopilotModel })],
  ]);
}

// The providers someone can use right now: the VS Code model only when one exists,
// so people without Copilot never see an option that cannot work.
export async function availableProviderOptions(): Promise<{ id: string; label: string }[]> {
  const hasModel = (await selectCopilotModel()) !== undefined;
  return PROVIDER_OPTIONS.filter(p => p.id !== 'vscode-lm' || hasModel);
}

async function selectCopilotModel(): Promise<ChatModel | undefined> {
  if (typeof vscode.lm?.selectChatModels !== 'function') {
    return undefined;
  }
  const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (!model) {
    return undefined;
  }
  return {
    async *send(prompt, signal) {
      const source = new vscode.CancellationTokenSource();
      const stop = () => source.cancel();
      signal.addEventListener('abort', stop);
      try {
        // The first request shows VS Code's own "allow access" prompt.
        const response = await model.sendRequest([vscode.LanguageModelChatMessage.User(prompt)], {}, source.token);
        yield* response.text;
      } catch (error) {
        if (error instanceof vscode.LanguageModelError) {
          throw new TranslationError('unavailable', `The VS Code language model refused the request: ${error.message}`);
        }
        throw error;
      } finally {
        signal.removeEventListener('abort', stop);
        source.dispose();
      }
    },
  };
}
