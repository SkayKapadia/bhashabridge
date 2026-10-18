import type { TranslationErrorCode } from '../translation/errors';

// What the webview sends to the extension host.
export type WebviewMessage =
  | { type: 'translate'; text: string; language: string }
  | { type: 'setApiKey' };

// What the extension host sends back.
export type HostMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'result'; html: string; markdown: string }
  | { type: 'error'; message: string; code: TranslationErrorCode | 'reassembly' | 'unknown' };
