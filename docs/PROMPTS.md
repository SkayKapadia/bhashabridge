# Prompts used to build BhashaBridge

BhashaBridge was built module by module with an AI coding assistant (Claude Code). These are the prompts used for each module, so contributors can follow the same approach. Other languages can be added by following [ADDING_A_LANGUAGE.md](ADDING_A_LANGUAGE.md).

## Working rules

The rules in [`CLAUDE.md`](../CLAUDE.md), followed for every module:

1. Give only one module at a time.
2. Paste only the relevant SDD section.
3. Ask for a plan before code.
4. Ask for tests.
5. Ask it to avoid secrets.
6. Commit after every working milestone.

## Milestone 1: Extension skeleton

> Read the project goal. Create a minimal VS Code extension using TypeScript. The extension should have a command called bhashabridge.translate. When the command runs, it should open a webview panel with the title BhashaBridge and the text BhashaBridge is running. Do not add translation logic yet. Do not add API calls. Keep it simple.

## Milestone 2: Markdown parser

> Implement only the markdown parser module. Use TypeScript. Use a markdown AST parser. Parse user input. Identify code blocks and inline code. Replace them with placeholder tokens like SKIP_001 and SKIP_002. Return the text that should be translated and a map of placeholders to original code. Do not call any external API. Add unit tests.

Checks afterwards:

> Code blocks remain unchanged. Inline code remains unchanged. Normal paragraphs are separated. Placeholders are unique. The parser does not crash on empty input.
>
> Test sample: "The function fails because users is undefined. Add a check before calling map." followed by the line `const names = users.map(getName);` It should extract the code line, keep the code untouched, and send only the paragraph for translation. Commit only when tests pass.

## Milestone 3: Translation service

> Create a TranslationProvider interface in src/translation. The interface should have a translate method. The method should accept text, target language, and glossary. Create a TranslateRequest type and TranslateResponse type. Do not implement any provider yet. Keep it clean and simple. The target language code should be gu for Gujarati. The interface should be simple enough that SarvamAdapter, ClaudeAdapter, GeminiAdapter, and IndicTrans2Adapter can be added later without changing the core app.

> Implement SarvamAdapter using the TranslationProvider interface. It should translate English text into Gujarati. It must keep programming keywords, variable names, function names, library names, framework names, and technical terms in English. It should use the Sarvam AI API. It should read the API key from a secure local setting, not from hardcoded values. Add error handling for missing key, network failure, and timeout. Do not log the API key.
>
> Before running this, read the Sarvam AI docs and check the exact request format. Sarvam may update their API. For your first version, keep only Sarvam AI. Do not add five providers at once.

## Milestone 4: Reassembly engine

> Create a reassembly module. It should take translated text and replace placeholder tokens with the original code blocks and inline code from the parser map. It should preserve markdown structure. It should not modify code. Add tests.
>
> Test example: "The function fails because users is undefined." with the code `const names = users.map(getName);`. After translation, the paragraph becomes Gujarati. The code must remain exactly the same. If the translated output changes code, that is a bug.

## Milestone 5: Webview UI

> Build the BhashaBridge webview. It should have an input textarea, a language dropdown for Gujarati, a translate button, and an output area. When the user clicks translate, send the input to the extension host. The extension host should parse the text, translate the normal text, restore code placeholders, and return final markdown. Render the output safely. Do not allow unsafe HTML. Show loading state and error state.
>
> For version 1, the UI can be simple. It needs: clear input, clear language selection, clear translate button, clear output, clear errors.

## Later modules

Glossary domains, chunking, settings (Milestone 6), Translate Selection, the `@bhashabridge` chat participant, the VS Code model provider, learning mode, the quality check set, the translation cache, the bad-translation report and the workspace glossary were each planned first, agreed, then built one at a time with tests, following the rules above. [`TECHNICAL_OVERVIEW.md`](TECHNICAL_OVERVIEW.md) describes the result.
