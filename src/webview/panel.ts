import * as vscode from 'vscode';
import { loadDefaultGlossary } from '../glossary/glossary';
import { createProviders, PROVIDER_OPTIONS } from '../translation/providers';
import { handleTranslate } from './controller';
import type { HostMessage, WebviewMessage } from './messages';

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

  panel.webview.html = getHtml(panel.webview, media);

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
    }
  });

  panel.onDidDispose(() => {
    running?.abort();
    current = undefined;
  });
}

function getHtml(webview: vscode.Webview, media: vscode.Uri): string {
  const script = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.js'));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.css'));

  const providerOptions = PROVIDER_OPTIONS.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`).join('\n        ');

  // Only the extension's own script and stylesheet may load: no inline script, nothing remote.
  const csp = `default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${style}">
  <title>BhashaBridge</title>
</head>
<body>
  <main>
    <h1>BhashaBridge</h1>

    <label for="input">Paste the LLM explanation (English)</label>
    <textarea id="input" rows="10" placeholder="Paste text from Copilot, ChatGPT or any other tool…"></textarea>

    <div class="row">
      <label for="language">Translate into</label>
      <select id="language">
        <option value="gu">Gujarati (ગુજરાતી)</option>
        <option value="mr">Marathi (मराठी)</option>
      </select>
      <label for="provider">using</label>
      <select id="provider">
        ${providerOptions}
      </select>
      <button id="translate" type="button">Translate</button>
    </div>

    <div id="status" role="status" aria-live="polite"></div>
    <div id="error" role="alert" hidden>
      <p id="error-message"></p>
      <button id="set-key" type="button" hidden>Set Sarvam API key</button>
    </div>

    <h2>Translation</h2>
    <div id="output" class="output"><p class="placeholder">The translation will appear here. Code stays in English.</p></div>
  </main>
  <script src="${script}"></script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}
