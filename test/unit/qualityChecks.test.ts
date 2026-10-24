import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { normalizePastedText } from '../../src/parser/normalizePaste';
import { checkTranslation, readSample } from '../../src/quality/checks';

const INPUT = 'The `users` array is undefined.\n\n```js\nconst names = users.map(getName);\n```\n\nCheck the API response first.';
const KEEP = ['array', 'API'];

const passed = (input: string, output: string) => Object.fromEntries(checkTranslation(input, output, KEEP).map(c => [c.name, c.passed]));

describe('checkTranslation', () => {
  it('passes a good translation', () => {
    const output = '`users` array undefined છે.\n\n```js\nconst names = users.map(getName);\n```\n\nપહેલાં API response તપાસો.';

    expect(checkTranslation(INPUT, output, KEEP).every(c => c.passed)).toBe(true);
  });

  it('catches changed code', () => {
    const output = '`users` array undefined છે.\n\n```js\nconst નામો = users.map(getName);\n```\n\nપહેલાં API response તપાસો.';

    expect(passed(INPUT, output)['Code unchanged']).toBe(false);
  });

  it('catches a glossary term that was translated', () => {
    const output = '`users` એરે undefined છે.\n\n```js\nconst names = users.map(getName);\n```\n\nપહેલાં API response તપાસો.';

    expect(passed(INPUT, output)['Glossary terms kept in English']).toBe(false);
  });

  it('catches leftover placeholders and part markers', () => {
    expect(passed(INPUT, `${INPUT}\nSKIP_004`)['No leftover placeholders']).toBe(false);
    expect(passed(INPUT, `<<<2>>>\n${INPUT}`)['No leftover placeholders']).toBe(false);
  });

  it('catches a changed structure', () => {
    expect(passed(INPUT, INPUT.replace(/\n\n/g, ' '))['Structure kept']).toBe(false);
  });
});

describe('readSample', () => {
  it('reads the domains line and removes it', () => {
    expect(readSample('<!-- domains: healthcare, finance-banking -->\nText here.')).toEqual({
      domains: ['healthcare', 'finance-banking'],
      markdown: 'Text here.',
    });
  });

  it('leaves a sample without a domains line unchanged', () => {
    expect(readSample('Plain text.')).toEqual({ domains: [], markdown: 'Plain text.' });
  });
});

describe('checkTranslation: whole words', () => {
  // From the real quality run: these three were false alarms.
  it.each([
    ['`customer.getAddress()` is null for customers without an address.', '`customer.getAddress()` સરનામા વગરના ગ્રાહકો માટે null છે.'],
    ['Call `text.match(re)` once; it matches too much.', '`text.match(re)` એક વાર call કરો; તે વધુ મેચ કરે છે.'],
    ['The undertrained model needs:\n\n```bash\npython agent.py --train\n```', 'અધૂરું ટ્રેન થયેલું model:\n\n```bash\npython agent.py --train\n```'],
  ])('does not count code inside longer words: %s', (input, output) => {
    expect(passed(input, output)['Code unchanged']).toBe(true);
  });

  it('still notices code that went missing or was translated', () => {
    expect(passed('Call `customer.save()` now.', 'હવે સાચવો.')['Code unchanged']).toBe(false);
    expect(passed('Call `save` now, then save again.', 'હવે `સાચવો` કરો.')['Code unchanged']).toBe(false);
  });
});

describe('quality samples', () => {
  const folder = path.resolve(__dirname, '../quality/samples');
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.md'));
  const domainIds = fs.readdirSync(path.resolve(__dirname, '../../glossary/domains')).map(f => f.replace(/\.json$/, ''));

  it('has 22 samples, each with code', () => {
    expect(files).toHaveLength(22);
    for (const file of files) {
      // Checked after the paste repair, as in the panel: some samples are copied text.
      expect(normalizePastedText(fs.readFileSync(path.join(folder, file), 'utf8')), file).toMatch(/```|`[^`]+`/);
    }
  });

  it('names only real glossary domains', () => {
    for (const file of files) {
      for (const domain of readSample(fs.readFileSync(path.join(folder, file), 'utf8')).domains) {
        expect(domainIds, `${file}: ${domain}`).toContain(domain);
      }
    }
  });
});
