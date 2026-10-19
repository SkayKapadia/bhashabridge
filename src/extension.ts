import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/participant';
import { deleteSarvamApiKey, setSarvamApiKey } from './secrets/apiKeys';
import type { TextSource } from './selection/readText';
import { translateSelection } from './selection/translateSelection';
import { chooseGlossaryDomains } from './settings/chooseDomains';
import { translationCache } from './translation/providers';
import { testSarvamConnection } from './translation/testSarvamCommand';
import { openBhashaBridgePanel } from './webview/panel';

export function activate(context: vscode.ExtensionContext): void {
  const translateCommand = vscode.commands.registerCommand('bhashabridge.translate', () => {
    openBhashaBridgePanel(context);
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

  const clearKeyCommand = vscode.commands.registerCommand('bhashabridge.clearSarvamApiKey', async () => {
    await deleteSarvamApiKey(context.secrets);
    vscode.window.showInformationMessage('Sarvam AI API key removed from this computer.');
  });

  const selectionCommand = vscode.commands.registerCommand('bhashabridge.translateSelection', (args?: { source?: TextSource }) =>
    translateSelection(context, args),
  );

  const domainsCommand = vscode.commands.registerCommand('bhashabridge.chooseGlossaryDomains', () =>
    chooseGlossaryDomains(context),
  );

  const clearCacheCommand = vscode.commands.registerCommand('bhashabridge.clearTranslationCache', async () => {
    const removed = await translationCache(context).clear();
    vscode.window.showInformationMessage(`Removed ${removed} saved translation${removed === 1 ? '' : 's'} from this computer.`);
  });

  const output = vscode.window.createOutputChannel('BhashaBridge');
  const testCommand = vscode.commands.registerCommand('bhashabridge.testSarvamConnection', () =>
    testSarvamConnection(context, output),
  );

  registerChatParticipant(context);

  context.subscriptions.push(translateCommand, selectionCommand, setKeyCommand, clearKeyCommand, domainsCommand, clearCacheCommand, testCommand, output);
}

export function deactivate(): void {}
