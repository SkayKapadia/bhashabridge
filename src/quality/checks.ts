import { protectTerms } from '../glossary/protectTerms';
import { parseMarkdown } from '../parser/markdownParser';
import { parseMarkdownTree } from '../parser/markdownSyntax';

// Automatic checks for one translation in the quality report. They cannot judge how
// natural the translation reads (a person scores that), but they catch every
// way the pipeline could damage code or structure.

export interface QualityCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export function checkTranslation(input: string, output: string, keepTerms: readonly string[]): QualityCheck[] {
  const parsed = parseMarkdown(input);

  const changedCode = [...new Set(parsed.placeholders.values())].filter(code => countCode(output, code) !== countCode(input, code));

  const terms = new Set(parsed.segments.flatMap(s => [...protectTerms(s.text, keepTerms).placeholders.values()]));
  const missingTerms = [...terms].filter(term => !output.includes(term));

  const leftovers = [...new Set(output.match(/SKIP_\d+|<<<\d+>>>/g) ?? [])].filter(token => !input.includes(token));

  const inputBlocks = parseMarkdownTree(input).children.length;
  const outputBlocks = parseMarkdownTree(output).children.length;

  return [
    {
      name: 'Code unchanged',
      passed: changedCode.length === 0,
      detail: changedCode.length === 0 ? `${parsed.placeholders.size} code pieces kept exactly` : `changed or missing: ${changedCode.map(short).join(', ')}`,
    },
    {
      name: 'Glossary terms kept in English',
      passed: missingTerms.length === 0,
      detail: missingTerms.length === 0 ? `${terms.size} terms kept` : `missing: ${missingTerms.join(', ')}`,
    },
    {
      name: 'No leftover placeholders',
      passed: leftovers.length === 0,
      detail: leftovers.length === 0 ? 'none' : leftovers.join(', '),
    },
    {
      name: 'Structure kept',
      passed: inputBlocks === outputBlocks,
      detail: `${inputBlocks} blocks in, ${outputBlocks} out`,
    },
  ];
}

// A sample may start with <!-- domains: healthcare, finance-banking --> to turn on
// business glossary domains for its run, on top of the default ones.
export function readSample(text: string): { domains: string[]; markdown: string } {
  const match = text.match(/^<!--\s*domains:\s*([^>]*?)\s*-->\r?\n/);
  if (!match) {
    return { domains: [], markdown: text };
  }
  return {
    domains: match[1]!.split(',').map(d => d.trim()).filter(Boolean),
    markdown: text.slice(match[0].length),
  };
}

// Uses of a piece of code, as a whole word where it starts or ends with a letter or
// digit: `customer` is not counted inside the translated word "customers".
function countCode(text: string, code: string): number {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = `${/^\w/.test(code) ? '(?<!\\w)' : ''}${escaped}${/\w$/.test(code) ? '(?!\\w)' : ''}`;
  return text.match(new RegExp(pattern, 'g'))?.length ?? 0;
}

function short(code: string): string {
  const line = code.split('\n')[0]!;
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}
