# Adding a language to BhashaBridge

BhashaBridge translates into Gujarati today, and is built so that any Indian language can be added by its own speakers. This guide walks through adding one, using **Marathi** as the example. Replace the Marathi details with your language's.

Most of the work is not code: it is checking that translations read naturally. The code part is a few small changes, and the tests tell you if one is missing.

## Before you start

- **You, or someone helping you, should be a native speaker.** You will judge translation quality and review glossary meanings.
- **Check the translation providers support your language.** Sarvam AI supports 22 Indian languages, including Marathi (`mr-IN`); see its [language list](https://docs.sarvam.ai/api-reference/text/translate-text). The VS Code model (Copilot) handles most major languages.
- **Open an issue first,** for example "Add Marathi", so others know you are working on it and can help.
- **Set up the project:** see [CONTRIBUTING.md](../CONTRIBUTING.md#set-up).

## The changes, at a glance

| Step | File | What you add | Checked by |
|---|---|---|---|
| 1 | `src/languages.ts` | One entry: code, names, script | `test/unit/languages.test.ts` |
| 2 | `package.json` | The code and name in the language setting | `test/unit/languages.test.ts` |
| 3 | `src/chunking/chunker.ts` | Your script's full stop, only if it is not `.` `?` `!` or `।` | Your new test |
| 4 | `glossary/domains/*.json` | Renderings in your language (optional to start) | `test/unit/glossary.test.ts` |
| 5 | Tests and docs | A few lines | `npm run test:unit` |
| 6 | Quality report | Real translations, scored by a native speaker | You |

## Step 1: Register the language

Open `src/languages.ts` and add one entry to `LANGUAGES`:

```ts
export const LANGUAGES = [
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
] as const satisfies readonly Language[];
```

- **`code`:** the two-letter ISO 639-1 code (`mr`, `hi`, `ta`, `te`, `kn`, `bn`, `pa`, `ml`, `or`). Use the three-letter code only if there is no two-letter one.
- **`name`:** the English name. It appears in the prompt ("Translate … into Marathi") and the interface.
- **`nativeName`:** the language's own name, shown in the dropdown as "Marathi (मराठी)".
- **`script`:** the writing system's name (`Devanagari`, `Tamil`, `Bengali`…). The prompt tells the model never to spell English words in this script.

That one entry adds the language to the panel's dropdown, the settings check, the prompt, the chat, the quality report and the glossary checks.

## Step 2: Add it to the settings

In `package.json`, find `bhashabridge.defaultLanguage` and add your code and name, in the same order as in `src/languages.ts`:

```json
"bhashabridge.defaultLanguage": {
  "type": "string",
  "enum": ["gu", "mr"],
  "enumItemLabels": ["Gujarati", "Marathi"],
  "default": "gu",
  ...
}
```

A test fails if this list and `src/languages.ts` disagree.

## Step 3: Check where sentences end

Long paragraphs are split at sentence ends (`src/chunking/chunker.ts`). It already knows `.` `?` `!` and the danda `।`, which covers Marathi, Hindi, Gujarati and most other Indian scripts.

If your language ends sentences with another mark, such as `۔` in Urdu, add it to the pattern in `splitSentences` and add a test in `test/unit/chunker.test.ts`, like the existing danda test:

```ts
expect(splitSentences('پہلا جملہ۔ دوسرا جملہ۔', 15).map(p => p.text)).toEqual(['پہلا جملہ۔', 'دوسرا جملہ۔']);
```

## Step 4: Glossary meanings in your language (optional to start)

The glossary in `glossary/domains/` keeps technical terms in English, for every language, with no extra work. Some entries also carry a **meaning** in a language (`annotate`, shown as "ledger (ખાતાવહી)"), or a **set translation** (`translate`).

To add your language to an entry, add a field named by its code next to the existing ones:

```json
"ledger": { "gu": "ખાતાવહી", "mr": "खातेवही", "reviewed": ["gu"] }
```

- **`reviewed` is per language.** `["gu"]` means only the Gujarati text has been checked; the Marathi one waits. BhashaBridge only shows a rendering whose language is in the list (or `"reviewed": true` for all). Until then the term stays in English for that language, which is always safe.
- **Do not mark your own rendering reviewed.** A second native speaker adds your code to the list in a later pull request.
- **Starting point for Marathi:** BhashaBridge once had draft Marathi meanings for 82 terms. They were removed but are kept in git history, so you can bring them back instead of starting from nothing:

  ```bash
  git show a967d8b:glossary/domains/finance-banking.json
  ```

  Every one of those drafts is unreviewed: check each before marking it.

Then run `npm run glossary:review`. `docs/GLOSSARY_REVIEW.md` gets a column for your language, listing everything still to review.

An entry with no text in your language is fine: its term just stays in English there.

## Step 5: Tests and docs

Most tests read the language list and need no change. Update these few:

- `test/unit/translationProvider.test.ts`: the expected `LANGUAGE_NAMES` gains your language.
- `test/unit/panelHtml.test.ts`: the expected dropdown options gain your language.
- `test/unit/controller.test.ts` and `test/unit/settings.test.ts`: they use `mr` as an example of a language that is **not** supported. Change that example to one that still is not (say `hi`), or delete the line.

Then update the documents people read:

- `README.md`: the "Supported languages" table.
- `docs/TESTING_GUIDE.md`: mention your language.
- `.github/ISSUE_TEMPLATE/glossary-suggestion.md` and `translation-quality.md`: add your language where Gujarati is listed.

Run the tests:

```bash
npm run test:unit
npm test
```

## Step 6: Check real translations

The tests prove code is never damaged. Only a person can say whether the language reads naturally.

1. Put a Sarvam key in a `.env` file in the project (it is git-ignored): `SARVAM_API_KEY=...`
2. Run `npm run quality -- --lang mr`. It translates 20 realistic AI answers and writes a report to `docs/quality/`.
3. A native speaker scores each translation from 1 (unusable) to 5 (reads like a native speaker wrote it). The target is an average of 4.
4. Try it yourself: run `npm run compile`, press **F5** in VS Code, pick your language in the panel, and translate a few of your own AI answers.

If a provider gets something consistently wrong in your language (for example, spelling English words in your script), describe it in the pull request. The prompt in `src/translation/prompt.ts` applies to every language, so changes there need care.

## Step 7: Open the pull request

Include:

- [ ] The language entry, the `package.json` setting, and any sentence-end change
- [ ] Glossary renderings, if any, marked `"reviewed": false` or reviewed only for languages someone else checked
- [ ] Updated tests and docs; `npm run test:unit` passes
- [ ] The quality report's average score, and who scored it
- [ ] Anything that reads oddly and could not be fixed yet

GitHub runs all the tests on your pull request automatically. Thank you: every language added makes these tools work for many more developers.
