import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { protectTerms } from '../../src/glossary/protectTerms';
import {
  annotations,
  checkDomains,
  combineDomains,
  GlossaryError,
  loadGlossaryDomains,
  parseDomain,
  promptGlossary,
  protectedTerms,
  type GlossaryDomain,
} from '../../src/glossary/glossary';

const ROOT = path.resolve(__dirname, '../..');

function domain(overrides: Partial<GlossaryDomain> & { id: string }): GlossaryDomain {
  return { label: overrides.id, group: 'software', isDefault: true, description: '', keep: [], annotate: {}, translate: {}, ...overrides };
}

describe('glossary domain files', () => {
  it('all load, with unique ids and no term treated two ways', async () => {
    const domains = await loadGlossaryDomains(ROOT); // runs parseDomain and checkDomains on every file

    expect(domains.length).toBeGreaterThanOrEqual(30);
  });

  it('turn on software development by default and business domains on request', async () => {
    const domains = await loadGlossaryDomains(ROOT);

    expect(domains.filter(d => d.isDefault).every(d => d.group === 'software')).toBe(true);
    expect(domains.filter(d => d.group === 'software').every(d => d.isDefault)).toBe(true);
    for (const id of ['supply-chain-logistics', 'healthcare', 'finance-banking']) {
      expect(domains.find(d => d.id === id)?.isDefault, id).toBe(false);
    }
  });

  it('keep the SDD terms in English by default', async () => {
    const domains = await loadGlossaryDomains(ROOT);
    const glossary = combineDomains(domains, domains.filter(d => d.isDefault).map(d => d.id));

    for (const term of ['variable', 'function', 'loop', 'array', 'object', 'polymorphism', 'dependency injection', 'asynchronous', 'callback', 'promise', 'API', 'database', 'query', 'compiler', 'runtime']) {
      expect(glossary.keep, term).toContain(term);
    }
    // The inheritance rendering is not reviewed yet, so the term stays in English for now.
    expect(promptGlossary(glossary, 'gu')).toEqual({});
    expect(protectedTerms(glossary, 'gu')).toContain('inheritance');
  });

  it('protect common commands written without backticks', async () => {
    const domains = await loadGlossaryDomains(ROOT);
    const glossary = combineDomains(domains, domains.filter(d => d.isDefault).map(d => d.id));
    const guarded = protectTerms('Clone it, run npm install, then git push your branch.', protectedTerms(glossary, 'gu'));

    expect([...guarded.placeholders.values()]).toContain('npm install');
    expect([...guarded.placeholders.values()]).toContain('git push');
  });

  it('match the domain list in package.json, so Settings offers every domain', async () => {
    const domains = await loadGlossaryDomains(ROOT);
    const setting = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).contributes.configuration.properties['bhashabridge.glossaryDomains'];

    expect([...setting.items.enum].sort()).toEqual(domains.map(d => d.id).sort());
    expect([...setting.default].sort()).toEqual(domains.filter(d => d.isDefault).map(d => d.id).sort());
  });

  it('avoid ordinary words that would freeze normal sentences', async () => {
    const domains = await loadGlossaryDomains(ROOT);
    const all = new Set(domains.flatMap(d => [...d.keep, ...Object.keys(d.annotate)]).map(t => t.toLowerCase()));

    for (const word of ['go', 'push', 'pull', 'fetch', 'order', 'balance', 'patient', 'stock', 'instance', 'switch', 'view', 'release', 'dot', 'gem', 'grid']) {
      expect(all.has(word), word).toBe(false);
    }
  });

  it('reports an unreadable folder clearly', async () => {
    await expect(loadGlossaryDomains('/no/such/folder')).rejects.toThrow('glossary/domains');
  });
});

