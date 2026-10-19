import { createHash } from 'crypto';
import { buildSystemPrompt } from '../translation/prompt';
import type { TranslateRequest, TranslateResponse, TranslationProvider } from '../translation/translationProvider';

// Recent translations, kept on this computer in VS Code's own storage, so translating
// the same text again costs no API call. Only successful translations are stored.

// The shape of VS Code's ExtensionContext.globalState that the cache needs.
export interface KeyValueStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

type Entries = Record<string, { text: string; usedAt: number }>;

const STORAGE_KEY = 'bhashabridge.translationCache';
export const MAX_ENTRIES = 200;

export class TranslationCache {
  // Updates run one at a time: several chunks translate at once, and two overlapping
  // read-modify-writes would otherwise lose an entry.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: KeyValueStore,
    private readonly maxEntries = MAX_ENTRIES,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): Promise<string | undefined> {
    return this.serially(async () => {
      const entries = this.entries();
      const entry = entries[key];
      if (entry) {
        entry.usedAt = this.now();
        await this.store.update(STORAGE_KEY, entries);
      }
      return entry?.text;
    });
  }

  set(key: string, text: string): Promise<void> {
    return this.serially(() => this.save(key, text));
  }

  private async save(key: string, text: string): Promise<void> {
    const entries = this.entries();
    entries[key] = { text, usedAt: this.now() };
    // Over the limit, the least recently used entries go first.
    const keys = Object.keys(entries).sort((a, b) => entries[a]!.usedAt - entries[b]!.usedAt);
    for (const old of keys.slice(0, Math.max(0, keys.length - this.maxEntries))) {
      delete entries[old];
    }
    await this.store.update(STORAGE_KEY, entries);
  }

  // Returns how many translations were removed.
  clear(): Promise<number> {
    return this.serially(async () => {
      const count = Object.keys(this.entries()).length;
      await this.store.update(STORAGE_KEY, undefined);
      return count;
    });
  }

  private serially<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private entries(): Entries {
    return { ...(this.store.get<Entries>(STORAGE_KEY) ?? {}) };
  }
}

// Everything that shapes a reply: the provider, the language, the full instructions
// (so a changed prompt or glossary is a new key) and the text itself.
export function cacheKey(providerId: string, request: TranslateRequest): string {
  const parts = [providerId, request.targetLanguage, buildSystemPrompt(request.targetLanguage, request.glossary), request.text];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

// The same provider, answering repeated requests from the cache.
export function withCache(provider: TranslationProvider, cache: TranslationCache): TranslationProvider {
  return {
    id: provider.id,
    maxChunkChars: provider.maxChunkChars,
    async translate(request: TranslateRequest, signal?: AbortSignal): Promise<TranslateResponse> {
      const key = cacheKey(provider.id, request);
      const cached = await cache.get(key);
      if (cached !== undefined) {
        return { translatedText: cached, tokenCount: 0, latencyMs: 0 };
      }
      const response = await provider.translate(request, signal);
      await cache.set(key, response.translatedText);
      return response;
    },
  };
}
