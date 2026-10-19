import { describe, expect, it } from 'vitest';
import { annotateFirstUse, protectTerms, restoreTerms } from '../../src/glossary/protectTerms';

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

  it('matches a capitals-only term only in capitals', () => {
    const result = protectTerms('IT teams use it daily. The PO and the po box. APIs, not apis.', ['IT', 'PO', 'API']);

    expect([...result.placeholders.values()]).toEqual(['IT', 'PO', 'APIs']);
  });

  it('matches y -> ies plurals', () => {
    const result = protectTerms('Two dependencies and one dependency; many queries.', ['dependency', 'query']);

    expect([...result.placeholders.values()]).toEqual(['dependencies', 'dependency', 'queries']);
  });

  it('handles terms with symbols', () => {
    const result = protectTerms('Use C++ or C#, then .NET and CI/CD.', ['C++', 'C#', '.NET', 'CI/CD']);

    expect([...result.placeholders.values()]).toEqual(['C++', 'C#', '.NET', 'CI/CD']);
  });
});

describe('annotateFirstUse', () => {
  it('adds the meaning after the first use only, across texts in order', () => {
    const texts = ['ledger નોંધ.', 'બીજો ledger અને ledger.'];

    expect(annotateFirstUse(texts, { ledger: 'ખાતાવહી' })).toEqual(['ledger (ખાતાવહી) નોંધ.', 'બીજો ledger અને ledger.']);
  });

  it('keeps the original capitalisation and handles several terms', () => {
    const result = annotateFirstUse(['Ledger and Collateral.'], { ledger: 'ખાતાવહી', collateral: 'જામીનગીરી' });

    expect(result).toEqual(['Ledger (ખાતાવહી) and Collateral (જામીનગીરી).']);
  });

  it('never touches placeholders and leaves texts without the term alone', () => {
    expect(annotateFirstUse(['SKIP_001 here.', 'nothing'], { ledger: 'ખાતાવહી' })).toEqual(['SKIP_001 here.', 'nothing']);
  });
});

