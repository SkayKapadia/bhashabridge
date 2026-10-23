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
  const sideBySide = /** @type {HTMLInputElement} */ (document.getElementById('side-by-side'));
  const report = /** @type {HTMLButtonElement} */ (document.getElementById('report'));
  const inputArea = /** @type {HTMLElement} */ (document.getElementById('input-area'));
  const inputSummary = /** @type {HTMLElement} */ (document.getElementById('input-summary'));
  const inputSummaryText = /** @type {HTMLElement} */ (document.getElementById('input-summary-text'));
  const editInput = /** @type {HTMLButtonElement} */ (document.getElementById('edit-input'));
  const newTranslation = /** @type {HTMLButtonElement} */ (document.getElementById('new-translation'));
  const emptyOutput = output.innerHTML;

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
  sideBySide.checked = Boolean(saved.sideBySide);
  showResult();
  if (saved.isCollapsed && input.value.trim()) {
    collapseInput();
  }

  const save = () =>
    vscode.setState({
      text: input.value,
      language: language.value,
      provider: provider.value,
      html: saved.html,
      blocks: saved.blocks,
      sideBySide: sideBySide.checked,
      isCollapsed: inputArea.hidden,
    });
  // Every HTML string below was sanitized by the extension host before it was sent.
  function showResult() {
    output.classList.toggle('pairs', sideBySide.checked);
    if (!saved.blocks) {
      if (saved.html) {
        output.innerHTML = saved.html;
      }
      return;
    }
    output.replaceChildren(
      ...saved.blocks.map(pair => {
        const row = document.createElement('div');
        row.className = 'pair';
        const english = document.createElement('div');
        english.className = 'english';
        english.innerHTML = pair.english;
        const translated = document.createElement('div');
        translated.className = 'translated';
        translated.innerHTML = pair.translated;
        if (sideBySide.checked) {
          if (pair.isCode) {
            // Code is identical in both languages: shown once, on the English side.
            translated.replaceChildren(Object.assign(document.createElement('p'), { className: 'code-note', textContent: 'Code: see the English' }));
          }
          row.append(english, translated);
        } else {
          // Learning mode: the English stays hidden until the paragraph is clicked.
          english.hidden = true;
          translated.tabIndex = 0;
          translated.title = 'Click to show the English';
          const reveal = event => {
            if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              english.hidden = !english.hidden;
            }
          };
          translated.addEventListener('click', reveal);
          translated.addEventListener('keydown', reveal);
          row.append(translated, english);
        }
        return row;
      }),
    );
  }

  sideBySide.addEventListener('change', () => {
    save();
    showResult();
  });

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

  // After a translation the pasted text folds into one line, so the translation sits
  // right under the controls. The text is kept: Edit brings it back, and Translate
  // still works on it (to switch language or provider).
  function collapseInput() {
    inputSummaryText.textContent = `Translated ${input.value.length.toLocaleString()} characters`;
    inputArea.hidden = true;
    inputSummary.hidden = false;
  }

  function expandInput() {
    inputArea.hidden = false;
    inputSummary.hidden = true;
    input.focus();
  }

  editInput.addEventListener('click', () => {
    expandInput();
    save();
  });

  // A clean start: empty box, no old translation.
  newTranslation.addEventListener('click', () => {
    input.value = '';
    saved.html = undefined;
    saved.blocks = undefined;
    output.classList.remove('pairs');
    output.innerHTML = emptyOutput;
    report.hidden = true;
    errorBox.hidden = true;
    status.textContent = '';
    expandInput();
    save();
  });

  setKey.addEventListener('click', () => vscode.postMessage({ type: 'setApiKey' }));
  report.addEventListener('click', () => vscode.postMessage({ type: 'report' }));
  getKey.addEventListener('click', () => vscode.postMessage({ type: 'openSignup' }));

  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'progress') {
      setBusy(true, message.total > 1 ? `Translating… ${message.done} of ${message.total} parts done` : 'Translating…');
    } else if (message.type === 'result') {
      setBusy(false, 'Done.');
      saved.html = message.html;
      saved.blocks = message.blocks;
      showResult();
      report.hidden = false;
      collapseInput();
      save();
    } else if (message.type === 'error') {
      setBusy(false, '');
      showError(message.message, message.code);
      if (inputArea.hidden) {
        expandInput(); // on failure the text stays in plain view, untouched
        save();
      }
    } else if (message.type === 'fill') {
      // Text sent by Translate Selection: show it and translate straight away.
      input.value = message.text;
      inputArea.hidden = false;
      inputSummary.hidden = true;
      save();
      button.click();
    } else if (message.type === 'providers') {
      // Rebuild the provider list, keeping the current choice when it is still offered.
      const chosen = provider.value;
      provider.replaceChildren(
        ...message.providers.map(p => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = p.label; // text, never HTML
          return option;
        }),
      );
      choose(provider, chosen);
      choose(provider, saved.provider || document.body.dataset.defaultProvider);
    } else if (message.type === 'defaults') {
      // The user changed a default in Settings: apply it now.
      choose(language, message.language);
      choose(provider, message.provider);
      save();
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
