// Text copied from a rendered page (a chat window, a web page) loses its markdown: a
// table arrives as lines of tab-separated cells and a list as "•" lines. This puts that
// structure back before parsing, so the translation keeps the same layout. Text inside
// fenced code blocks is never touched.

const BULLET = /^(\s*)[•◦▪‣·]\s+/;
const FENCE = /^\s*(```|~~~)/;

export function normalizePastedText(input: string): string {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // Two or more lines in a row with tab-separated cells: a table, first line the header.
    if (isTabRow(line) && isTabRow(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && isTabRow(lines[i])) {
        rows.push(lines[i]!.split('\t').map(cell => cell.trim()));
        i++;
      }
      i--;
      if (out.length > 0 && out.at(-1)!.trim() !== '') {
        out.push('');
      }
      out.push(...pipeTable(rows), '');
      continue;
    }

    out.push(line.replace(BULLET, '$1- '));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function isTabRow(line: string | undefined): boolean {
  return line !== undefined && line.includes('\t') && line.trim() !== '';
}

function pipeTable(rows: string[][]): string[] {
  const width = Math.max(...rows.map(row => row.length));
  const cells = (row: string[]) => Array.from({ length: width }, (_, i) => (row[i] ?? '').replace(/\|/g, '\\|'));
  const line = (row: string[]) => `| ${cells(row).join(' | ')} |`;
  return [line(rows[0]!), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)];
}
