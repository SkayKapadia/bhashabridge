import * as vscode from 'vscode';
import { openBhashaBridgePanel } from './webview/panel';

export function activate(context: vscode.ExtensionContext): void {
  const translateCommand = vscode.commands.registerCommand('bhashabridge.translate', () => {
    openBhashaBridgePanel();
  });

  context.subscriptions.push(translateCommand);
}

export function deactivate(): void {}
