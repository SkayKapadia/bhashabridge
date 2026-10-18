import * as vscode from 'vscode';
import { setSarvamApiKey } from './secrets/apiKeys';
import { testSarvamConnection } from './translation/testSarvamCommand';
import { openBhashaBridgePanel } from './webview/panel';

export function activate(context: vscode.ExtensionContext): void {
  const translateCommand = vscode.commands.registerCommand('bhashabridge.translate', () => {
    openBhashaBridgePanel();
  });

  const setKeyCommand = vscode.commands.registerCommand('bhashabridge.setSarvamApiKey', async () => {
    const key = await vscode.window.showInputBox({
      title: 'Sarvam AI API key',
      prompt: 'Stored securely in your system keychain. Get a key at dashboard.sarvam.ai.',
      password: true,
      ignoreFocusOut: true,
    });
    if (key?.trim()) {
      await setSarvamApiKey(context.secrets, key);
      vscode.window.showInformationMessage('Sarvam AI API key saved.');
    }
  });

  const output = vscode.window.createOutputChannel('BhashaBridge');
  const testCommand = vscode.commands.registerCommand('bhashabridge.testSarvamConnection', () =>
    testSarvamConnection(context, output),
  );

  context.subscriptions.push(translateCommand, setKeyCommand, testCommand, output);
}

export function deactivate(): void {}
