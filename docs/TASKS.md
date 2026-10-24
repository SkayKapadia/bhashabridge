Milestone 0: Project setup
Create repository.
Add SDD.
Add TASKS.
Add README.
Add LICENSE.
Add .gitignore.
Milestone 1: Extension skeleton
Create VS Code extension manifest.
Add command bhashabridge.translate.
Open a basic webview panel.
Show the text BhashaBridge is running.
Milestone 2: Markdown parser
Parse pasted LLM output.
Detect code blocks.
Detect inline code.
Replace code with placeholder tokens.
Return plain text nodes for translation.
Keep a map to restore code later.
Milestone 3: Translation service
Create TranslationProvider interface.
Create SarvamAdapter.
Add target language support for gu.
Add prompt instruction to keep technical terms in English.
Return translated text.
Milestone 4: Reassembly engine
Take translated text.
Restore placeholder tokens with original code blocks.
Return final markdown.
Milestone 5: Webview UI
Add input box.
Add language dropdown.
Add provider dropdown.
Add translate button.
Add output panel.
Render translated markdown safely.
Milestone 6: Secrets and settings
Store Sarvam API key using VS Code SecretStorage.
Add default language setting.
Add default provider setting.
Add clear error messages.
Milestone 7: Testing and first release
Add parser unit tests.
Add reassembly tests.
Add manual test checklist.
Update README.
Package extension.
Publish to VS Code Marketplace.
Publish to Open VSX if possible.
