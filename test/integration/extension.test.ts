import * as assert from 'assert';
import * as vscode from 'vscode';

suite('BhashaBridge extension', () => {
  test('registers the bhashabridge.translate command', async () => {
    const extension = vscode.extensions.getExtension('bhashabridge.bhashabridge');
    assert.ok(extension, 'expected the extension to be installed');
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('bhashabridge.translate'));
    assert.ok(commands.includes('bhashabridge.setSarvamApiKey'));
    assert.ok(commands.includes('bhashabridge.testSarvamConnection'));
    assert.ok(commands.includes('bhashabridge.clearSarvamApiKey'));
    assert.ok(commands.includes('bhashabridge.chooseGlossaryDomains'));
    assert.ok(commands.includes('bhashabridge.translateSelection'));
    assert.ok(commands.includes('bhashabridge.clearTranslationCache'));
    assert.ok(commands.includes('bhashabridge.createWorkspaceGlossary'));
  });

  test('declares the default language and provider settings', () => {
    const config = vscode.workspace.getConfiguration('bhashabridge');
    assert.strictEqual(config.get('defaultLanguage'), 'gu');
    assert.strictEqual(config.get('defaultProvider'), 'sarvam');
    const domains = config.get<string[]>('glossaryDomains') ?? [];
    assert.ok(domains.includes('software-core'));
    assert.ok(!domains.includes('healthcare'));
    assert.strictEqual(config.get('workspaceGlossaryPath'), '.bhashabridge/glossary.json');
  });

  test('Translate Selection opens the panel with clipboard text', async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.env.clipboard.writeText('The function fails because users is undefined.');
    await vscode.commands.executeCommand('bhashabridge.translateSelection', { source: 'clipboard' });

    assert.ok(await waitForTab('BhashaBridge'), 'expected the BhashaBridge panel to open');
  });

  test('opens a webview panel titled BhashaBridge', async () => {
    await vscode.commands.executeCommand('bhashabridge.translate');

    const tab = await waitForTab('BhashaBridge');
    assert.ok(tab, 'expected a BhashaBridge tab to open');
    assert.ok(tab.input instanceof vscode.TabInputWebview);
    assert.ok(tab.input.viewType.endsWith('bhashabridge'));
  });
});

// Tab state reaches the extension host asynchronously, so poll briefly.
async function waitForTab(label: string, timeoutMs = 5000): Promise<vscode.Tab | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .find(t => t.label === label);
    if (tab) {
      return tab;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return undefined;
}
