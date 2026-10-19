import * as vscode from 'vscode';
import { currentGlossary, currentSettings } from '../settings/current';
import { SETTINGS_SECTION } from '../settings/settings';
import { availableProviderOptions, createProviders, PROVIDER_OPTIONS } from '../translation/providers';
import { buildIssueUrl } from '../feedback/issueUrl';
import { LANGUAGE_NAMES, type TargetLanguage } from '../translation/translationProvider';
import { handleTranslate } from './controller';
import type { HostMessage, WebviewMessage } from './messages';
import { panelHtml } from './panelHtml';

const SIGNUP_URL = 'https://dashboard.sarvam.ai';

let current: { panel: vscode.WebviewPanel; isReady: boolean; pendingText?: string } | undefined;

// Opens the panel, or brings it forward. With `text`, fills the input and translates it.
export function openBhashaBridgePanel(context: vscode.ExtensionContext, text?: string): void {
  if (current) {
    current.panel.reveal();
    if (text !== undefined) {
      fill(text);
    }
    return;
  }

  const media = vscode.Uri.joinPath(context.extensionUri, 'media');
  const panel = vscode.window.createWebviewPanel('bhashabridge', 'BhashaBridge', vscode.ViewColumn.One, {
    enableScripts: true,
    localResourceRoots: [media],
    retainContextWhenHidden: true, // keep the pasted text when the tab is hidden
  });
  current = { panel, isReady: false, pendingText: text };

  panel.webview.html = panelHtml({
    scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.js')).toString(),
    styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.css')).toString(),
    cspSource: panel.webview.cspSource,
    providers: PROVIDER_OPTIONS.filter(p => p.id === 'sarvam'), // the rest once known to be available
    defaults: currentSettings(),
  });

  const providers = createProviders(context);
  let running: AbortController | undefined;
  // The last finished translation, for the Report translation button.
  let lastResult: { english: string; translated: string; language: string; provider: string } | undefined;

  panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
    if (message?.type === 'translate') {
      running?.abort(); // a new request replaces one still running
      const controller = new AbortController();
      running = controller;
      const post = (reply: HostMessage) => {
        if (reply.type === 'result') {
          lastResult = { english: message.text, translated: reply.markdown, language: message.language, provider: message.provider };
        }
        void panel.webview.postMessage(reply);
      };
      currentGlossary(context).then(
        glossary => handleTranslate(message, providers, post, controller.signal, glossary),
        (error: Error) => post({ type: 'error', message: error.message, code: 'unknown' }),
      );
    } else if (message?.type === 'setApiKey') {
      void vscode.commands.executeCommand('bhashabridge.setSarvamApiKey');
    } else if (message?.type === 'report' && lastResult) {
      const packageJson = context.extension.packageJSON as { version: string; bugs: { url: string } };
      void vscode.env.openExternal(
        vscode.Uri.parse(
          buildIssueUrl({
            issuesUrl: packageJson.bugs.url,
            language: LANGUAGE_NAMES[lastResult.language as TargetLanguage] ?? lastResult.language,
            provider: PROVIDER_OPTIONS.find(p => p.id === lastResult?.provider)?.label ?? lastResult.provider,
            version: packageJson.version,
            english: lastResult.english,
            translated: lastResult.translated,
          }),
          true, // already encoded
        ),
      );
    } else if (message?.type === 'openSignup') {
      void vscode.env.openExternal(vscode.Uri.parse(SIGNUP_URL));
    } else if (message?.type === 'ready' && current?.panel === panel) {
      // A message posted before the page's script runs would be lost, so text waits for this.
      current.isReady = true;
      sendProviders();
      if (current.pendingText !== undefined) {
        fill(current.pendingText);
      }
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

  const sendProviders = () =>
    void availableProviderOptions().then(
      providers => panel.webview.postMessage({ type: 'providers', providers } satisfies HostMessage),
      () => undefined, // keep the list the page has
    );
  const modelsListener = typeof vscode.lm?.onDidChangeChatModels === 'function' ? vscode.lm.onDidChangeChatModels(sendProviders) : undefined;

  panel.onDidDispose(() => {
    modelsListener?.dispose();
    running?.abort();
    settingsListener.dispose();
    current = undefined;
  });
}

function fill(text: string): void {
  if (!current) {
    return;
  }
  if (current.isReady) {
    current.pendingText = undefined;
    void current.panel.webview.postMessage({ type: 'fill', text } satisfies HostMessage);
  } else {
    current.pendingText = text;
  }
}

