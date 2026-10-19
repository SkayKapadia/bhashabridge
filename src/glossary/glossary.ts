import { readdir, readFile } from 'fs/promises';
import * as path from 'path';
import type { Glossary, TargetLanguage } from '../translation/translationProvider';

// One file per domain in glossary/domains. Three ways to treat a term:
// - keep:      stays in English, guaranteed (protected like code before translation)
// - annotate:  stays in English, with its meaning added after the first use
// - translate: the model is asked to write the given rendering (listed in the prompt)
export type Renderings = Record<TargetLanguage, string>;

export interface GlossaryDomain {
  id: string;
  label: string;
  group: 'software' | 'business';
  isDefault: boolean;
  description: string;
  keep: string[];
  annotate: Record<string, Renderings>;
  translate: Record<string, Renderings>;
}

// The terms of the domains in use, merged.
export interface LoadedGlossary {
  keep: string[];
  annotate: Record<string, Renderings>;
  translate: Record<string, Renderings>;
}

export class GlossaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlossaryError';
  }
}

export async function loadGlossaryDomains(extensionPath: string): Promise<GlossaryDomain[]> {
  const folder = path.join(extensionPath, 'glossary', 'domains');
  let files: string[];
  try {
    files = (await readdir(folder)).filter(name => name.endsWith('.json')).sort();
  } catch {
    throw new GlossaryError('The built-in glossary (glossary/domains) could not be read.');
  }

  const domains: GlossaryDomain[] = [];
  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(await readFile(path.join(folder, file), 'utf8'));
    } catch {
      throw new GlossaryError(`Glossary file ${file} is not valid JSON.`);
    }
    domains.push(parseDomain(data, file));
  }
  checkDomains(domains);
  return domains;
}

// Checks one domain file, so a mistake in a contributed term is named instead of crashing later.
export function parseDomain(data: unknown, source: string): GlossaryDomain {
  const d = (data ?? {}) as Record<string, unknown>;
  const fail = (problem: string): never => {
    throw new GlossaryError(`Glossary file ${source}: ${problem}`);
  };

  if (typeof d.id !== 'string' || !/^[a-z0-9-]+$/.test(d.id)) fail('"id" must be lowercase letters, digits and dashes.');
  if (typeof d.label !== 'string' || !d.label.trim()) fail('needs a "label".');
  if (d.group !== 'software' && d.group !== 'business') fail('"group" must be "software" or "business".');
  if (typeof d.default !== 'boolean') fail('"default" must be true or false.');
  if (typeof d.description !== 'string') fail('needs a "description".');
  if (!Array.isArray(d.keep) || !d.keep.every(t => typeof t === 'string' && t.trim())) fail('"keep" must be a list of terms.');

  const renderings = (key: 'annotate' | 'translate'): Record<string, Renderings> => {
    const value = d[key] ?? {};
    if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`"${key}" must be an object.`);
    const out: Record<string, Renderings> = {};
    for (const [term, entry] of Object.entries(value as object)) {
      const { gu, mr, reviewed } = (entry ?? {}) as Record<string, unknown>;
      if (!term.trim() || typeof gu !== 'string' || !gu.trim() || typeof mr !== 'string' || !mr.trim()) {
        fail(`${key} term "${term}" needs "gu" and "mr" text.`);
      }
      if (reviewed !== undefined && typeof reviewed !== 'boolean') fail(`${key} term "${term}": "reviewed" must be true or false.`);
      out[term] = { gu: gu as string, mr: mr as string };
    }
    return out;
  };

  return {
    id: d.id as string,
    label: d.label as string,
    group: d.group as GlossaryDomain['group'],
    isDefault: d.default as boolean,
    description: d.description as string,
    keep: d.keep as string[],
    annotate: renderings('annotate'),
    translate: renderings('translate'),
  };
}

// Across all domains: ids are unique, and a term listed in two domains (KYC in both
// finance and insurance) is treated the same way in both.
export function checkDomains(domains: readonly GlossaryDomain[]): void {
  const ids = new Set<string>();
  const seen = new Map<string, { domain: string; treatment: string }>();
  for (const domain of domains) {
    if (ids.has(domain.id)) {
      throw new GlossaryError(`Two glossary files use the id "${domain.id}".`);
    }
    ids.add(domain.id);

    const entries: [string, string][] = [
      ...domain.keep.map(t => [t, 'keep'] as [string, string]),
      ...Object.entries(domain.annotate).map(([t, r]) => [t, `annotate ${r.gu} / ${r.mr}`] as [string, string]),
      ...Object.entries(domain.translate).map(([t, r]) => [t, `translate ${r.gu} / ${r.mr}`] as [string, string]),
    ];
    const inThisDomain = new Set<string>();
    for (const [term, treatment] of entries) {
      const key = term.trim().toLowerCase();
      if (inThisDomain.has(key)) {
        throw new GlossaryError(`Glossary domain "${domain.id}" lists "${term}" twice.`);
      }
      inThisDomain.add(key);
      const earlier = seen.get(key);
      if (earlier && earlier.treatment !== treatment) {
        throw new GlossaryError(`"${term}" is treated differently in glossary domains "${earlier.domain}" and "${domain.id}".`);
      }
      seen.set(key, { domain: domain.id, treatment });
    }
  }
}

export function combineDomains(domains: readonly GlossaryDomain[], enabledIds: readonly string[]): LoadedGlossary {
  const glossary: LoadedGlossary = { keep: [], annotate: {}, translate: {} };
  for (const domain of domains) {
    if (enabledIds.includes(domain.id)) {
      glossary.keep.push(...domain.keep);
      Object.assign(glossary.annotate, domain.annotate);
      Object.assign(glossary.translate, domain.translate);
    }
  }
  glossary.keep = [...new Set(glossary.keep)];
  return glossary;
}

// The set renderings for one language, in the shape a TranslateRequest carries.
export function promptGlossary(glossary: LoadedGlossary, language: TargetLanguage): Glossary {
  return pick(glossary.translate, language);
}

// The meaning added after the first use of each annotated term, for one language.
export function annotations(glossary: LoadedGlossary, language: TargetLanguage): Record<string, string> {
  return pick(glossary.annotate, language);
}

// Terms the model must never see: kept and annotated ones (translate terms it must see).
export function protectedTerms(glossary: LoadedGlossary): string[] {
  return [...glossary.keep, ...Object.keys(glossary.annotate)];
}

function pick(entries: Record<string, Renderings>, language: TargetLanguage): Record<string, string> {
  return Object.fromEntries(Object.entries(entries).map(([term, r]) => [term, r[language]]));
}

// The glossary as translateMarkdown takes it, for one language.
export function glossaryOptions(glossary: LoadedGlossary | undefined, language: TargetLanguage) {
  if (!glossary) {
    return {};
  }
  return {
    glossary: promptGlossary(glossary, language),
    keepTerms: protectedTerms(glossary),
    annotations: annotations(glossary, language),
  };
}

