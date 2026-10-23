# BhashaBridge preview: testing guide

Thank you for trying BhashaBridge before its public release. It translates AI coding explanations into **Gujarati** or **Marathi** while keeping all code and technical terms in English. This is preview `0.1.0-preview.1`; things may break, and your feedback decides what gets fixed first.

## 1. Install (2 minutes)

1. Save the file `bhashabridge-0.1.0-preview.1.vsix` you received.
2. In VS Code (1.90 or newer), open the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the **…** menu at the top of the view → **Install from VSIX…** → pick the file.

To update later, install the new file the same way. To remove it, uninstall **BhashaBridge** from the Extensions view.

## 2. Choose a translator

You need **one** of these:

- **Sarvam AI** (default): sign up at [dashboard.sarvam.ai](https://dashboard.sarvam.ai), create an API key, then run **BhashaBridge: Set Sarvam API Key** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and paste it. The key is stored in your computer's keychain. Use **your own** key; a typical answer costs well under ₹1.
- **GitHub Copilot**: if you have Copilot, pick **VS Code model (Copilot)** in the panel's provider list. No key needed; VS Code asks once for permission.

## 3. Try it (10 minutes)

Copy this sample, including the backticks:

````markdown
The error `TypeError: Cannot read properties of undefined (reading 'map')` happens because `users` is undefined when the component first renders.

To fix it, give `users` a default value and check it before calling `map`:

```js
const [users, setUsers] = useState([]);
```

Keep the dependency array empty so the request runs only once.
````

Then try each of these and note anything odd:

- [ ] **Shortcut:** with the sample copied, press **Ctrl+Alt+Shift+T** (Mac: **Cmd+Alt+Shift+T**). The panel opens and translates.
- [ ] **Panel:** run **BhashaBridge: Translate LLM Output**, paste, pick Gujarati, click **Translate**. Then switch to Marathi and translate again.
- [ ] **Code stays exact:** the code block and everything in backticks are unchanged.
- [ ] **Learning mode:** click a translated paragraph to see its English; tick **Side by side with English**.
- [ ] **Edit / New translation:** after translating, the input folds into one line. Try both links.
- [ ] **Your own AI answers:** translate 2 or 3 real explanations from the AI tool you use.
- [ ] **Copilot users:** type `@bhashabridge why does this crash?` in the Chat view.
- [ ] **Settings:** open Settings, search "BhashaBridge", and change the default language.

## 4. Tell us what you found

The most useful feedback:

- **Did the Gujarati or Marathi read naturally?** Score 1 (unusable) to 5 (reads like a native speaker wrote it).
- **Was any technical word translated that should have stayed English,** or the other way round?
- **Did anything break?** The exact error message helps (never send your API key).
- **What was confusing** the first time you used it?

Send your notes to the person who shared this file with you. If you have access to the GitHub repository, the **Report translation** button under each translation opens a pre-filled issue.
