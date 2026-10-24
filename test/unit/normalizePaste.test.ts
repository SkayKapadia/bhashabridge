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

// From the Flappy Bird answer copied out of a chat window in the real Gujarati test: each
// file link landed on a line of its own, and each code block arrived as its language name
// above the code.
describe('normalizePastedText: file links copied out of a chat', () => {
  it('rejoins a sentence split around a file link', () => {
    expect(normalizePastedText('   As seen in\n\nruns/flappybirdv0.log\n, the best score was 16.89.\nWhen you run it, it fails.')).toBe(
      '   As seen in `runs/flappybirdv0.log`, the best score was 16.89.\nWhen you run it, it fails.',
    );
  });

  it('rejoins links with line numbers, and a sentence that carries on in lowercase', () => {
    expect(normalizePastedText('Notice how\n\ndqn.py\ndefines:')).toBe('Notice how `dqn.py` defines:');
    expect(normalizePastedText('In\n\nparameters.yaml:L11\n, network_sync_rate: 10 is too low.')).toBe(
      'In `parameters.yaml:L11`, network_sync_rate: 10 is too low.',
    );
    expect(normalizePastedText('In\n\nagent.py:L72\n, change:')).toBe('In `agent.py:L72`, change:');
    expect(normalizePastedText('In\n\nparameters.yaml\n:')).toBe('In `parameters.yaml`:');
  });

  it('leaves a file name alone when the sentence does not run through it', () => {
    const cases = [
      'Files changed:\n\nsrc/a.ts\nsrc/b.ts',
      'The fix is done.\n\nagent.py\n, then run it.',
      'Open this file\n\nagent.py\nRun it next.',
      '## Files\n\nagent.py\nholds the loop.',
      'Edit\nagent.py',
    ];
    for (const text of cases) {
      expect(normalizePastedText(text)).toBe(text);
    }
  });

  it('never joins inside a code fence', () => {
    const code = '```\nIn\nagent.py\n, change\n```';
    expect(normalizePastedText(code)).toBe(code);
  });
});

describe('normalizePastedText: code blocks copied without their fences', () => {
  it('fences the code under a language label, stopping at the prose', () => {
    expect(
      normalizePastedText(
        'python\ndef __init__(self, state_dim=12, action_dim=2, hidden_dim=256):\nThe architecture was designed for 12 features (use_lidar=False).',
      ),
    ).toBe('```python\ndef __init__(self, state_dim=12, action_dim=2, hidden_dim=256):\n```\nThe architecture was designed for 12 features (use_lidar=False).');
  });

  it('fences code lines the line detector would miss, such as commands and calls with words', () => {
    expect(normalizePastedText('bash\npython agent.py flappybirdv0 --train\nWith the 12 features in place, the bird will learn.')).toBe(
      '```bash\npython agent.py flappybirdv0 --train\n```\nWith the 12 features in place, the bird will learn.',
    );
    expect(
      normalizePastedText('python\nenv = gym.make("FlappyBird-v0", render_mode="human" if render else None, use_lidar=False)\n(This feeds the 12 clean features into DQN(state_dim=12)).'),
    ).toBe('```python\nenv = gym.make("FlappyBird-v0", render_mode="human" if render else None, use_lidar=False)\n```\n(This feeds the 12 clean features into DQN(state_dim=12)).');
  });

  it('fences several lines up to a blank line', () => {
    expect(normalizePastedText('yaml\nnetwork_sync_rate: 1000\nlearning_rate_a: 0.0003\n\nThen train again.')).toBe(
      '```yaml\nnetwork_sync_rate: 1000\nlearning_rate_a: 0.0003\n```\n\nThen train again.',
    );
  });

  it('fences code that stands as its own block, keeping its indentation', () => {
    expect(normalizePastedText('Replace the loop with:\nfor (const user of users) {\n  total += user.age;\n}\nThen run the tests.')).toBe(
      'Replace the loop with:\n```\nfor (const user of users) {\n  total += user.age;\n}\n```\nThen run the tests.',
    );
    expect(normalizePastedText('Add this:\n\ndef __init__(self, state_dim=12):\n\nIt sets the sizes.')).toBe(
      'Add this:\n\n```\ndef __init__(self, state_dim=12):\n```\n\nIt sets the sizes.',
    );
  });

  it('puts backticks round a code line inside a sentence, so the sentence stays whole', () => {
    expect(normalizePastedText('Change the first line to\nconst names = users.map(getName);\nand run it again.')).toBe(
      'Change the first line to\n`const names = users.map(getName);`\nand run it again.',
    );
  });

  it('leaves code in lists, quotes, indented blocks and existing backticks alone', () => {
    for (const text of ['- const x = 1;', '> const x = 1;', 'Text\n\n    const x = 1;', 'Run `const x = 1;` first.', 'const s = `a`;']) {
      expect(normalizePastedText(text)).toBe(text);
    }
  });

  it('leaves a language name alone when no code follows it', () => {
    for (const text of ['python\nis the language we use here.', 'We use\npython\n']) {
      expect(normalizePastedText(text)).toBe(text);
    }
    expect(normalizePastedText('go\n\nx = 1')).toBe('go\n\n```\nx = 1\n```');
  });
});

