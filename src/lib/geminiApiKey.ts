import { STORAGE_KEYS } from '../constants';

declare const process: { env: { GEMINI_API_KEY?: string } };

export type GeminiApiKeySource = 'custom' | 'env' | 'none';

export function getGeminiApiKey(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
  if (stored?.trim()) return stored.trim();

  const envKey = process.env.GEMINI_API_KEY;
  return typeof envKey === 'string' ? envKey.trim() : '';
}

export function setGeminiApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key.trim());
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
}

export function hasCustomGeminiApiKey(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)?.trim();
}

export function getGeminiApiKeySource(): GeminiApiKeySource {
  if (hasCustomGeminiApiKey()) return 'custom';
  if (process.env.GEMINI_API_KEY?.trim()) return 'env';
  return 'none';
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${'•'.repeat(12)}${key.slice(-4)}`;
}
