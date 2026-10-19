import type { TranslationErrorCode } from '../translation/errors';
import type { BlockPair } from './renderMarkdown';

// What the webview sends to the extension host.
export type WebviewMessage =
  | { type: 'translate'; text: string; language: string; provider: string }
  | { type: 'setApiKey' }
  | { type: 'openSignup' }
  | { type: 'ready' }
  | { type: 'report' };

// What the extension host sends back.
export type HostMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'result'; html: string; markdown: string; blocks: BlockPair[] }
  | { type: 'error'; message: string; code: TranslationErrorCode | 'reassembly' | 'unknown' }
  | { type: 'defaults'; language: string; provider: string }
  // Fills the input and starts translating (Translate Selection).
  | { type: 'fill'; text: string }
  // The providers usable right now (the VS Code model only when one exists).
  | { type: 'providers'; providers: { id: string; label: string }[] };
