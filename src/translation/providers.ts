import type * as vscode from 'vscode';
import { getSarvamApiKey } from '../secrets/apiKeys';
import { SarvamAdapter } from './sarvamAdapter';
import type { TranslationProvider } from './translationProvider';

// Every provider the panel offers, in dropdown order. Adding a provider (Claude,
// Gemini, IndicTrans2) is one entry here plus its adapter class.
export const PROVIDER_OPTIONS: readonly { id: string; label: string }[] = [{ id: 'sarvam', label: 'Sarvam AI' }];

export function createProviders(secrets: vscode.SecretStorage): ReadonlyMap<string, TranslationProvider> {
  return new Map<string, TranslationProvider>([
    ['sarvam', new SarvamAdapter({ getApiKey: () => getSarvamApiKey(secrets) })],
  ]);
}
