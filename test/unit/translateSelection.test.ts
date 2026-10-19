import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { readText, type TextReaders } from '../../src/selection/readText';

function readers(editor: string | undefined, clipboard: string): TextReaders & { copyTerminalSelection: ReturnType<typeof vi.fn> } {
  return {
    editorSelection: () => editor,
    copyTerminalSelection: vi.fn(async () => undefined),
    clipboard: async () => clipboard,
  };
}

describe('readText', () => {
  it('uses the editor selection when there is one', async () => {
    expect(await readText('editor', readers('selected text', 'copied text'))).toBe('selected text');
    expect(await readText(undefined, readers('selected text', 'copied text'))).toBe('selected text');
  });

  it('falls back to the clipboard when nothing is selected', async () => {
    expect(await readText(undefined, readers(undefined, 'copied text'))).toBe('copied text');
    expect(await readText(undefined, readers('   ', 'copied text'))).toBe('copied text');
  });

  it('copies the terminal selection first, then reads the clipboard', async () => {
    const read = readers('ignored', 'terminal error');

    expect(await readText('terminal', read)).toBe('terminal error');
    expect(read.copyTerminalSelection).toHaveBeenCalledOnce();
  });

  it('reads only the clipboard from anywhere else, such as the Chat view', async () => {
    expect(await readText('clipboard', readers('stale editor selection', 'copied chat answer'))).toBe('copied chat answer');
  });
});

describe('Translate Selection shortcut', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
  const bindings = pkg.contributes.keybindings.filter((k: { command: string }) => k.command === 'bhashabridge.translateSelection');

  it('is Ctrl+Alt+Shift+T (Cmd on Mac), not Run Build Task', () => {
    for (const binding of bindings) {
      expect(binding.key).toBe('ctrl+alt+shift+t');
      expect(binding.mac).toBe('cmd+alt+shift+t');
    }
  });

  it('covers the editor, the terminal and everywhere else', () => {
    expect(bindings.map((b: { args: { source: string } }) => b.args.source).sort()).toEqual(['clipboard', 'editor', 'terminal']);
  });
});
