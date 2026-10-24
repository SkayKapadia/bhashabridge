import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { combineDomains, glossaryOptions, loadGlossaryDomains, protectedTerms } from '../../src/glossary/glossary';
import { parseMarkdown } from '../../src/parser/markdownParser';
import { normalizePastedText } from '../../src/parser/normalizePaste';
import { checkTranslation, readSample } from '../../src/quality/checks';
import { translateMarkdown } from '../../src/translation/translateMarkdown';
import type { TranslationProvider } from '../../src/translation/translationProvider';
import { renderBlockPairs } from '../../src/webview/renderMarkdown';

// Answers that broke in real Gujarati tests, kept as they were pasted. Each fix they led
// to is checked here on the whole answer, with a stand-in translator.
const ROOT = path.resolve(__dirname, '../..');
const SAMPLES = ['21-flappy-bird-copied-chat.md', '22-channel-table-copied-chat.md'];

function load(file: string) {
  const sample = readSample(fs.readFileSync(path.join(ROOT, 'test/quality/samples', file), 'utf8'));
  return { ...sample, input: normalizePastedText(sample.markdown) };
}

// Marks each part as translated and keeps the part markers, like a well-behaved provider.
const provider: TranslationProvider = {
  id: 'fake',
  maxChunkChars: 2000,
  async translate(request) {
    return { translatedText: request.text.replace(/^(<<<\d+>>>\n)?/gm, (marker, m) => (m ? `${m}[gu] ` : marker)).replace(/^(?!<<<|\[gu\])/, '[gu] ') };
  },
};

describe('real pastes', () => {
  it.each(SAMPLES)('%s: code, structure and glossary terms survive', async file => {
    const { input, domains } = load(file);
    const all = await loadGlossaryDomains(ROOT);
    const glossary = combineDomains(all, [...all.filter(d => d.isDefault).map(d => d.id), ...domains]);

    const output = await translateMarkdown(input, { provider, targetLanguage: 'gu', ...glossaryOptions(glossary, 'gu') });

    for (const check of checkTranslation(input, output, protectedTerms(glossary, 'gu'))) {
      expect(check.passed, `${check.name}: ${check.detail}`).toBe(true);
    }
    expect(output).not.toMatch(/<<<\d+>>>/);
    // Learning mode pairs every block, so side by side lines up.
    expect(renderBlockPairs(input, output).length).toBeGreaterThan(1);
  });

  it('Flappy Bird: every sentence reaches the translator whole', () => {
    const segments = parseMarkdown(load(SAMPLES[0]!).input).segments.map(s => s.text.trim());

    for (const fragment of ['In', 'As seen in', 'Notice how', 'defines:', ', change:', ':']) {
      expect(segments, fragment).not.toContain(fragment);
    }
    expect(segments.some(s => /As seen in SKIP_\d+, the best score/.test(s))).toBe(true);
  });

  it('Flappy Bird: code under a language label becomes a code block', () => {
    const { input } = load(SAMPLES[0]!);

    expect(input).toContain('```python\ndef __init__(self, state_dim=12, action_dim=2, hidden_dim=256):\n```');
    expect(input).toContain('```yaml\nnetwork_sync_rate: 1000\nlearning_rate_a: 0.0003\n```');
    expect(input).toContain('```bash\npython agent.py flappybirdv0 --train\n```');
  });

  it('channel table: becomes a table, and labels and statuses are never sent', () => {
    const { input } = load(SAMPLES[1]!);
    const segments = parseMarkdown(input).segments.map(s => s.text);

    expect(input).toContain('| A. Digital Catalog Only | published |');
    expect(segments).toContain('Digital Catalog Only');
    expect(segments.some(s => /^[A-F]\. /.test(s))).toBe(false);
  });
});
