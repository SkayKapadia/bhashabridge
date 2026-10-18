import { describe, expect, it } from 'vitest';
import { protectTerms, restoreTerms } from '../../src/glossary/protectTerms';

const KEEP = ['array', 'dependency array', 'state', 'API', 'Node.js', 're-render', 'class'];

describe('protectTerms', () => {
  it('protects every use of a term, the case from the real Sarvam test', () => {
    const result = protectTerms('The array does not exist. Initialise state with an empty array.', KEEP);

    expect(result.text).toBe('The SKIP_001 does not exist. Initialise SKIP_002 with an empty SKIP_003.');
    expect([...result.placeholders.values()]).toEqual(['array', 'state', 'array']);
  });

  it('protects the longest phrase as one unit', () => {
    const result = protectTerms('Keep the dependency array empty.', KEEP);

    expect(result.text).toBe('Keep the SKIP_001 empty.');
    expect(result.placeholders.get('SKIP_001')).toBe('dependency array');
  });

  it('keeps the original capitalisation, plurals and spacing', () => {
    const result = protectTerms('Arrays and APIs, two Classes, a dependency\narray.', KEEP);

    expect([...result.placeholders.values()]).toEqual(['Arrays', 'APIs', 'Classes', 'dependency\narray']);
    expect(restoreTerms(result.text, result.placeholders)).toBe('Arrays and APIs, two Classes, a dependency\narray.');
  });

  it('matches whole words only', () => {
    const result = protectTerms('Use arrayList, subarray, statement and API_KEY, not stately.', KEEP);

    expect(result.placeholders.size).toBe(0);
  });

  it('handles terms with punctuation inside', () => {
    const result = protectTerms('Install Node.js, then re-render the page.', KEEP);

    expect([...result.placeholders.values()]).toEqual(['Node.js', 're-render']);
  });

  it('never reuses a code placeholder or a token already in the text', () => {
    const result = protectTerms('Call SKIP_001 on the array, see SKIP_002.', KEEP, new Set(['SKIP_001', 'SKIP_003']));

    expect(result.text).toBe('Call SKIP_001 on the SKIP_004, see SKIP_002.');
    expect(result.placeholders.get('SKIP_004')).toBe('array');
  });

  it('works with a Gujarati ending attached after the token', () => {
    const result = protectTerms('Fill the array.', KEEP);
    const translated = `${[...result.placeholders.keys()][0]}ને ભરો.`;

    expect(restoreTerms(translated, result.placeholders)).toBe('arrayને ભરો.');
  });

  it('leaves text alone when there are no terms', () => {
    expect(protectTerms('Nothing to do here.', [])).toEqual({ text: 'Nothing to do here.', placeholders: new Map() });
  });
});
