import { describe, expect, it } from 'vitest';
import { buildIssueUrl, MAX_URL_LENGTH, type TranslationReport } from '../../src/feedback/issueUrl';

const REPORT: TranslationReport = {
  issuesUrl: 'https://github.com/SkayKapadia/bhashabridge/issues',
  language: 'Gujarati',
  provider: 'Sarvam AI',
  version: '0.0.1',
  english: 'The `users` array is undefined.',
  translated: '`users` એરે undefined છે.',
};

function body(url: string): string {
  return new URL(url).searchParams.get('body')!;
}

describe('buildIssueUrl', () => {
  it('opens a new issue in the repo with a title and label', () => {
    const url = new URL(buildIssueUrl(REPORT));

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/SkayKapadia/bhashabridge/issues/new');
    expect(url.searchParams.get('title')).toBe('Translation issue (Gujarati)');
    expect(url.searchParams.get('labels')).toBe('translation-quality');
  });

  it('fills in the details and both texts', () => {
    const text = body(buildIssueUrl(REPORT));

    expect(text).toContain('**Language:** Gujarati');
    expect(text).toContain('**Provider:** Sarvam AI');
    expect(text).toContain('**BhashaBridge version:** 0.0.1');
    expect(text).toContain('```markdown\nThe `users` array is undefined.\n```');
    expect(text).toContain('```markdown\n`users` એરે undefined છે.\n```');
    expect(text).toContain('**What was wrong?**');
  });

  it('uses a longer fence when the text contains a code block', () => {
    const text = body(buildIssueUrl({ ...REPORT, english: 'Run:\n\n```js\nrun();\n```' }));

    expect(text).toContain('````markdown\nRun:\n\n```js\nrun();\n```\n````');
  });

  it('shortens long Gujarati text until the link fits', () => {
    const long = 'આ વાક્ય ખૂબ લાંબું છે. '.repeat(400);
    const url = buildIssueUrl({ ...REPORT, english: 'x'.repeat(5000), translated: long });

    expect(url.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(body(url)).toContain('… (shortened)');
    expect(body(url)).toContain('**What was wrong?**');
  });

  it('accepts an issues address with a trailing slash', () => {
    expect(buildIssueUrl({ ...REPORT, issuesUrl: 'https://github.com/o/r/issues/' })).toMatch(/^https:\/\/github\.com\/o\/r\/issues\/new\?/);
  });
});
