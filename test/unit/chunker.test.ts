import { describe, expect, it } from 'vitest';
import { joinChunk, joinParts, planChunks, splitChunkReply, splitSentences } from '../../src/chunking/chunker';

describe('planChunks', () => {
  it('puts short segments into one chunk, in order', () => {
    const plan = planChunks(['Heading', 'First paragraph.', 'Second paragraph.'], 2000);

    expect(plan.chunks).toHaveLength(1);
    expect(plan.chunks[0]!.map(p => p.text)).toEqual(['Heading', 'First paragraph.', 'Second paragraph.']);
  });

  it('starts a new chunk when the next segment would not fit', () => {
    const a = 'a'.repeat(50);
    const b = 'b'.repeat(50);
    const c = 'c'.repeat(50);
    const plan = planChunks([a, b, c], 130);

    expect(plan.chunks.map(chunk => chunk.map(p => p.segment))).toEqual([[0, 1], [2]]);
  });

  it('splits a segment that is too long on its own, at sentence ends', () => {
    const long = 'First sentence is here. Second one follows! Third ends it?';
    const plan = planChunks(['Short.', long], 30);

    const pieces = plan.chunks.flat();
    expect(pieces.filter(p => p.segment === 1).map(p => p.text)).toEqual([
      'First sentence is here.',
      'Second one follows!',
      'Third ends it?',
    ]);
    expect(joinParts(['First sentence is here.', 'Second one follows!', 'Third ends it?'], plan.gaps[1]!)).toBe(long);
  });
});

describe('splitSentences', () => {
  it('never cuts mid-sentence and keeps the original spacing', () => {
    const text = 'One.  Two?\nThree! Four';
    const parts = splitSentences(text, 8);

    expect(parts.map(p => p.text)).toEqual(['One.', 'Two?', 'Three!', 'Four']);
    expect(joinParts(parts.map(p => p.text), parts.map(p => p.gap))).toBe(text);
  });

  it('packs sentences together up to the limit', () => {
    expect(splitSentences('A b. C d. E f.', 10).map(p => p.text)).toEqual(['A b. C d.', 'E f.']);
  });

  it('splits at the danda, the full stop of Devanagari languages such as Hindi', () => {
    expect(splitSentences('पहला वाक्य। दूसरा वाक्य।', 15).map(p => p.text)).toEqual(['पहला वाक्य।', 'दूसरा वाक्य।']);
  });

  it('keeps a sentence longer than the limit whole', () => {
    const sentence = 'This one sentence is far longer than the limit allows.';
    expect(splitSentences(sentence, 10)).toEqual([{ text: sentence, gap: '' }]);
  });

  it('does not split numbers or version strings', () => {
    expect(splitSentences('Use version 3.5 or Node.js 20.11 here.', 10).map(p => p.text)).toEqual([
      'Use version 3.5 or Node.js 20.11 here.',
    ]);
  });
});

describe('joinChunk and splitChunkReply', () => {
  it('round-trips pieces through markers', () => {
    const joined = joinChunk(['Heading', 'Body with SKIP_001.']);

    expect(joined).toBe('<<<1>>>\nHeading\n\n<<<2>>>\nBody with SKIP_001.');
    expect(splitChunkReply(joined, 2)).toEqual(['Heading', 'Body with SKIP_001.']);
  });

  it('accepts a translated reply with extra spacing around markers', () => {
    expect(splitChunkReply('  <<<1>>>  \nશીર્ષક\n<<<2>>>\nભાગ\n', 2)).toEqual(['શીર્ષક', 'ભાગ']);
  });

  it.each([
    ['a lost marker', '<<<1>>>\nA\nB', 2],
    ['an extra marker', '<<<1>>>\nA\n<<<2>>>\nB\n<<<3>>>\nC', 2],
    ['markers out of order', '<<<2>>>\nA\n<<<1>>>\nB', 2],
    ['text before the first marker', 'Note:\n<<<1>>>\nA\n<<<2>>>\nB', 2],
    ['an empty part', '<<<1>>>\n\n<<<2>>>\nB', 2],
  ])('rejects a reply with %s', (_name, reply, count) => {
    expect(splitChunkReply(reply, count)).toBeUndefined();
  });
});
