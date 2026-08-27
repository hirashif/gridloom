import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderId } from '../lib/types'

/** Studio defaults — additive, optional fields. Persisted on the same
 *  `gridloom-settings` key; older payloads (which lack `defaults`) shallow-merge
 *  cleanly against the initial value below, so no version bump is needed. */
export interface StudioDefaults {
  defaultSize?: string
  seedPolicy?: 'random' | 'fixed'
  exportFormat?: 'png' | 'webp'
}

interface SettingsState {
  apiKeys: Partial<Record<ProviderId, string>>
  setApiKey: (provider: ProviderId, key: string) => void
  removeApiKey: (provider: ProviderId) => void
  defaults: StudioDefaults
  setDefault: <K extends keyof StudioDefaults>(key: K, value: StudioDefaults[K]) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiKeys: {},
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key.trim() } })),
      removeApiKey: (provider) =>
        set((s) => {
          const next = { ...s.apiKeys }
          delete next[provider]
          return { apiKeys: next }
        }),
      defaults: {},
      setDefault: (key, value) => set((s) => ({ defaults: { ...s.defaults, [key]: value } })),
    }),
    {
      name: 'gridloom-settings',
      // Guard against a persisted payload from before `defaults` existed: without
      // this, rehydration would replace the initializer's `defaults: {}` with
      // `undefined` and the UI would read into a missing object.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<SettingsState>) }),
    },
  ),
)

export function maskKey(key: string): string {
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}
