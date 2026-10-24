# Contributing to BhashaBridge

Thank you for helping. Contributions are most valuable from developers who think in Gujarati or another Indian language: you know which words read naturally and which should stay in English.

## Ways to help

- **Review Gujarati renderings** in the glossary (the most needed help right now).
- **Add your language**, such as Marathi or Hindi: see [`docs/ADDING_A_LANGUAGE.md`](docs/ADDING_A_LANGUAGE.md).
- **Add glossary terms** for a software or business domain.
- **Report a bad translation** with the *Report translation* button in the panel, or a [translation quality issue](../../issues/new?template=translation-quality.md).
- **Score sample translations** in a quality report (`npm run quality`).
- **Fix a bug or add a feature**, such as a new translation provider.

## Set up

Requirements: Node.js 22+ and VS Code 1.90+.

```bash
git clone https://github.com/SkayKapadia/bhashabridge.git
cd bhashabridge
npm install
```

- **Run the extension:** open the folder in VS Code and press **F5**. In the new window, run **BhashaBridge: Translate LLM Output**.
- **Unit tests:** `npm run test:unit` (fast, no network).
- **VS Code tests:** `npm test` (downloads a copy of VS Code the first time).

[`docs/TECHNICAL_OVERVIEW.md`](docs/TECHNICAL_OVERVIEW.md) explains how the pieces fit together.

## Adding glossary terms

The glossary lives in [`glossary/domains/`](glossary/domains/), one JSON file per domain. Each term is treated one of three ways:

| Section | Use it for | Example |
|---|---|---|
| `keep` | Terms that should always stay in English: technical jargon, acronyms, product names | `"dependency array"`, `"UPI"`, `"Kubernetes"` |
| `annotate` | An English term readers should learn, with its meaning added after the first use | `"ledger": { "gu": "ખાતાવહી", "reviewed": false }` |
| `translate` | A term with an accepted local word that replaces it | `"inheritance": { "gu": "…", "reviewed": false }` |

**Rules for `keep` terms.** A `keep` term can never be translated, even in an ordinary sentence, so:

- **No ordinary English words.** "order", "balance", "push", "view" or "instance" would freeze normal sentences. Use a longer phrase instead ("purchase order", "git push").
- **Acronyms in capitals.** A term written only in capitals (`IT`, `PO`, `PAN`) matches only in capitals, so the word "it" stays translatable. Mixed case (`GeM`, `DoT`) matches any capitalisation and would freeze "gem" and "dot", so use a longer name.
- **Business domains:** only acronyms, standards, product names and multi-word jargon.

**Rules for renderings (`annotate`, `translate`):**

- Write the meaning short and plain, in words a learner understands.
- Add one field per language, named by its code (`gu`). A term with no rendering in a language simply stays in English there.
- **Add new renderings with `"reviewed": false`.** BhashaBridge does not show an unreviewed rendering: the term stays in English until it is reviewed.
- **Never mark your own rendering `"reviewed": true`.** A second native speaker reviews it in the pull request (see below).

**A new domain** is a new file with `id`, `label`, `group` (`software` or `business`), `default` (`true` only for software domains), `description`, `keep`, `annotate` and `translate`. Also add its id to `bhashabridge.glossaryDomains` in `package.json`; a test checks the two match.

**Before you open the pull request:**

```bash
npm run test:unit        # checks every glossary file: format, duplicates, conflicts, ordinary words
npm run glossary:review  # updates docs/GLOSSARY_REVIEW.md; commit the result
```

## Reviewing renderings

[`docs/GLOSSARY_REVIEW.md`](docs/GLOSSARY_REVIEW.md) lists every rendering still waiting for review, by domain.

1. Open the domain file named in the heading.
2. Check the text for your language (`gu`). Fix it if needed.
3. Set `"reviewed": true` when every language in the entry is right, or list the ones you checked: `"reviewed": ["gu"]`.
4. Run `npm run glossary:review` and `npm run test:unit`, then open a pull request.

The person who wrote a rendering should not be the one who marks it reviewed.

## Adding a translation provider

1. Write a class that implements `TranslationProvider` (`src/translation/translationProvider.ts`): an `id`, an optional `maxChunkChars`, and `translate(request, signal)`.
2. Check the reply with `checkPlaceholders` and report failures as `TranslationError`s with a clear message.
3. Add it to `createProviders` and `PROVIDER_OPTIONS` in `src/translation/providers.ts`, and to the `bhashabridge.defaultProvider` options in `package.json`.
4. Test it with a stand-in network, as `test/unit/sarvamAdapter.test.ts` does. Tests never call a real API.

## Pull requests

- Keep each pull request to one change.
- All tests must pass; GitHub runs them automatically on every pull request.
- Write commit messages in the imperative: "add healthcare terms", "fix chunk marker check".

## Secrets

Never commit an API key, a token or a `.env` file. `.env` is already git-ignored. The extension stores keys in the OS keychain, and tests use made-up keys such as `sk_test_not_a_real_key_123`.
