import type { BhashaBridgeSettings } from '../settings/settings';

export interface PanelHtmlOptions {
  scriptUri: string;
  styleUri: string;
  cspSource: string;
  providers: readonly { id: string; label: string }[];
  defaults: BhashaBridgeSettings;
}

// The panel's page. Kept free of the VS Code API so it can be tested directly.
export function panelHtml(options: PanelHtmlOptions): string {
  const { defaults } = options;
  const providerOptions = options.providers
    .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
    .join('\n        ');

  // Only the extension's own script and stylesheet may load: no inline script, nothing remote.
  const csp = `default-src 'none'; script-src ${options.cspSource}; style-src ${options.cspSource};`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${escapeHtml(options.styleUri)}">
  <title>BhashaBridge</title>
</head>
<body data-default-language="${escapeHtml(defaults.defaultLanguage)}" data-default-provider="${escapeHtml(defaults.defaultProvider)}">
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
      <button id="get-key" type="button" hidden>Get a key</button>
    </div>

    <div class="output-header">
      <h2>Translation</h2>
      <label class="toggle"><input id="side-by-side" type="checkbox"> Side by side with English</label>
    </div>
    <p class="hint">Learning mode: click any translated paragraph to see its English.</p>
    <div id="output" class="output"><p class="placeholder">The translation will appear here. Code stays in English.</p></div>
  </main>
  <script src="${escapeHtml(options.scriptUri)}"></script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
}
