import * as vscode from 'vscode';
import { GlossaryError, parseWorkspaceGlossary, type LoadedGlossary } from '../glossary/glossary';
import { SETTINGS_SECTION } from './settings';

const DEFAULT_PATH = '.bhashabridge/glossary.json';

const STARTER = {
  description:
    'Project terms for BhashaBridge; these win over the built-in glossary. keep: always English. annotate: English plus its meaning after the first use. translate: use this rendering.',
  keep: ['AcmePay', 'OrderService'],
  annotate: {
    settlement: { gu: 'ચુકવણીની પતાવટ', mr: 'देयकाची पूर्तता' },
  },
  translate: {},
};

// The project glossary file: the setting's path, relative to the first workspace folder.
export function workspaceGlossaryUri(): vscode.Uri | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return undefined;
  }
  const setting = vscode.workspace.getConfiguration(SETTINGS_SECTION).get<string>('workspaceGlossaryPath');
  const relative = setting?.trim() || DEFAULT_PATH;
  return vscode.Uri.joinPath(folder.uri, relative);
}

// Read on every translation, so an edit applies straight away. No file: no project terms.
export async function readWorkspaceGlossary(): Promise<LoadedGlossary | undefined> {
  const uri = workspaceGlossaryUri();
  if (!uri) {
    return undefined;
  }
  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch {
    return undefined;
  }
  const source = vscode.workspace.asRelativePath(uri);
  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new GlossaryError(`Glossary file ${source} is not valid JSON.`);
  }
  return parseWorkspaceGlossary(data, source);
}

export async function createWorkspaceGlossary(): Promise<void> {
  const uri = workspaceGlossaryUri();
  if (!uri) {
    vscode.window.showErrorMessage('Open a folder first: the project glossary is saved inside it.');
    return;
  }
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(`${JSON.stringify(STARTER, null, 2)}\n`));
  }
  await vscode.window.showTextDocument(uri);
}
