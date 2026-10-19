import * as vscode from 'vscode';
import { openBhashaBridgePanel } from '../webview/panel';
import { readText, type TextSource } from './readText';

export async function translateSelection(context: vscode.ExtensionContext, args?: { source?: TextSource }): Promise<void> {
  const text = await readText(args?.source, {
    editorSelection: () => {
      const editor = vscode.window.activeTextEditor;
      return editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : undefined;
    },
    copyTerminalSelection: async () => {
      await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    },
    clipboard: () => vscode.env.clipboard.readText(),
  });

  if (!text.trim()) {
    vscode.window.showInformationMessage('Select some text, or copy an LLM answer, then run BhashaBridge: Translate Selection.');
    return;
  }
  openBhashaBridgePanel(context, text);
}
