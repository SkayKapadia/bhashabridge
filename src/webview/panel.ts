import * as vscode from 'vscode';
import { loadDefaultGlossary } from '../glossary/glossary';
import { readSettings, SETTINGS_SECTION } from '../settings/settings';
import { createProviders, PROVIDER_OPTIONS } from '../translation/providers';
import { handleTranslate } from './controller';
import type { HostMessage, WebviewMessage } from './messages';
import { panelHtml } from './panelHtml';

const SIGNUP_URL = 'https://dashboard.sarvam.ai';
const PROVIDER_IDS = PROVIDER_OPTIONS.map(p => p.id);

let current: vscode.WebviewPanel | undefined;

export function openBhashaBridgePanel(context: vscode.ExtensionContext): void {
  if (current) {
    current.reveal();
    return;
  }

  const media = vscode.Uri.joinPath(context.extensionUri, 'media');
  const panel = vscode.window.createWebviewPanel('bhashabridge', 'BhashaBridge', vscode.ViewColumn.One, {
    enableScripts: true,
    localResourceRoots: [media],
    retainContextWhenHidden: true, // keep the pasted text when the tab is hidden
  });
  current = panel;

  panel.webview.html = panelHtml({
    scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.js')).toString(),
    styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.css')).toString(),
    cspSource: panel.webview.cspSource,
    providers: PROVIDER_OPTIONS,
    defaults: currentSettings(),
  });

  const providers = createProviders(context.secrets);
  const glossary = loadDefaultGlossary(context.extensionPath);
  glossary.catch(() => undefined); // a load failure is reported on the first translate, not left unhandled
  let running: AbortController | undefined;

  panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
    if (message?.type === 'translate') {
      running?.abort(); // a new request replaces one still running
      const controller = new AbortController();
      running = controller;
      const post = (reply: HostMessage) => void panel.webview.postMessage(reply);
      glossary.then(
        loaded => handleTranslate(message, providers, post, controller.signal, loaded),
        (error: Error) => post({ type: 'error', message: error.message, code: 'unknown' }),
      );
    } else if (message?.type === 'setApiKey') {
      void vscode.commands.executeCommand('bhashabridge.setSarvamApiKey');
    } else if (message?.type === 'openSignup') {
      void vscode.env.openExternal(vscode.Uri.parse(SIGNUP_URL));
    }
  });

  // A changed default reaches an open panel straight away.
  const settingsListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration(SETTINGS_SECTION)) {
      const settings = currentSettings();
      void panel.webview.postMessage({
        type: 'defaults',
        language: settings.defaultLanguage,
        provider: settings.defaultProvider,
      } satisfies HostMessage);
    }
  });

  panel.onDidDispose(() => {
    running?.abort();
    settingsListener.dispose();
    current = undefined;
  });
}

function currentSettings() {
  const config = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  return readSettings(key => config.get(key), PROVIDER_IDS);
}
