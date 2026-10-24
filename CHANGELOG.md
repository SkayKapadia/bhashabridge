# Changelog

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
