import { create } from 'zustand'
import type { ParamValue, ProviderId } from '../lib/types'

/** A pending "use again" / "run recipe" payload consumed by GeneratePage on mount. */
export interface GenerateDraft {
  provider: ProviderId
  modelId: string
  prompt: string
  negativePrompt?: string
  params: Record<string, ParamValue>
  seed?: number
}

/** A "run this across all models" payload consumed by GridPage on mount. */
export interface GridDraft {
  prompt: string
  modelIds: string[]
  seedCount: number
}

interface DraftState {
  draft: GenerateDraft | null
  gridPrompt: string | null
  gridDraft: GridDraft | null
  setDraft: (d: GenerateDraft) => void
  setGridPrompt: (p: string) => void
  setGridDraft: (d: GridDraft) => void
  consume: () => GenerateDraft | null
  consumeGridPrompt: () => string | null
  consumeGridDraft: () => GridDraft | null
}

export const useDraft = create<DraftState>((set, get) => ({
  draft: null,
  gridPrompt: null,
  gridDraft: null,
  setDraft: (draft) => set({ draft }),
  setGridPrompt: (gridPrompt) => set({ gridPrompt }),
  setGridDraft: (gridDraft) => set({ gridDraft }),
  consume: () => {
    const d = get().draft
    if (d) set({ draft: null })
    return d
  },
  consumeGridPrompt: () => {
    const p = get().gridPrompt
    if (p) set({ gridPrompt: null })
    return p
  },
  consumeGridDraft: () => {
    const d = get().gridDraft
    if (d) set({ gridDraft: null })
    return d
  },
}))