describe('parseDomain', () => {
  const valid = { id: 'x', label: 'X', group: 'business', default: false, description: '', keep: ['SKU'] };

  it('reads a valid file and uses its reviewed renderings', () => {
    expect(parseDomain({ ...valid, annotate: { ledger: { gu: 'ખાતાવહી', reviewed: true } } }, 'x.json')).toMatchObject({
      id: 'x',
      isDefault: false,
      keep: ['SKU'],
      annotate: { ledger: { gu: 'ખાતાવહી' } },
    });
  });

  it.each([[false], [undefined]])('keeps a term in English while its rendering is not reviewed (reviewed: %s)', reviewed => {
    const domain = parseDomain(
      {
        ...valid,
        annotate: { ledger: { gu: 'ખાતાવહી', reviewed } },
        translate: { inheritance: { gu: 'અનુવંશિકતા', reviewed } },
      },
      'x.json',
    );

    // The entries stay, with no usable rendering: in every language the terms stay in English.
    expect(domain.annotate).toEqual({ ledger: {} });
    expect(domain.translate).toEqual({ inheritance: {} });
    expect(protectedTerms(combineDomains([domain], [domain.id]), 'gu')).toEqual(['SKU', 'ledger', 'inheritance']);
  });

  it.each([
    [{ ...valid, id: 'Bad Id' }, '"id"'],
    [{ ...valid, group: 'other' }, '"group"'],
    [{ ...valid, default: 'yes' }, '"default"'],
    [{ ...valid, keep: ['ok', ''] }, '"keep"'],
    [{ ...valid, annotate: { ledger: { reviewed: true } } }, 'needs text in at least one language'],
    [{ ...valid, annotate: { ledger: { gu: '  ' } } }, 'needs "gu" text'],
    [{ ...valid, annotate: { ledger: { gu: 'ખાતાવહી', mr: 'खातेवही' } } }, '"mr" is not a language BhashaBridge knows'],
    [{ ...valid, annotate: { ledger: { gu: 'ખાતાવહી', reviewed: ['gu', 'mr'] } } }, '"reviewed" must be true, false, or a list'],
    [{ ...valid, translate: { x: { gu: 'a', reviewed: 'no' } } }, '"reviewed"'],
  ])('names the problem in a bad file %#', (data, message) => {
    expect(() => parseDomain(data, 'x.json')).toThrow(GlossaryError);
    expect(() => parseDomain(data, 'x.json')).toThrow(message);
  });
});

describe('checkDomains and combineDomains', () => {
  it('allows a term in two domains when both treat it the same', () => {
    expect(() => checkDomains([domain({ id: 'a', keep: ['KYC'] }), domain({ id: 'b', keep: ['kyc'] })])).not.toThrow();
  });

  it('rejects a term treated differently in two domains', () => {
    const annotated = domain({ id: 'b', annotate: { ledger: { gu: 'ખાતાવહી' } } });
    expect(() => checkDomains([domain({ id: 'a', keep: ['ledger'] }), annotated])).toThrow('treated differently in glossary domains "a" and "b"');
  });

  it('rejects duplicate ids and a term listed twice in one domain', () => {
    expect(() => checkDomains([domain({ id: 'a' }), domain({ id: 'a' })])).toThrow('Two glossary files use the id "a"');
    expect(() => checkDomains([domain({ id: 'a', keep: ['API', 'api'] })])).toThrow('lists "api" twice');
  });

  it('merges only the enabled domains', () => {
    const domains = [
      domain({ id: 'web', keep: ['React'] }),
      domain({ id: 'finance', keep: ['UPI'], annotate: { ledger: { gu: 'ખાતાવહી' } } }),
    ];

    expect(combineDomains(domains, ['web'])).toEqual({ keep: ['React'], annotate: {}, translate: {} });
    const both = combineDomains(domains, ['web', 'finance']);
    expect(protectedTerms(both, 'gu')).toEqual(['React', 'UPI', 'ledger']);
    expect(annotations(both, 'gu')).toEqual({ ledger: 'ખાતાવહી' });
  });
});

describe('per-language renderings', () => {
  const valid = { id: 'x', label: 'X', group: 'business', default: false, description: '', keep: [] };

  it('accepts "reviewed" as a list of the language codes that were checked', () => {
    const domain = parseDomain({ ...valid, annotate: { ledger: { gu: 'ખાતાવહી', reviewed: ['gu'] } } }, 'x.json');

    expect(annotations(combineDomains([domain], ['x']), 'gu')).toEqual({ ledger: 'ખાતાવહી' });
  });

  it('keeps a translate term in English in a language with no usable rendering', () => {
    const glossary = { keep: [], annotate: {}, translate: { inheritance: {} } };

    expect(promptGlossary(glossary, 'gu')).toEqual({});
    expect(protectedTerms(glossary, 'gu')).toEqual(['inheritance']);
  });

  it('lists every glossary file language as a supported one', async () => {
    const domains = await loadGlossaryDomains(ROOT); // would refuse a rendering in an unknown language
    const written = new Set(domains.flatMap(d => [...Object.values(d.annotate), ...Object.values(d.translate)].flatMap(r => Object.keys(r))));

    expect([...written].every(code => code === 'gu')).toBe(true);
  });
});

