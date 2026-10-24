import { describe, expect, it, vi } from 'vitest';
import { joinChunk, splitChunkReply } from '../../src/chunking/chunker';
import { TranslationError } from '../../src/translation/errors';
import { translateMarkdown } from '../../src/translation/translateMarkdown';
import type { TranslateRequest, TranslationProvider } from '../../src/translation/translationProvider';

// Marks each part as translated and keeps its placeholders and markers, like a
// well-behaved provider. `maxChunkChars` controls how segments are grouped.
function fakeProvider(
  delayFor: (text: string) => number = () => 0,
  maxChunkChars?: number,
): TranslationProvider & { calls: TranslateRequest[] } {
  const calls: TranslateRequest[] = [];
  return {
    id: 'fake',
    maxChunkChars,
    calls,
    async translate(request) {
      calls.push(request);
      await new Promise(resolve => setTimeout(resolve, delayFor(request.text)));
      const count = request.text.match(/<<<\d+>>>/g)?.length ?? 0;
      const parts = count > 0 ? splitChunkReply(request.text, count)! : [request.text];
      const translated = parts.map(part => `[${request.targetLanguage}] ${part}`);
      return { translatedText: count > 0 ? joinChunk(translated) : translated[0]! };
    },
  };
}

describe('translateMarkdown', () => {
  it('translates the text and keeps the code exactly (checklist sample)', async () => {
    const provider = fakeProvider();
    const input = 'The function fails because users is undefined. Add a check before calling map.\nconst names = users.map(getName);';

    const result = await translateMarkdown(input, { provider, targetLanguage: 'gu' });

    expect(result).toBe('[gu] The function fails because users is undefined. Add a check before calling map.\nconst names = users.map(getName);');
    // users and map appear in the code line, so they never reach the provider either.
    expect(provider.calls.map(c => c.text)).toEqual(['The function fails because SKIP_001 is undefined. Add a check before calling SKIP_002.']);
  });

  it('keeps segment order even when replies arrive out of order', async () => {
    const provider = fakeProvider(text => (text.startsWith('First') ? 30 : 0), 30); // one segment per request
    const input = 'First paragraph here.\n\nSecond paragraph here.\n\n- Third item here';

    const result = await translateMarkdown(input, { provider, targetLanguage: 'gu' });

    expect(result).toBe('[gu] First paragraph here.\n\n[gu] Second paragraph here.\n\n- [gu] Third item here');
  });

  it('reports progress', async () => {
    const onProgress = vi.fn();
    await translateMarkdown('One paragraph.\n\nTwo paragraph.', { provider: fakeProvider(undefined, 20), targetLanguage: 'gu', onProgress });

    expect(onProgress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
  });

  it('refuses very short input without calling the provider', async () => {
    const provider = fakeProvider();
    const error = await translateMarkdown('  hi  ', { provider, targetLanguage: 'gu' }).catch(e => e);

    expect(error).toBeInstanceOf(TranslationError);
    expect(error.code).toBe('input');
    expect(provider.calls).toHaveLength(0);
  });

  it('returns code-only input unchanged without calling the provider', async () => {
    const provider = fakeProvider();
    const input = '```js\nconst names = users.map(getName);\n```';

    expect(await translateMarkdown(input, { provider, targetLanguage: 'gu' })).toBe(input);
    expect(provider.calls).toHaveLength(0);
  });

  it('stops sending segments after the first failure', async () => {
    const translate = vi.fn(async () => {
      throw new TranslationError('invalid-key', 'bad key');
    });
    const input = Array.from({ length: 10 }, (_, i) => `Paragraph number ${i}.`).join('\n\n');

    await expect(translateMarkdown(input, { provider: { id: 'x', translate }, targetLanguage: 'gu', concurrency: 1 })).rejects.toThrow('bad key');
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('keeps glossary terms in English and sends the set renderings in the prompt', async () => {
    const provider = fakeProvider();
    const input = 'The array does not exist yet.\n\nKeep the dependency array empty and avoid inheritance here.';

    const result = await translateMarkdown(input, {
      provider,
      targetLanguage: 'gu',
      keepTerms: ['array', 'dependency array'],
      glossary: { inheritance: 'અનુવંશિકતા (inheritance)' },
    });

    // Both paragraphs travel in one request, so their term placeholders are numbered together.
    expect(provider.calls.map(c => c.text)).toEqual([
      '<<<1>>>\nThe SKIP_001 does not exist yet.\n\n<<<2>>>\nKeep the SKIP_002 empty and avoid inheritance here.',
    ]);
    expect(provider.calls[0]!.glossary).toEqual({ inheritance: 'અનુવંશિકતા (inheritance)' });
    expect(result).toBe('[gu] The array does not exist yet.\n\n[gu] Keep the dependency array empty and avoid inheritance here.');
  });

  it('does not protect terms inside code', async () => {
    const provider = fakeProvider();
    await translateMarkdown('Use `array.map` on the array.', { provider, targetLanguage: 'gu', keepTerms: ['array'] });

    expect(provider.calls[0]!.text).toBe('Use SKIP_001 on the SKIP_002.');
  });

  it('sends the 8-part sample from the real Sarvam test in one request', async () => {
    const provider = fakeProvider();
    const input = [
      '## Why your code crashes',
      'The error `TypeError` happens because `users` is undefined when the component first renders.',
      'To fix it, give `users` a default value and check it before calling `map`:',
      '```js\nconst [users, setUsers] = useState([]);\n```',
      'A quick alternative is optional chaining:\nconst names = users?.map(getName);',
      'Remember these points:',
      '- Always initialise state with the right type.\n- Use a loading flag to show a spinner.\n- Keep the dependency array empty.',
    ].join('\n\n');

    const result = await translateMarkdown(input, { provider, targetLanguage: 'gu' });

    expect(provider.calls).toHaveLength(1);
    expect(result).toContain('## [gu] Why your code crashes');
    expect(result).toContain('```js\nconst [users, setUsers] = useState([]);\n```');
    expect(result).toContain('const names = users?.map(getName);');
    expect(result).toContain('- [gu] Keep the dependency array empty.');
  });

  it('splits a paragraph that is too long and joins its translation back', async () => {
    const provider = fakeProvider(undefined, 40);
    const input = 'The first sentence is long enough. The second sentence is long too.';

    const result = await translateMarkdown(input, { provider, targetLanguage: 'gu' });

    expect(provider.calls.map(c => c.text)).toEqual(['The first sentence is long enough.', 'The second sentence is long too.']);
    expect(result).toBe('[gu] The first sentence is long enough. [gu] The second sentence is long too.');
  });

  it('falls back to one segment per request when the reply loses a marker', async () => {
    const calls: string[] = [];
    const provider: TranslationProvider = {
      id: 'merging',
      async translate(request) {
        calls.push(request.text);
        // Merges the parts: drops the markers.
        return { translatedText: `[gu] ${request.text.replace(/<<<\d+>>>\n/g, '')}` };
      },
    };

    const result = await translateMarkdown('First paragraph.\n\nSecond paragraph.', { provider, targetLanguage: 'gu' });

    expect(calls).toEqual(['<<<1>>>\nFirst paragraph.\n\n<<<2>>>\nSecond paragraph.', 'First paragraph.', 'Second paragraph.']);
    expect(result).toBe('[gu] First paragraph.\n\n[gu] Second paragraph.');
  });

  it('falls back when a placeholder moves to another part, so code never changes paragraph', async () => {
    const calls: string[] = [];
    const provider: TranslationProvider = {
      id: 'mover',
      async translate(request) {
        calls.push(request.text);
        if (request.text.includes('<<<1>>>')) {
          // Moves SKIP_001 from part 1 to part 2; every token still appears once overall.
          return { translatedText: '<<<1>>>\nCall first.\n\n<<<2>>>\nThen SKIP_001 render.' };
        }
        return { translatedText: request.text };
      },
    };

    const result = await translateMarkdown('Call `load()` first.\n\nThen render.', { provider, targetLanguage: 'gu' });

    expect(calls).toHaveLength(3);
    expect(result).toBe('Call `load()` first.\n\nThen render.');
  });

  it('falls back when the joined reply fails the placeholder check', async () => {
    let first = true;
    const provider: TranslationProvider = {
      id: 'lossy-once',
      async translate(request) {
        if (first) {
          first = false;
          throw new TranslationError('placeholders', 'lost SKIP_001');
        }
        return { translatedText: request.text };
      },
    };

    const result = await translateMarkdown('Call `load()` first.\n\nThen render it.', { provider, targetLanguage: 'gu' });

    expect(result).toBe('Call `load()` first.\n\nThen render it.');
  });

  it('adds the meaning of an annotated term after its first use, without sending the term', async () => {
    const provider = fakeProvider();
    const input = 'Check the ledger first.\n\nThen close the ledger.';

    const result = await translateMarkdown(input, {
      provider,
      targetLanguage: 'gu',
      keepTerms: ['ledger'],
      annotations: { ledger: 'ખાતાવહી' },
    });

    expect(provider.calls.map(c => c.text).join(' ')).not.toContain('ledger');
    expect(result).toBe('[gu] Check the ledger (ખાતાવહી) first.\n\n[gu] Then close the ledger.');
  });

  it('keeps a table whole: each cell translated, one line, no stray |', async () => {
    const provider: TranslationProvider = {
      id: 'odd',
      async translate(request) {
        // A translator that adds a line break and a | inside cell text.
        const count = request.text.match(/<<<\\d+>>>/g)?.length ?? 0;
        const parts = count > 0 ? splitChunkReply(request.text, count)! : [request.text];
        const translated = parts.map(p => (p === 'Needs' ? 'જરૂર\na|b' : `[gu] ${p}`));
        return { translatedText: count > 0 ? joinChunk(translated) : translated[0]! };
      },
    };

    const result = await translateMarkdown('| Option | Needs |\n| --- | --- |\n| Share | VS Code |', { provider, targetLanguage: 'gu' });

    expect(result).toBe('| [gu] Option | જરૂર a\\|b |\n| --- | --- |\n| [gu] Share | [gu] VS Code |');
  });
});

// From the channel table in a real Gujarati test: cells sent one at a time came back with
// "<<<1>>>" markers the model made up, and they showed in the translation.
describe('translateMarkdown: made-up part markers', () => {
  it('keeps only the first part of the reply for a single paragraph', async () => {
    const provider: TranslationProvider = {
      id: 'fake',
      async translate() {
        return { translatedText: '<<<1>>> કોઈ ચેનલો પબ્લિશ નથી થઈ <<<2>>> No channels published <<<3>>> કોઈ ચેનલો પબ્લિશ નથી થઈ' };
      },
    };

    expect(await translateMarkdown('No channels published', { provider, targetLanguage: 'gu' })).toBe('કોઈ ચેનલો પબ્લિશ નથી થઈ');
  });

  it('cleans the replies of cells re-sent one at a time', async () => {
    const provider: TranslationProvider = {
      id: 'fake',
      async translate(request) {
        if (request.text.includes('<<<1>>>')) {
          return { translatedText: 'the markers got lost' };
        }
        return { translatedText: `<<<1>>>\n[gu] ${request.text}\n<<<2>>>` };
      },
    };

    expect(await translateMarkdown('| Status | Message |\n| --- | --- |\n| Not included | Omitted from active channels |', { provider, targetLanguage: 'gu' })).toBe(
      '| [gu] Status | [gu] Message |\n| --- | --- |\n| [gu] Not included | [gu] Omitted from active channels |',
    );
  });
});

// From the real quality run: one paragraph whose reply damaged a placeholder failed the
// whole Docker answer and the channel table.
describe('translateMarkdown: a reply that damages a placeholder', () => {
  const placeholderError = () => new TranslationError('placeholders', 'The translation changed the code placeholder SKIP_001.');

  it('tries the paragraph once more', async () => {
    let calls = 0;
    const provider: TranslationProvider = {
      id: 'fake',
      async translate(request) {
        if (++calls === 1) {
          throw placeholderError();
        }
        return { translatedText: `[gu] ${request.text}` };
      },
    };
    const kept = vi.fn();

    expect(await translateMarkdown('Run `npm ci` first.', { provider, targetLanguage: 'gu', onKeptEnglish: kept })).toBe('[gu] Run `npm ci` first.');
    expect(calls).toBe(2);
    expect(kept).not.toHaveBeenCalled();
  });

  it('then goes sentence by sentence, keeping only the failing sentence in English', async () => {
    const provider: TranslationProvider = {
      id: 'fake',
      async translate(request) {
        // The whole paragraph and the sentence with the placeholder always fail.
        if (request.text.includes('SKIP_001')) {
          throw placeholderError();
        }
        return { translatedText: `[gu] ${request.text}` };
      },
    };
    const kept = vi.fn();

    const result = await translateMarkdown('The build is slow. Copy `package.json` first. Then install.', { provider, targetLanguage: 'gu', onKeptEnglish: kept });

    expect(result).toBe('[gu] The build is slow. Copy `package.json` first. [gu] Then install.');
    expect(kept).toHaveBeenCalledWith(1);
  });

  it('keeps a one-sentence paragraph in English and translates the rest of the answer', async () => {
    const provider: TranslationProvider = {
      id: 'fake',
      maxChunkChars: 30,
      async translate(request) {
        if (request.text.includes('SKIP_')) {
          throw placeholderError();
        }
        return { translatedText: `[gu] ${request.text}` };
      },
    };
    const kept = vi.fn();

    const result = await translateMarkdown('First paragraph here.\n\nCopy `package.json` first.\n\nLast paragraph here.', { provider, targetLanguage: 'gu', onKeptEnglish: kept });

    expect(result).toBe('[gu] First paragraph here.\n\nCopy `package.json` first.\n\n[gu] Last paragraph here.');
    expect(kept).toHaveBeenCalledWith(1);
  });

  it('still fails at once for other errors, such as a wrong key', async () => {
    const translate = vi.fn(async () => {
      throw new TranslationError('invalid-key', 'Bad key.');
    });

    await expect(translateMarkdown('Some text to translate here.', { provider: { id: 'fake', translate }, targetLanguage: 'gu' })).rejects.toThrow('Bad key.');
    expect(translate).toHaveBeenCalledTimes(1);
  });
});
