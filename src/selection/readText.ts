// Where Translate Selection takes its text from. The keybinding passes the source its
// "when" clause matched; from the Command Palette there is none, and the editor
// selection is used if there is one, else the clipboard. Kept free of the VS Code API
// so it can be tested directly.
export type TextSource = 'editor' | 'terminal' | 'clipboard';

export interface TextReaders {
  editorSelection: () => string | undefined;
  copyTerminalSelection: () => Promise<void>;
  clipboard: () => Thenable<string>;
}

export async function readText(source: TextSource | undefined, read: TextReaders): Promise<string> {
  if (source === 'terminal') {
    await read.copyTerminalSelection(); // the terminal API offers no selection, so copy it first
    return read.clipboard();
  }
  if (source !== 'clipboard') {
    const selected = read.editorSelection();
    if (selected?.trim()) {
      return selected;
    }
  }
  return read.clipboard();
}
