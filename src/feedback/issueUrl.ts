// Builds a "new issue" link with a translation report filled in. Opening it sends
// nothing: the person reads the issue on GitHub, edits or deletes any part, and
// decides whether to submit it.

export interface TranslationReport {
  issuesUrl: string; // e.g. https://github.com/owner/repo/issues
  language: string;
  provider: string;
  version: string;
  english: string;
  translated: string;
}

// Browsers and GitHub reject very long links; Gujarati and Marathi letters take 9
// characters each once encoded, so long texts are shortened until the link fits.
export const MAX_URL_LENGTH = 7500;

export function buildIssueUrl(report: TranslationReport, maxLength = MAX_URL_LENGTH): string {
  let limit = Math.max(report.english.length, report.translated.length);
  for (;;) {
    const url = issueUrl(report, limit);
    if (url.length <= maxLength || limit === 0) {
      return url;
    }
    limit = Math.floor(limit * 0.8);
  }
}

function issueUrl(report: TranslationReport, limit: number): string {
  const body = [
    '**What was wrong?**',
    '<!-- For example: a technical term was translated, the meaning changed, it reads unnaturally, code was changed. -->',
    '',
    '',
    '**What should it say?** (optional)',
    '',
    '',
    `**Language:** ${report.language}  `,
    `**Provider:** ${report.provider}  `,
    `**BhashaBridge version:** ${report.version}`,
    '',
    '<!-- Delete anything below you do not want to share. -->',
    '',
    '**English**',
    '',
    fence(shorten(report.english, limit)),
    '',
    '**Translation**',
    '',
    fence(shorten(report.translated, limit)),
  ].join('\n');

  const params = new URLSearchParams({
    title: `Translation issue (${report.language})`,
    labels: 'translation-quality',
    body,
  });
  return `${report.issuesUrl.replace(/\/$/, '')}/new?${params.toString()}`;
}

function shorten(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n… (shortened)`;
}

// A fence longer than any backtick run inside, so code in the text cannot close it.
function fence(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map(run => run.length));
  const marks = '`'.repeat(longest + 1);
  return `${marks}markdown\n${text}\n${marks}`;
}
