import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { getSarvamApiKey, setSarvamApiKey } from '../../src/secrets/apiKeys';

function memorySecrets(): vscode.SecretStorage {
  const values = new Map<string, string>();
  return {
    get: async (key: string) => values.get(key),
    store: async (key: string, value: string) => void values.set(key, value),
    delete: async (key: string) => void values.delete(key),
    onDidChange: (() => ({ dispose() {} })) as never,
  } as vscode.SecretStorage;
}

describe('Sarvam API key storage', () => {
  it('stores the key trimmed and reads it back', async () => {
    const secrets = memorySecrets();
    expect(await getSarvamApiKey(secrets)).toBeUndefined();

    await setSarvamApiKey(secrets, '  sk_test_123  ');
    expect(await getSarvamApiKey(secrets)).toBe('sk_test_123');
  });
});
