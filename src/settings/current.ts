import * as vscode from 'vscode';
import { applyWorkspaceGlossary, combineDomains, loadGlossaryDomains, type GlossaryDomain, type LoadedGlossary } from '../glossary/glossary';
import { PROVIDER_OPTIONS } from '../translation/providers';
import { readGlossaryDomains, readSettings, SETTINGS_SECTION, type BhashaBridgeSettings } from './settings';
import { readWorkspaceGlossary } from './workspaceGlossary';

// The settings and glossary in force right now, shared by the panel and the chat.

export function currentSettings(): BhashaBridgeSettings {
  const config = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  return readSettings(key => config.get(key), PROVIDER_OPTIONS.map(p => p.id));
}

let domains: Promise<GlossaryDomain[]> | undefined;

// The domain files are read once; which domains are in use, and the project's own
// glossary file, are read on every call, so changes apply to the next translation.
export async function currentGlossary(context: vscode.ExtensionContext): Promise<LoadedGlossary> {
  domains ??= loadGlossaryDomains(context.extensionPath);
  let all: GlossaryDomain[];
  try {
    all = await domains;
  } catch (error) {
    domains = undefined; // try reading the files again next time
    throw error;
  }
  const config = vscode.workspace.getConfiguration(SETTINGS_SECTION);
  const builtIn = combineDomains(all, readGlossaryDomains(key => config.get(key), all));
  return applyWorkspaceGlossary(builtIn, await readWorkspaceGlossary());
}
