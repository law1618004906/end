// Centralized feature flags with server/client support
// Next.js exposes NEXT_PUBLIC_* at build time on both server & client via process.env
export const flags = {
  gpt5Preview:
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_GPT5_PREVIEW === 'true') ||
    (typeof process !== 'undefined' && process.env.ENABLE_GPT5_PREVIEW === 'true'),
} as const;

export type FeatureFlags = typeof flags;

export function isEnabled<K extends keyof FeatureFlags>(key: K): boolean {
  return Boolean(flags[key]);
}