// Terminal tools such as Claude Code draw tables with box characters and wrap long cells.
describe('normalizePastedText: tables copied from a terminal', () => {
  it('turns a box-drawn table into a markdown table', () => {
    const pasted = [
      'Results:',
      '┌──────────┬───────────┐',
      '│ Scenario │ Status    │',
      '├──────────┼───────────┤',
      '│ A. Only  │ published │',
      '│ D. None  │ None      │',
      '└──────────┴───────────┘',
      'All good.',
    ].join('\n');

    expect(normalizePastedText(pasted)).toBe('Results:\n\n| Scenario | Status |\n| --- | --- |\n| A. Only | published |\n| D. None | None |\n\nAll good.');
  });

  it('joins a cell wrapped over several lines when a line separates every row', () => {
    const pasted = [
      '  ┌───────────────┬──────────────────┐',
      '  │ Channel       │ Message          │',
      '  │ scenario      │                  │',
      '  ├───────────────┼──────────────────┤',
      '  │ A. Digital    │ "Product         │',
      '  │ Catalog Only  │ published."      │',
      '  ├───────────────┼──────────────────┤',
      '  │ D. Nothing    │ No channels      │',
      '  │ Selected      │ published        │',
      '  └───────────────┴──────────────────┘',
    ].join('\n');

    expect(normalizePastedText(pasted)).toBe(
      '| Channel scenario | Message |\n| --- | --- |\n| A. Digital Catalog Only | "Product published." |\n| D. Nothing Selected | No channels published |\n',
    );
  });

  it('reads heavy, double, rounded and ASCII borders', () => {
    for (const [top, row, sep, bottom] of [
      ['┏━━━┳━━━┓', '┃ a ┃ b ┃', '┣━━━╋━━━┫', '┗━━━┻━━━┛'],
      ['╔═══╦═══╗', '║ a ║ b ║', '╠═══╬═══╣', '╚═══╩═══╝'],
      ['╭───┬───╮', '│ a │ b │', '├───┼───┤', '╰───┴───╯'],
      ['+---+---+', '| a | b |', '+---+---+', '+---+---+'],
    ]) {
      expect(normalizePastedText([top, row.replace('a', 'x').replace('b', 'y'), sep, row, bottom].join('\n'))).toBe('| x | y |\n| --- | --- |\n| a | b |\n');
    }
  });

  it('keeps | inside a cell, and leaves markdown tables, diffs and rules alone', () => {
    expect(normalizePastedText('┌───┬───┐\n│ a|b │ c │\n└───┴───┘')).toBe('| a\\|b | c |\n| --- | --- |\n');
    for (const text of ['| x | y |\n| --- | --- |\n| 1 | 2 |', '+++ b/src/app.ts\n--- a/src/app.ts', 'Text\n\n---\n\nMore', '+-----']) {
      expect(normalizePastedText(text)).toBe(text);
    }
  });

  it('never changes a box table inside a code fence', () => {
    const code = '```\n┌───┐\n│ a │\n└───┘\n```';
    expect(normalizePastedText(code)).toBe(code);
  });
});
