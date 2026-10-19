// @ts-check
// Runs inside the webview. Talks to the extension host only through postMessage.
(function () {
  // @ts-ignore acquireVsCodeApi is provided by VS Code inside webviews
  const vscode = acquireVsCodeApi();

  const input = /** @type {HTMLTextAreaElement} */ (document.getElementById('input'));
  const language = /** @type {HTMLSelectElement} */ (document.getElementById('language'));
  const provider = /** @type {HTMLSelectElement} */ (document.getElementById('provider'));
  const button = /** @type {HTMLButtonElement} */ (document.getElementById('translate'));
  const status = /** @type {HTMLElement} */ (document.getElementById('status'));
  const errorBox = /** @type {HTMLElement} */ (document.getElementById('error'));
  const errorMessage = /** @type {HTMLElement} */ (document.getElementById('error-message'));
  const setKey = /** @type {HTMLButtonElement} */ (document.getElementById('set-key'));
  const getKey = /** @type {HTMLButtonElement} */ (document.getElementById('get-key'));
  const output = /** @type {HTMLElement} */ (document.getElementById('output'));

  // Picks an option only if the list has it, so a stale value never empties a dropdown.
  function choose(select, value) {
    if (value && [...select.options].some(o => o.value === value)) {
      select.value = value;
    }
  }

  // Restore what was there before the panel was reloaded; otherwise start from the
  // defaults in Settings > BhashaBridge.
  const saved = vscode.getState() || {};
  input.value = saved.text || '';
  choose(language, saved.language || document.body.dataset.defaultLanguage);
  choose(provider, saved.provider || document.body.dataset.defaultProvider);
  if (saved.html) {
    output.innerHTML = saved.html; // sanitized by the extension host before it was sent
  }

  const save = () =>
    vscode.setState({ text: input.value, language: language.value, provider: provider.value, html: saved.html });
  input.addEventListener('input', save);
  language.addEventListener('change', save);
  provider.addEventListener('change', save);

  function setBusy(isBusy, text) {
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Translating…' : 'Translate';
    status.textContent = text || '';
  }

  function showError(message, code) {
    errorMessage.textContent = message; // text, never HTML
    setKey.hidden = getKey.hidden = code !== 'missing-key' && code !== 'invalid-key';
    errorBox.hidden = false;
  }

  button.addEventListener('click', () => {
    errorBox.hidden = true;
    if (!input.value.trim()) {
      showError('Paste some text to translate first.', 'input');
      return;
    }
    setBusy(true, 'Translating…');
    vscode.postMessage({ type: 'translate', text: input.value, language: language.value, provider: provider.value });
  });

  setKey.addEventListener('click', () => vscode.postMessage({ type: 'setApiKey' }));
  getKey.addEventListener('click', () => vscode.postMessage({ type: 'openSignup' }));

  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'progress') {
      setBusy(true, message.total > 1 ? `Translating… ${message.done} of ${message.total} parts done` : 'Translating…');
    } else if (message.type === 'result') {
      setBusy(false, 'Done.');
      output.innerHTML = message.html; // sanitized by the extension host
      saved.html = message.html;
      save();
    } else if (message.type === 'error') {
      setBusy(false, '');
      showError(message.message, message.code);
    } else if (message.type === 'fill') {
      // Text sent by Translate Selection: show it and translate straight away.
      input.value = message.text;
      save();
      button.click();
    } else if (message.type === 'defaults') {
      // The user changed a default in Settings: apply it now.
      choose(language, message.language);
      choose(provider, message.provider);
      save();
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
