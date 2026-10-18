import * as vscode from 'vscode';
import { parseMarkdown } from '../parser/markdownParser';
import { getSarvamApiKey } from '../secrets/apiKeys';
import { TranslationError } from './errors';
import { SarvamAdapter } from './sarvamAdapter';
import type { TargetLanguage } from './translationProvider';

// Temporary developer check: translates one sample through the real Sarvam API
// until the webview has a translate button.
const SAMPLE = 'The function fails because users is undefined. Add a check before calling map.\nconst names = users.map(getName);';

export async function testSarvamConnection(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    [
      { label: 'Gujarati', code: 'gu' as TargetLanguage },
      { label: 'Marathi', code: 'mr' as TargetLanguage },
    ],
    { title: 'Test Sarvam AI: translate a sample into' },
  );
  if (!picked) {
    return;
  }

  const adapter = new SarvamAdapter({ getApiKey: () => getSarvamApiKey(context.secrets) });
  const parsed = parseMarkdown(SAMPLE);

  try {
    const response = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Translating a sample into ${picked.label}…` },
      () => adapter.translate({ text: parsed.text, targetLanguage: picked.code }),
    );

    let restored = response.translatedText;
    for (const [token, code] of parsed.placeholders) {
      restored = restored.split(token).join(code);
    }

    output.appendLine(`--- Sarvam AI test (${picked.label}) ---`);
    output.appendLine('Input:');
    output.appendLine(SAMPLE);
    output.appendLine('');
    output.appendLine('Translation:');
    output.appendLine(restored);
    output.appendLine('');
    output.appendLine(`Tokens: ${response.tokenCount ?? 'unknown'}   Time: ${response.latencyMs ?? '?'} ms`);
    output.appendLine('');
    output.show(true);
    vscode.window.showInformationMessage('Sarvam AI works. The translation is in the BhashaBridge output panel.');
  } catch (error) {
    const message = error instanceof TranslationError ? error.message : 'The Sarvam AI test failed unexpectedly.';
    vscode.window.showErrorMessage(message);
  }
}
