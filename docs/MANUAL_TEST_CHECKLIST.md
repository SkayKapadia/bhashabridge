# Manual test checklist

Run this before each release, on the packaged `.vsix` installed in a normal VS Code window (Extensions → **…** → **Install from VSIX…**). The automatic tests cover the logic; this list covers what only a person can click and see. Tick each box; anything that fails goes into an issue before publishing.

## Setup

- [ ] The extension installs, and its icon and name show in the Extensions view.
- [ ] **BhashaBridge: Set Sarvam API Key** accepts a key in a hidden box; **Clear Sarvam API Key** removes it.
- [ ] With no key, translating shows a clear message with **Set Sarvam API key** and **Get a key** buttons; **Get a key** opens dashboard.sarvam.ai.

## Panel

- [ ] **BhashaBridge: Translate LLM Output** opens the panel.
- [ ] Paste an AI answer with a code block and inline code, click **Translate**: progress shows, then the translation.
- [ ] Code blocks, inline code and code lines are exactly as pasted.
- [ ] After translating, the input folds into one line; **Edit** opens it again; **New translation** clears everything.
- [ ] Translating the same text again is instant (local cache).
- [ ] Text shorter than 10 characters shows "Paste at least 10 characters".

## Layout

- [ ] A markdown table stays a table; each cell is translated.
- [ ] A table copied from a web page (tab-separated) becomes a table.
- [ ] Line breaks in plain pasted text are kept.
- [ ] Bullet lists and task lists keep their shape.

## Learning mode

- [ ] Clicking a translated paragraph shows its English below it; clicking again hides it.
- [ ] **Side by side with English**: English on the left; on the right only translated text, and code blocks show "Code: see the English".

## Other ways in

- [ ] Select text in the editor, press **Ctrl+Alt+Shift+T** (Cmd on Mac): the panel opens and translates it.
- [ ] Select text in the terminal and press the shortcut: same.
- [ ] Copy text elsewhere (a browser, the Chat view), press the shortcut with nothing selected: the clipboard text is translated.
- [ ] Right-click a selection in the editor: **BhashaBridge: Translate Selection** is in the menu.
- [ ] With GitHub Copilot: `@bhashabridge why does this crash?` in the Chat view answers in Gujarati; `@bhashabridge /translate <text>` translates.
- [ ] With GitHub Copilot: **VS Code model (Copilot)** appears in the provider list and translates.

## Settings and glossary

- [ ] Settings → BhashaBridge: Default Language and Default Provider are listed and apply to a newly opened panel.
- [ ] **BhashaBridge: Choose Glossary Domains** shows software and business domains; turning on Finance and translating "Check the ledger" shows "ledger (ખાતાવહી)".
- [ ] **BhashaBridge: Create Workspace Glossary** creates `.bhashabridge/glossary.json` and opens it; a term added to its `keep` list stays in English.

## Feedback

- [ ] **Report translation** under a result opens a pre-filled GitHub issue in the browser; nothing is sent until you submit.

## Quality

- [ ] `npm run quality -- --lang gu` report reviewed by a native speaker; average score noted in the release notes.
