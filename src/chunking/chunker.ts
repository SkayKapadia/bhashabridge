// Groups translatable segments into as few requests as fit a provider's size limit,
// and splits a segment that is too long on its own at sentence ends (SDD Module 3).

export interface Piece {
  segment: number; // which segment this text belongs to
  part: number; // its place within that segment (0 unless the segment was split)
  text: string;
}

export interface ChunkPlan {
  chunks: Piece[][];
  // Per segment, the whitespace that stood after each of its parts, to rejoin them.
  gaps: string[][];
}

// Room each marker line takes in a joined chunk.
const MARKER_ALLOWANCE = 12;

export function planChunks(segments: readonly string[], maxChars: number): ChunkPlan {
  const pieces: Piece[] = [];
  const gaps: string[][] = [];

  segments.forEach((text, segment) => {
    const parts = text.length > maxChars ? splitSentences(text, maxChars) : [{ text, gap: '' }];
    gaps.push(parts.map(p => p.gap));
    parts.forEach((p, part) => pieces.push({ segment, part, text: p.text }));
  });

  // Fill each chunk in order until the next piece would not fit.
  const chunks: Piece[][] = [];
  let current: Piece[] = [];
  let size = 0;
  for (const piece of pieces) {
    const cost = piece.text.length + MARKER_ALLOWANCE;
    if (current.length > 0 && size + cost > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(piece);
    size += cost;
  }
  if (current.length > 0) {
    chunks.push(current);
  }

  return { chunks, gaps };
}

// Puts a segment back together from its translated parts and the original gaps.
export function joinParts(parts: readonly string[], gaps: readonly string[]): string {
  return parts.map((text, i) => text + (gaps[i] ?? '')).join('');
}

// Splits after . ? ! or the Devanagari danda (।), never mid-sentence, then packs
// sentences back together up to the limit. A single sentence longer than the limit
// stays whole: there is nowhere safe to cut it.
export function splitSentences(text: string, maxChars: number): { text: string; gap: string }[] {
  const pieces = text.split(/(?<=[.?!।])(\s+)/u); // sentence, gap, sentence, gap, ...
  const parts: { text: string; gap: string }[] = [];
  let current = '';
  let pendingGap = '';

  for (let i = 0; i < pieces.length; i += 2) {
    const sentence = pieces[i]!;
    const gap = pieces[i + 1] ?? '';
    if (current && current.length + pendingGap.length + sentence.length > maxChars) {
      parts.push({ text: current, gap: pendingGap });
      current = sentence;
    } else {
      current += pendingGap + sentence;
    }
    pendingGap = gap;
  }
  parts.push({ text: current, gap: pendingGap });
  return parts;
}

// Several pieces travel in one request, each after a numbered marker line.
export function joinChunk(texts: readonly string[]): string {
  return texts.map((text, i) => `<<<${i + 1}>>>\n${text}`).join('\n\n');
}

// The translated pieces, or undefined when the markers did not come back exactly as
// sent (missing, repeated, out of order, or text before the first one).
export function splitChunkReply(reply: string, count: number): string[] | undefined {
  const sections = reply.split(/^[ \t]*<<<(\d+)>>>[ \t]*$/m); // text, number, text, number, text...
  if (sections[0]!.trim() !== '' || (sections.length - 1) / 2 !== count) {
    return undefined;
  }

  const parts: string[] = [];
  for (let i = 1; i < sections.length; i += 2) {
    if (Number(sections[i]) !== parts.length + 1) {
      return undefined;
    }
    parts.push(sections[i + 1]!.trim());
  }
  return parts.every(Boolean) ? parts : undefined;
}
