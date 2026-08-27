import type { ParamValue, ProviderId } from '../types'
import { falAdapter } from './fal'
import { geminiAdapter } from './gemini'
import { openaiAdapter } from './openai'

export interface GenerateInput {
  modelId: string
  prompt: string
  negativePrompt?: string
  seed?: number
  params: Record<string, ParamValue>
  /** img2img source. Only honored by fal models flagged `img2img`; never persisted. */
  referenceImage?: Blob
  /** img2img strength 0–1 (how far from the reference). Sent only with `referenceImage`. */
  referenceStrength?: number
}

export interface GeneratedImage {
  blob: Blob
  width: number
  height: number
}

export interface GenerateOutput {
  images: GeneratedImage[]
  seed: number | null
  durationMs: number
}

export interface ProviderAdapter {
  id: ProviderId
  generate(input: GenerateInput, apiKey: string): Promise<GenerateOutput>
  /** Validates a key without spending money. Throws AppError('invalid_key') on rejection. */
  testKey(apiKey: string): Promise<void>
}

export const adapters: Partial<Record<ProviderId, ProviderAdapter>> = {
  fal: falAdapter,
  gemini: geminiAdapter,
  openai: openaiAdapter,
}

export function getAdapter(provider: ProviderId): ProviderAdapter {
  const adapter = adapters[provider]
  if (!adapter) throw new Error(`No adapter for provider: ${provider}`)
  return adapter
}
