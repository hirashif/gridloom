export type ProviderId = 'fal' | 'gemini' | 'openai'

export type ParamValue = number | string | boolean

export interface Generation {
  id: string
  createdAt: number
  source: 'generate' | 'grid'
  gridRunId?: string
  provider: ProviderId
  modelId: string
  prompt: string
  negativePrompt?: string
  params: Record<string, ParamValue>
  seed: number | null
  imageIds: string[]
  costEstimateUsd: number
  durationMs: number
  starred: boolean
  tagIds: string[]
  status: 'ok' | 'error'
  error?: { code: string; message: string }
}

export interface ImageBlobRecord {
  id: string
  blob: Blob
  mimeType: string
  width: number
  height: number
  bytes: number
}

export interface Recipe {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  promptTemplate: string
  negativePrompt?: string
  provider: ProviderId
  /** The single model this recipe replays on Generate. Kept for the un-ported RecipesPage. */
  modelId: string
  /** Compare-sheet recipes: every model the sheet fanned across. Non-indexed. */
  modelIds?: string[]
  /** Compare-sheet recipes: how many seeds (columns) the sheet ran. Non-indexed. */
  seedCount?: number
  params: Record<string, ParamValue>
  seedPolicy: { mode: 'fixed'; seed: number } | { mode: 'random' }
  notes?: string
}

export interface Tag {
  id: string
  name: string
  createdAt: number
}
