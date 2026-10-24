import { describe, expect, it } from 'vitest';
import { applyWorkspaceGlossary, GlossaryError, parseWorkspaceGlossary, type LoadedGlossary, annotations, protectedTerms } from '../../src/glossary/glossary';
import { protectTerms } from '../../src/glossary/protectTerms';

const BUILT_IN: LoadedGlossary = {
  keep: ['API', 'ledger technology', 'settlement'],
  annotate: { ledger: { gu: 'ખાતાવહી' } },
  translate: { inheritance: { gu: 'અનુવંશિકતા (inheritance)' } },
};

describe('parseWorkspaceGlossary', () => {
  it('reads a file with any of the three sections, ignoring other fields', () => {
    expect(parseWorkspaceGlossary({ description: 'mine', keep: ['AcmePay'] }, 'g.json')).toEqual({
      keep: ['AcmePay'],
      annotate: {},
      translate: {},
    });
  });

  it('accepts an empty object', () => {
    expect(parseWorkspaceGlossary({}, 'g.json')).toEqual({ keep: [], annotate: {}, translate: {} });
  });

  it.each([
    [[], 'must be a JSON object'],
    [{ keep: 'AcmePay' }, '"keep" must be a list'],
    [{ annotate: { settlement: {} } }, 'needs text in at least one language'],
    [{ keep: ['AcmePay'], translate: { acmepay: { gu: 'a' } } }, 'lists "acmepay" twice'],
  ])('names the problem in a bad file %#', (data, message) => {
    expect(() => parseWorkspaceGlossary(data, '.bhashabridge/glossary.json')).toThrow(GlossaryError);
    expect(() => parseWorkspaceGlossary(data, '.bhashabridge/glossary.json')).toThrow(message);
  });
});

describe('applyWorkspaceGlossary', () => {
  it('adds the project terms to the built-in ones', () => {
    const merged = applyWorkspaceGlossary(BUILT_IN, { keep: ['AcmePay'], annotate: {}, translate: {} });

    expect(merged.keep).toEqual(['API', 'ledger technology', 'settlement', 'AcmePay']);
    expect(merged.annotate).toEqual(BUILT_IN.annotate);
  });

  it('lets a project term win over a built-in one, whatever its treatment', () => {
    const merged = applyWorkspaceGlossary(BUILT_IN, {
      keep: ['Inheritance'],
      annotate: { Settlement: { gu: 'ચુકવણીની પતાવટ' } },
      translate: { ledger: { gu: 'ખાતાવહી' } },
    });

    expect(merged.keep).toEqual(['API', 'ledger technology', 'Inheritance']);
    expect(Object.keys(merged.annotate)).toEqual(['Settlement']);
    expect(Object.keys(merged.translate)).toEqual(['ledger']);
  });

  it('protects the project terms during translation', () => {
    const merged = applyWorkspaceGlossary(BUILT_IN, { keep: ['AcmePay', 'OrderService'], annotate: {}, translate: {} });
    const guarded = protectTerms('AcmePay calls OrderService through the API.', merged.keep);

    expect([...guarded.placeholders.values()]).toEqual(['AcmePay', 'OrderService', 'API']);
  });

  it('changes nothing without a project file', () => {
    expect(applyWorkspaceGlossary(BUILT_IN, undefined)).toBe(BUILT_IN);
  });

  it("trusts a project's own renderings unless marked reviewed: false", () => {
    const parsed = parseWorkspaceGlossary(
      {
        annotate: {
          settlement: { gu: 'ચુકવણીની પતાવટ' },
          payout: { gu: 'ચુકવણી', reviewed: false },
        },
      },
      'g.json',
    );

    expect(annotations(parsed, 'gu')).toEqual({ settlement: 'ચુકવણીની પતાવટ' });
    expect(protectedTerms(parsed, 'gu')).toContain('payout'); // stays English, no meaning added
  });
});

