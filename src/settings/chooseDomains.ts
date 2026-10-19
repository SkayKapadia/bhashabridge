import * as vscode from 'vscode';
import { loadGlossaryDomains } from '../glossary/glossary';
import { readGlossaryDomains, SETTINGS_SECTION } from './settings';

// A checklist of glossary domains, easier than editing the list in Settings by hand.
export async function chooseGlossaryDomains(context: vscode.ExtensionContext): Promise<void> {
  const domains = await loadGlossaryDomains(context.extensionPath);
  const config = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  const enabled = new Set(readGlossaryDomains(key => config.get(key), domains));

  type Item = vscode.QuickPickItem & { id?: string };
  const items: Item[] = [];
  for (const group of ['software', 'business'] as const) {
    items.push({ label: group === 'software' ? 'Software development' : 'Business domains', kind: vscode.QuickPickItemKind.Separator });
    for (const domain of domains.filter(d => d.group === group)) {
      const count = domain.keep.length + Object.keys(domain.annotate).length + Object.keys(domain.translate).length;
      items.push({ id: domain.id, label: domain.label, description: `${count} terms`, detail: domain.description, picked: enabled.has(domain.id) });
    }
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Glossary domains: terms in these areas stay in English',
    canPickMany: true,
    matchOnDetail: true,
  });
  if (picked) {
    await config.update('glossaryDomains', picked.flatMap(item => (item.id ? [item.id] : [])), vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`BhashaBridge will use ${picked.length} glossary domain${picked.length === 1 ? '' : 's'}.`);
  }
}
