PROJECT NAME
BhashaBridge (you can rename it, just a working title)
TAGLINE
Read LLM explanations in your own language. Code stays in English. Understanding becomes local.
SECTION 1: PROBLEM STATEMENT
Developers in Gujarat, Maharashtra, and other non English speaking regions of India understand technical concepts like loops, functions, APIs, and data structures. However, when an LLM tool inside VS Code generates a long English paragraph explaining why their code is broken, they lose track. The cognitive load of parsing complex English sentences while simultaneously trying to understand the technical fix is too high. This slows learning, reduces confidence, and creates an unnecessary barrier for talented developers who simply think in Gujarati or Marathi.
There is no tool in the VS Code ecosystem that translates LLM explanations into Indian languages while preserving technical terminology in English.
SECTION 2: GOALS
Goal 1: Translate LLM generated explanations from English to Gujarati or Marathi inside VS Code.
Goal 2: Keep all code blocks, inline code, variable names, function names, library names, and technical keywords in English.
Goal 3: Support multiple translation backends so users can choose based on budget and privacy.
Goal 4: Be fully open source with a bring your own API key model.
Goal 5: Provide a community driven glossary of accepted technical term translations.
Goal 6: Work as a lightweight VS Code extension with minimal performance impact.
SECTION 3: NON GOALS
Non Goal 1: This extension will not translate code itself. Code stays in English always.
Non Goal 2: This extension will not generate code. It only explains existing LLM outputs.
Non Goal 3: This extension will not support languages beyond Gujarati and Marathi in version 1. Hindi and other languages can come later.
Non Goal 4: This extension will not have a backend server. Everything runs client side using the user API keys.
Non Goal 5: This extension will not replace existing LLM coding assistants. It sits alongside them.
SECTION 4: TARGET USERS
User Type A: Junior developers and students in Tier 2 and Tier 3 cities in Gujarat and Maharashtra who use tools like GitHub Copilot, Continue.dev, or Codeium and struggle with lengthy English explanations.
User Type B: Self taught developers from non English medium backgrounds who understand code logic but need explanations in their native language to grasp concepts faster.
User Type C: Open source contributors who want to improve the glossary, add language support, or improve prompt engineering.
SECTION 5: SYSTEM ARCHITECTURE
The extension follows a three layer architecture.
Layer 1: Presentation Layer. This is a VS Code Webview Panel built with HTML, CSS, and vanilla JavaScript or a lightweight framework like Preact. It shows the original LLM output on the left and the translated output on the right. It has a language selector dropdown, a model selector dropdown, and a translate button.
Layer 2: Processing Layer. This is the core engine running in the VS Code Extension Host using Node.js. It handles markdown parsing, code block extraction, text chunking, API calls to the translation model, and reassembly of the translated content.
Layer 3: Service Layer. This is the translation adapter layer. It defines a common interface that all translation providers must implement. Each provider (Sarvam AI, IndicTrans2, Gemini, Krutrim) has its own adapter class that implements this interface.
The flow is: User pastes text into the webview. The webview sends it to the extension host. The extension host parses the markdown. It extracts code blocks and stores them with placeholder tokens. It sends the remaining text chunks to the selected translation service. The translation service returns translated text. The extension host replaces the placeholder tokens with the original code blocks. It sends the final translated markdown back to the webview for rendering.
SECTION 6: TECH STACK
Extension Framework: VS Code Extension API using Node.js and TypeScript.
Webview UI: HTML, CSS, JavaScript. Optionally Preact for component rendering. Keep it lightweight.
Markdown Parsing: Use the unified.js ecosystem. Specifically remark for parsing and remark-stringify for rebuilding. This lets you walk the AST and identify code blocks, inline code, and plain text nodes separately.
Translation Providers: Sarvam AI REST API, AI4Bharat IndicTrans2 (via Hugging Face Inference API or local), Google Gemini API, Krutrim API.
Settings Storage: VS Code workspace settings and global settings using the VS Code Configuration API.
API Key Storage: VS Code SecretStorage API. Never store keys in plain text settings files.
Glossary Storage: A JSON file bundled with the extension, overridable by user settings.
Build Tool: esbuild for fast bundling.
Testing: Vitest for unit tests. VS Code Extension Test Runner for integration tests.
CI/CD: GitHub Actions for linting, testing, and packaging.
Distribution: VS Code Marketplace and Open VSX Registry.
SECTION 7: MODULE BREAKDOWN
Module 1: Markdown Parser Module.
Responsibility: Parse the incoming LLM output into an abstract syntax tree. Identify and classify every node as code block, inline code, heading, paragraph, list, or table.
Input: Raw markdown string.
Output: Parsed AST with classified nodes.
Key Logic: Walk the AST. For every code block and inline code node, replace it with a unique placeholder token like TRANSLATE_SKIP_001. Store the original content in a map. Only pass paragraph, list, and heading text nodes to the translation module.
Module 2: Translation Service Module.
Responsibility: Define a common TranslationProvider interface. Implement concrete adapters for each supported model.
Interface Definition: The interface should have a method called translate that accepts a TranslateRequest object and returns a Promise of TranslateResponse. The TranslateRequest contains the text to translate, the target language code (gu for Gujarati, mr for Marathi), and a glossary map. The TranslateResponse contains the translated text and metadata like token count and latency.
Adapters: SarvamAdapter, IndicTrans2Adapter, GeminiAdapter, KrutrimAdapter.
Prompt Template: Each adapter constructs a system prompt that instructs the model to translate the given English text into the target language. The prompt must explicitly state: Keep all programming keywords, variable names, function names, class names, library names, framework names, and technical jargon in English. Only translate the surrounding explanation, grammar, and connecting words. Use the provided glossary for consistency.
Module 3: Chunking Module.
Responsibility: Split long text into smaller chunks that fit within the API token limits of the selected provider.
Logic: Each provider has a max token limit. Sarvam might allow 4096 tokens. Gemini might allow more. The chunking module splits text at paragraph boundaries. Never split mid sentence. If a paragraph exceeds the limit, split at sentence boundaries. Keep track of chunk order for reassembly.
Module 4: Glossary Module.
Responsibility: Maintain a dictionary of technical terms and their accepted treatment in translation.
Structure: A JSON object where each key is an English technical term and the value is an object containing the term itself, whether to keep it in English or use a transliteration, and an optional note.
Example: The term "dependency injection" would have a value saying keep in English. The term "inheritance" might have a value saying use the Marathi word "anuvanshikta" followed by the English term in brackets.
Default glossary ships with the extension. Users can override or extend it via a local JSON file in their workspace.
Module 5: API Key Manager Module.
Responsibility: Securely store and retrieve API keys for each translation provider.
Implementation: Use the VS Code SecretStorage API. When the user first selects a provider, prompt them for the API key. Store it encrypted. Never log it. Never send it anywhere except the provider API endpoint.
Module 6: Webview UI Module.
Responsibility: Render the user interface inside VS Code.
Components: A header bar with the extension name and settings gear icon. A language selector dropdown (Gujarati, Marathi). A model selector dropdown (Sarvam AI, IndicTrans2, Gemini, Krutrim). An input text area where the user pastes the LLM output. A translate button. An output area that renders the translated markdown with proper syntax highlighting for code blocks. A status bar showing translation progress, token usage, and errors.
Module 7: Settings Module.
Responsibility: Allow users to configure default language, default provider, chunk size, glossary overrides, and UI preferences.
Implementation: Use VS Code workspace settings. Define all settings in the package.json contributes.configuration section.
SECTION 8: DATA FLOW
Step 1: User copies an LLM explanation from GitHub Copilot, Continue.dev, or any other tool.
Step 2: User opens the BhashaBridge panel via the VS Code command palette or a sidebar icon.
Step 3: User pastes the text into the input area.
Step 4: User selects the target language (Gujarati or Marathi) and the translation provider.
Step 5: User clicks Translate.
Step 6: The webview sends the raw text and settings to the extension host via the VS Code messaging API.
Step 7: The Markdown Parser Module parses the text and extracts code blocks, replacing them with placeholder tokens.
Step 8: The Glossary Module loads the active glossary.
Step 9: The Chunking Module splits the remaining text into chunks if needed.
Step 10: The Translation Service Module sends each chunk to the selected provider with the glossary and the system prompt.
Step 11: The provider returns translated chunks.
Step 12: The extension host reassembles the chunks in order.
Step 13: The placeholder tokens are replaced with the original code blocks.
Step 14: The final translated markdown is sent back to the webview.
Step 15: The webview renders the translated markdown with syntax highlighting.
SECTION 9: ERROR HANDLING
Error Type 1: Invalid or missing API key. Show a clear message in the webview with a link to the provider signup page. Do not crash the extension.
Error Type 2: API rate limit exceeded. Show a message telling the user to wait. Implement exponential backoff retry logic. Maximum three retries.
Error Type 3: API timeout. Set a 30 second timeout per chunk. If it fails, retry once. If it fails again, show the untranslated text for that chunk with a warning badge.
Error Type 4: Malformed markdown. If the parser fails, fall back to treating the entire input as plain text. Still attempt translation. Show a warning that code blocks might not be preserved.
Error Type 5: Empty or very short input. If the input is less than 10 characters, do not make an API call. Show a message asking for more text.
Error Type 6: Network failure. Catch all network errors. Show a clear offline message. Do not lose the user input text.
SECTION 10: SECURITY CONSIDERATIONS
Point 1: API keys are stored using VS Code SecretStorage API. They are never written to plain text files, never committed to version control, and never sent to any server other than the selected provider endpoint.
Point 2: The extension makes HTTPS calls only. No HTTP.
Point 3: The user text is sent only to the selected translation provider. No analytics, no telemetry, no third party tracking. The extension is fully open source so anyone can audit the code.
Point 4: The webview runs with a Content Security Policy that restricts script sources to the extension bundle only. No inline scripts. No external script loading.
Point 5: Input sanitization. Before rendering translated markdown in the webview, sanitize the HTML output to prevent XSS attacks. Use a library like DOMPurify.
SECTION 11: TESTING STRATEGY
Unit Tests: Test the Markdown Parser Module with various inputs including nested code blocks, inline code, tables, and malformed markdown. Test the Chunking Module with texts of varying lengths. Test the Glossary Module loading and override logic. Use Vitest for all unit tests.
Integration Tests: Test the full flow from paste to translated output using mock API responses. Test with each provider adapter using recorded API responses. Use the VS Code Extension Test Runner.
Manual Testing: Test with real LLM outputs from GitHub Copilot, Continue.dev, and ChatGPT. Test with Gujarati and Marathi native speakers to validate translation quality. Collect feedback on whether technical terms are correctly preserved.
Edge Case Tests: Test with extremely long inputs. Test with inputs that are 90 percent code and 10 percent text. Test with inputs that contain no code at all. Test with inputs in mixed languages. Test with empty inputs. Test with special characters and unicode.
SECTION 12: PROJECT STRUCTURE
The repository should have the following top level structure:
A src folder containing all TypeScript source code.
Inside src, a parser folder for the Markdown Parser Module.
Inside src, a translation folder for the Translation Service Module and all provider adapters.
Inside src, a chunking folder for the Chunking Module.
Inside src, a glossary folder for the Glossary Module.
Inside src, a webview folder for the Webview UI Module.
Inside src, a settings folder for the Settings Module.
Inside src, a secrets folder for the API Key Manager Module.
A test folder containing all unit and integration tests.
A glossary folder at the root containing the default glossary JSON files for Gujarati and Marathi.
A docs folder containing user documentation, contributor guide, and architecture diagrams.
A .github folder containing GitHub Actions workflows for CI/CD.
A package.json at the root with all VS Code extension manifest configuration.
A README.md with setup instructions, screenshots, and contribution guidelines.
A LICENSE file. Use MIT license for maximum open source adoption.
SECTION 13: VS CODE EXTENSION MANIFEST
The package.json should declare the following:
The extension name, display name, description, version, and publisher.
Activation events: onCommand for the main translate command, and onView if you add a sidebar panel.
Contributes: commands section with a command called bhashabridge.translate with the title BhashaBridge: Translate LLM Output.
Contributes: views section if you want a sidebar panel under the explorer or a dedicated activity bar icon.
Contributes: configuration section with settings for default language (enum: gu, mr), default provider (enum: sarvam, indictrans2, gemini, krutrim), chunk size (number), and glossary override path (string).
Contributes: keybindings section with a default shortcut like Ctrl+Shift+B for quick translate.
Dependencies: The unified.js ecosystem for markdown parsing. DOMPurify for HTML sanitization. Node fetch or the built in fetch for API calls. TypeScript as a dev dependency. esbuild for bundling. Vitest for testing.
SECTION 14: GLOSSARY DEFAULT ENTRIES
Start with a glossary of the 100 most common programming terms. Here are a few examples to set the pattern:
Term: variable. Treatment: Keep as variable in English.
Term: function. Treatment: Keep as function in English.
Term: loop. Treatment: Keep as loop in English.
Term: array. Treatment: Keep as array in English.
Term: object. Treatment: Keep as object in English.
Term: inheritance. Treatment for Marathi: Use anuvanshikta with English in brackets. Treatment for Gujarati: Use anuvanshikta with English in brackets.
Term: polymorphism. Treatment: Keep as polymorphism in English.
Term: dependency injection. Treatment: Keep as dependency injection in English.
Term: asynchronous. Treatment: Keep as asynchronous in English.
Term: callback. Treatment: Keep as callback in English.
Term: promise. Treatment: Keep as promise in English.
Term: API. Treatment: Keep as API in English.
Term: database. Treatment: Keep as database in English.
Term: query. Treatment: Keep as query in English.
Term: compiler. Treatment: Keep as compiler in English.
Term: runtime. Treatment: Keep as runtime in English.
The community will expand this over time via pull requests.
SECTION 15: OPEN SOURCE STRATEGY
License: MIT. Anyone can use, modify, and distribute.
Repository: GitHub. Public repo.
Contributing Guide: Write a clear CONTRIBUTING.md. Explain how to set up the dev environment, how to run tests, how to add a new translation provider adapter, how to add glossary entries, and how to submit a pull request.
Issue Templates: Create issue templates for bug reports, feature requests, glossary suggestions, and translation quality issues.
Community: Start a GitHub Discussions tab. Encourage developers from Gujarat and Maharashtra to test and give feedback. Post about it on Twitter, LinkedIn, and Indian developer communities like Dev.to and Hashnode.
Versioning: Use semantic versioning. Version 0.1.0 is the first public release with Sarvam AI only. Version 0.2.0 adds IndicTrans2. Version 0.3.0 adds Gemini. Version 1.0.0 is the stable release with all providers, full glossary, and polished UI.
SECTION 16: FUTURE ROADMAP
Phase 1 (Version 0.1.0): Core translation with Sarvam AI. Gujarati and Marathi only. Basic webview UI. Default glossary of 100 terms. Publish to VS Code Marketplace.
Phase 2 (Version 0.3.0): Add IndicTrans2 and Gemini as providers. Add streaming translation support so the user sees text appearing progressively. Add a history panel so users can see their last 20 translations. Expand glossary to 300 terms.
Phase 3 (Version 0.5.0): Add Hindi, Kannada, Tamil, and Telugu support. Add a context aware mode where the extension can read the currently open file and use it as context for better translation. Add community glossary voting system.
Phase 4 (Version 1.0.0): Polish, performance optimization, full test coverage, comprehensive documentation. Add a feature to translate error messages from the VS Code terminal. Add integration with Continue.dev so translations happen automatically without copy paste.
Phase 5 (Beyond 1.0): Voice output using Sarvam AI speech synthesis so users can listen to explanations. A browser extension version for ChatGPT and Claude web interfaces. A CLI version for terminal based LLM tools.
SECTION 17: BUILD TIMELINE
Week 1: Set up the VS Code extension skeleton. Get the webview panel rendering. Implement the Markdown Parser Module. Write unit tests for the parser.
Week 2: Implement the Sarvam AI adapter. Implement the Chunking Module. Connect the parser and the translator. Get a basic end to end flow working where you paste text, hit translate, and see Gujarati output.
Week 3: Implement the Glossary Module. Build the default glossary. Implement the API Key Manager. Add the settings UI. Polish the webview with proper markdown rendering and code syntax highlighting.
Week 4: Implement error handling. Add the IndicTrans2 adapter. Write integration tests. Test with real developers. Collect feedback. Fix issues. Publish version 0.1.0 to the VS Code Marketplace. Write the README and blog post. Share on social media.
SECTION 18: SUCCESS METRICS
Metric 1: Number of installs from VS Code Marketplace. Target 500 in the first 3 months.
Metric 2: Number of GitHub stars. Target 200 in the first 3 months.
Metric 3: Number of community contributions to the glossary. Target 50 glossary entries added by community members.
Metric 4: Translation quality score. Get 10 native Gujarati and Marathi developers to rate 20 translated explanations on a scale of 1 to 5. Target an average score of 4 or above.
Metric 5: Number of bug reports. Fewer than 5 critical bugs in the first month after release.
SECTION 19: RISKS AND MITIGATIONS
Risk 1: Sarvam AI changes their API or pricing. Mitigation: The adapter layer means you can swap providers without changing core logic. Always have at least one free alternative like IndicTrans2.
Risk 2: Translation quality for technical text is poor. Mitigation: Heavy prompt engineering. Community glossary. Allow users to report bad translations and improve prompts iteratively.
Risk 3: Low adoption because developers are used to English. Mitigation: Target the right audience. Partner with coding bootcamps and colleges in Gujarat and Maharashtra. Show real before and after demos.
Risk 4: VS Code API changes break the extension. Mitigation: Pin to a minimum VS Code version. Run CI tests against the latest stable and insiders builds.
Risk 5: API key leakage. Mitigation: Use SecretStorage. Never log keys. Open source code allows community audit. Add security documentation.

Claude Code Addendum
    Claude Code is an optional development assistant. It can help generate code, write tests, and fix errors. It is not a runtime dependency. The extension must work without Claude Code. The default translation provider is Sarvam AI. Claude can be added later as an optional TranslationProvider adapter. Version 1 uses copy paste input from any LLM tool.