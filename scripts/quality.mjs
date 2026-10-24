// Translates every sample in test/quality/samples with the real Sarvam API and writes
// a report to docs/quality: automatic checks, both texts, and a score for a person.
//
//   npm run quality                  every language BhashaBridge supports
//   npm run quality -- --lang gu     one language
//   npm run quality -- --dry-run     no API calls: a stand-in translator, to test the report
//
// The key is read from the SARVAM_API_KEY environment variable or a local .env file
// (git-ignored). It is never printed or written to the report.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);
const { translateMarkdown } = require('../out/src/translation/translateMarkdown.js');
const { SarvamAdapter } = require('../out/src/translation/sarvamAdapter.js');
const { loadGlossaryDomains, combineDomains, glossaryOptions, protectedTerms } = require('../out/src/glossary/glossary.js');
const { checkTranslation, readSample } = require('../out/src/quality/checks.js');
const { LANGUAGES } = require('../out/src/languages.js');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const langArg = args[args.indexOf('--lang') + 1];
const codes = LANGUAGES.map(l => l.code);
const languages = args.includes('--lang') ? [langArg] : codes;
if (!languages.every(l => codes.includes(l))) {
  console.error(`Use --lang with one of: ${codes.join(', ')}.`);
  process.exit(1);
}

const provider = isDryRun ? dryRunProvider() : new SarvamAdapter({ getApiKey: async () => readKey() });
if (!isDryRun && !readKey()) {
  console.error('Set SARVAM_API_KEY, or add SARVAM_API_KEY=... to a .env file in the project folder.');
  process.exit(1);
}

const domains = await loadGlossaryDomains(process.cwd());
const defaults = domains.filter(d => d.isDefault).map(d => d.id);
const files = readdirSync('test/quality/samples').filter(f => f.endsWith('.md')).sort();

const results = [];
for (const file of files) {
  const sample = readSample(readFileSync(join('test/quality/samples', file), 'utf8'));
  const glossary = combineDomains(domains, [...defaults, ...sample.domains]);
  for (const language of languages) {
    process.stdout.write(`${file} (${language})… `);
    const started = Date.now();
    try {
      const output = await translateMarkdown(sample.markdown, { provider, targetLanguage: language, ...glossaryOptions(glossary, language) });
      const checks = checkTranslation(sample.markdown, output, protectedTerms(glossary, language));
      results.push({ file, language, input: sample.markdown, output, checks, ms: Date.now() - started });
      console.log(checks.every(c => c.passed) ? 'ok' : 'check failed');
    } catch (error) {
      results.push({ file, language, input: sample.markdown, error: error.message, ms: Date.now() - started });
      console.log(`error: ${error.message}`);
    }
  }
}

const date = new Date().toISOString().slice(0, 10);
const reportPath = join('docs', 'quality', `report-${date}${isDryRun ? '-dry-run' : ''}.md`);
mkdirSync(join('docs', 'quality'), { recursive: true });
writeFileSync(reportPath, report(results, date));
const passed = results.filter(r => r.checks?.every(c => c.passed)).length;
console.log(`\n${passed} of ${results.length} translations passed every automatic check. Report: ${reportPath}`);

function report(results, date) {
  const name = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]));
  const lines = [
    `# Translation quality report, ${date}${isDryRun ? ' (dry run, no real translation)' : ''}`,
    '',
    'Automatic checks catch damage to code and structure. How natural the translation reads needs a person:',
    'give each translation a score from 1 (unusable) to 5 (reads like a native speaker wrote it). The SDD target is an average of 4.',
    '',
    '| Sample | Language | Checks | Time | Score (1-5) |',
    '|---|---|---|---|---|',
    ...results.map(r => `| ${r.file} | ${name[r.language]} | ${r.error ? 'error' : `${r.checks.filter(c => c.passed).length}/${r.checks.length}`} | ${(r.ms / 1000).toFixed(1)}s | |`),
    '',
  ];
  for (const r of results) {
    lines.push(`## ${r.file}, ${name[r.language]}`, '');
    if (r.error) {
      lines.push(`**Error:** ${r.error}`, '');
    } else {
      lines.push(...r.checks.map(c => `- ${c.passed ? '✅' : '❌'} ${c.name}: ${c.detail}`), '');
    }
    lines.push('**English**', '', '~~~~markdown', r.input.trimEnd(), '~~~~', '');
    if (r.output) {
      lines.push(`**${name[r.language]}**`, '', '~~~~markdown', r.output.trimEnd(), '~~~~', '');
    }
    lines.push('**Score (1-5):** \n**Notes:** ', '');
  }
  return lines.join('\n');
}

function readKey() {
  if (process.env.SARVAM_API_KEY) {
    return process.env.SARVAM_API_KEY.trim();
  }
  if (existsSync('.env')) {
    const line = readFileSync('.env', 'utf8').split(/\r?\n/).find(l => l.startsWith('SARVAM_API_KEY='));
    return line?.slice('SARVAM_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

// Echoes each part with a marker, keeping placeholders and part markers, like a
// well-behaved translator. Only for checking that the script and report work.
function dryRunProvider() {
  return {
    id: 'dry-run',
    maxChunkChars: 2000,
    async translate(request) {
      const translated = request.text.replace(/^(<<<\d+>>>\n)?/gm, (marker, m) => (m ? `${m}[${request.targetLanguage}] ` : marker));
      return { translatedText: translated.startsWith('<<<') ? translated : `[${request.targetLanguage}] ${translated}` };
    },
  };
}
