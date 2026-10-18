import type * as vscode from 'vscode';

// API keys live in VS Code's SecretStorage (the OS keychain), never in settings files.
const SARVAM_KEY = 'bhashabridge.sarvamApiKey';

export function getSarvamApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
  return Promise.resolve(secrets.get(SARVAM_KEY));
}

export async function setSarvamApiKey(secrets: vscode.SecretStorage, key: string): Promise<void> {
  await secrets.store(SARVAM_KEY, key.trim());
}
