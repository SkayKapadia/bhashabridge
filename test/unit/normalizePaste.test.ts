import { describe, expect, it } from 'vitest';
import { normalizePastedText } from '../../src/parser/normalizePaste';

// The start of the message copied from a chat window in the real Gujarati test.
const PASTED = [
  'There are three ways, depending on who you want to share with:',
  '',
  'Option\tBest for\tWhat they need',
  'A. Share a test install file (.vsix)\tTesters who just want to try it\tVS Code, and a Sarvam key or Copilot',
  'B. Invite them to the GitHub repo\tDevelopers who\'ll co-develop\tNode.js 22, Git',
  'My suggestion: do A and B now.',
].join('\n');

describe('normalizePastedText', () => {
  it('turns tab-separated lines back into a table, first line as header', () => {
    expect(normalizePastedText(PASTED)).toBe(
      [
        'There are three ways, depending on who you want to share with:',
        '',
        '| Option | Best for | What they need |',
        '| --- | --- | --- |',
        '| A. Share a test install file (.vsix) | Testers who just want to try it | VS Code, and a Sarvam key or Copilot |',
        "| B. Invite them to the GitHub repo | Developers who'll co-develop | Node.js 22, Git |",
        '',
        'My suggestion: do A and B now.',
      ].join('\n'),
    );
  });

  it('pads short rows and escapes | inside cells', () => {
    expect(normalizePastedText('a\tb\tc\nx|y\tz')).toBe('| a | b | c |\n| --- | --- | --- |\n| x\\|y | z |  |\n');
  });

  it('turns bullet characters into a list, keeping indentation', () => {
    expect(normalizePastedText('Points:\n• first\n  ◦ nested\n• second')).toBe('Points:\n- first\n  - nested\n- second');
  });

  it('never changes code inside fences', () => {
    const code = '```tsv\nname\tage\nAsha\t30\n• not a bullet\n```';
    expect(normalizePastedText(code)).toBe(code);
  });

  it('leaves a single tabbed line and ordinary markdown alone', () => {
    expect(normalizePastedText('Indented\tonce.\n\n- a\n- b\n\n| x | y |\n| - | - |')).toBe('Indented\tonce.\n\n- a\n- b\n\n| x | y |\n| - | - |');
  });

  it('uses plain newlines', () => {
    expect(normalizePastedText('one\r\ntwo\rthree')).toBe('one\ntwo\nthree');
  });
});
