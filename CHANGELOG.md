# Changelog

## Unreleased

- Text copied out of a chat window translates as whole sentences again: a file link that landed on a line of its own (`agent.py:L72`) is joined back into its sentence.
- Code copied without its fences is shown as code: a language name above code (`python`) becomes a code block, and names like `__init__` no longer show in bold.
- Part markers such as `<<<1>>>` no longer show up in a translation. They appeared when table cells were translated one at a time.
- List labels such as `A.`, `b)` and `(c)` stay exactly as written instead of being spelled in Gujarati (`બી.`).
- About 50 machine learning terms (episode, checkpoint, target network, weights, DQN, MLP, replay buffer and more) now stay in English.

## 0.1.1 (preview)

- New Marketplace title, "BhashaBridge: AI Explanations in Indian Languages", ready for more languages. Gujarati is the language available today; others can be added by contributors (see the guide on adding a language).

## 0.1.0 (preview)

The first public release of BhashaBridge: read AI coding explanations in Gujarati, with code and technical terms kept exactly as they are.

### Translate

- Translate any AI explanation into Gujarati from a panel, with **Ctrl+Alt+Shift+T** (Cmd+Alt+Shift+T on Mac) on a selection, the terminal or the clipboard, or by asking `@bhashabridge` in the Chat view.
- Two translators: Sarvam AI with your own key, or your GitHub Copilot model with no extra key.

### Code stays exact

- Code blocks, inline code, code lines pasted without backticks, settings such as `"reviewed": false`, web addresses and code-shaped words (paths, file names, `camelCase`, `snake_case`, CSS classes, acronyms) are hidden before translation and put back character for character.
- Names used in the answer's own code are kept in English in its sentences too.
- Every reply is checked: if any code would be lost or changed, you get a clear error instead of broken output.

### Words and layout

- A glossary of about 1,450 technical terms in 32 domains keeps the words you search for in English. Software development domains are on by default; 17 business domains (finance, healthcare, supply chain and more) can be turned on. Reviewed Gujarati meanings are added after a term's first use.
- A project can add its own terms in `.bhashabridge/glossary.json`.
- Tables, lists, line breaks and pasted plain text keep their original layout.

### Learn as you read

- Click any translated paragraph to see its English, or read both side by side.

### Private and light

- Your code never leaves your computer: only the explanation, with code hidden, is sent to the translator you choose.
- Your API key is kept in your system keychain. No telemetry.
- Repeated translations come from a local cache, at no cost.
