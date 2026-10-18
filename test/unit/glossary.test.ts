import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { GlossaryError, loadDefaultGlossary, parseGlossary, promptGlossary } from '../../src/glossary/glossary';

const ROOT = path.resolve(__dirname, '../..');

describe('default glossary file', () => {
  it('loads and keeps the SDD terms in English', async () => {
    const glossary = await loadDefaultGlossary(ROOT);

    for (const term of ['variable', 'function', 'loop', 'array', 'object', 'polymorphism', 'dependency injection', 'asynchronous', 'callback', 'promise', 'API', 'database', 'query', 'compiler', 'runtime']) {
      expect(glossary.keep, term).toContain(term);
    }
    expect(glossary.keep.length).toBeGreaterThanOrEqual(100);
  });

  it('gives inheritance a set rendering in both languages', async () => {
    const glossary = await loadDefaultGlossary(ROOT);

    expect(promptGlossary(glossary, 'gu')).toEqual({ inheritance: 'અનુવંશિકતા (inheritance)' });
    expect(promptGlossary(glossary, 'mr')).toEqual({ inheritance: 'अनुवांशिकता (inheritance)' });
  });

  it('reports a missing file clearly', async () => {
    await expect(loadDefaultGlossary('/no/such/folder')).rejects.toThrow('glossary/default.json');
  });
});

describe('parseGlossary', () => {
  it.each([
    [null, 'needs a "terms" object'],
    [{ terms: [] }, 'needs a "terms" object'],
    [{ terms: { array: { treatment: 'skip' } } }, 'Glossary term "array"'],
    [{ terms: { inheritance: { treatment: 'translate', gu: 'x' } } }, 'Glossary term "inheritance"'],
    [{ terms: { ' ': { treatment: 'keep' } } }, 'empty term'],
  ])('names the problem in a bad glossary %#', (data, message) => {
    expect(() => parseGlossary(data)).toThrow(GlossaryError);
    expect(() => parseGlossary(data)).toThrow(message);
  });
});
