import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ChatModelError, englishAnswerPrompt, runChat, type ChatDeps } from '../../src/chat/chatHandler';
import { ReassemblyError } from '../../src/reassembly/reassemble';
import { TranslationError } from '../../src/translation/errors';

function output() {
  const out = { progress: vi.fn(), markdown: vi.fn(), button: vi.fn() };
  return out;
}

function deps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    languageName: 'Gujarati',
    answerInEnglish: vi.fn(async (q: string) => `English answer to: ${q}\n\n\`\`\`js\nrun();\n\`\`\``),
    translate: vi.fn(async (md: string) => `[gu] ${md}`),
    ...overrides,
  };
}

describe('runChat', () => {
  it('answers a question in English with the chat model, then translates it', async () => {
    const d = deps();
    const out = output();
    await runChat(undefined, 'why does this crash?', d, out);

    expect(d.answerInEnglish).toHaveBeenCalledWith('why does this crash?');
    expect(out.progress.mock.calls.map(c => c[0])).toEqual(['Writing the answer in English…', 'Translating into Gujarati…']);
    expect(out.markdown).toHaveBeenCalledWith('[gu] English answer to: why does this crash?\n\n```js\nrun();\n```');
  });

  it('/translate translates the given text without asking the chat model', async () => {
    const d = deps();
    const out = output();
    await runChat('translate', 'The function fails because `users` is undefined.', d, out);

    expect(d.answerInEnglish).not.toHaveBeenCalled();
    expect(out.markdown).toHaveBeenCalledWith('[gu] The function fails because `users` is undefined.');
  });

  it('explains how to use it when the message is empty', async () => {
    const out = output();
    await runChat(undefined, '  ', deps(), out);
    await runChat('translate', '', deps(), out);

    expect(out.markdown.mock.calls[0]![0]).toContain('answer in Gujarati');
    expect(out.markdown.mock.calls[1]![0]).toContain('after `/translate`');
  });

  it('offers to set the key when Sarvam has no key', async () => {
    const out = output();
    await runChat('translate', 'Some text here.', deps({
      translate: async () => {
        throw new TranslationError('missing-key', 'No Sarvam AI API key is set.');
      },
    }), out);

    expect(out.markdown).toHaveBeenCalledWith('**BhashaBridge could not finish:** No Sarvam AI API key is set.');
    expect(out.button).toHaveBeenCalledWith('bhashabridge.setSarvamApiKey', 'Set Sarvam API key');
  });

  it.each([
    ['no chat model', new ChatModelError('No chat model is available.')],
    ['lost code', new ReassemblyError(['SKIP_001'], [])],
  ])('reports %s without a key button', async (_name, error) => {
    const out = output();
    await runChat(undefined, 'question', deps({ answerInEnglish: async () => { throw error; } }), out);

    expect(out.markdown.mock.calls[0]![0]).toContain('BhashaBridge could not finish');
    expect(out.button).not.toHaveBeenCalled();
  });

  it('lets unexpected errors through to VS Code', async () => {
    await expect(runChat(undefined, 'q', deps({ answerInEnglish: async () => { throw new Error('boom'); } }), output())).rejects.toThrow('boom');
  });
});

describe('englishAnswerPrompt', () => {
  it('asks for fenced code and backticked identifiers, which the parser protects', () => {
    const prompt = englishAnswerPrompt('why does this crash?');

    expect(prompt).toContain('fenced code blocks');
    expect(prompt).toContain('backticks');
    expect(prompt.endsWith('why does this crash?')).toBe(true);
  });
});

describe('chat participant contribution', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));

  it('declares @bhashabridge with a /translate command', () => {
    const [participant] = pkg.contributes.chatParticipants;
    expect(participant).toMatchObject({ id: 'bhashabridge.chat', name: 'bhashabridge' });
    expect(participant.commands.map((c: { name: string }) => c.name)).toEqual(['translate']);
    expect(pkg.activationEvents).toContain('onChatParticipant:bhashabridge.chat');
  });
});
