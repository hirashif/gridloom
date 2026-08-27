import type { ParamValue, ProviderId } from './types'

export type ParamDef =
  | { key: string; label: string; type: 'number'; min: number; max: number; step: number; default: number }
  | { key: string; label: string; type: 'select'; options: readonly string[]; default: string }
  | { key: string; label: string; type: 'boolean'; default: boolean }

export interface ModelDef {
  id: string
  provider: ProviderId
  name: string
  /** Estimated USD per image — drives the cost meter. Always labeled "est." in UI. */
  priceUsd: number
  /** Mono row label on the contact sheet (≤8 chars). From design/Gridloom Studio.dc.html registry. */
  short: string
  /** Largest output the model supports — a display hint next to the Size control. */
  maxSize?: string
  /** Model has an image-to-image endpoint on fal (reference-image slot appears when true). */
  img2img?: boolean
  beta?: boolean
  capabilities: {
    seed: boolean
    negativePrompt: boolean
  }
  params: ParamDef[]
}

const IMAGE_SIZES = [
  'square_hd',
  'square',
  'portrait_4_3',
  'portrait_16_9',
  'landscape_4_3',
  'landscape_16_9',
] as const

// Seedream 4.5 adds two high-res presets on top of the standard set (verified on
// fal-ai/bytedance/seedream/v4.5/text-to-image — image_size enum).
const IMAGE_SIZES_HIRES = [...IMAGE_SIZES, 'auto_2K', 'auto_4K'] as const

// OpenAI image size + quality selects — verified against the /v1/images/generations
// schema and mapped through the openai adapter (input.params.size / .quality).
const OPENAI_SIZES = ['1024x1024', '1536x1024', '1024x1536'] as const
const OPENAI_QUALITY = ['low', 'medium', 'high'] as const

export const MODELS: ModelDef[] = [
  {
    id: 'fal-ai/flux/schnell',
    provider: 'fal',
    name: 'FLUX schnell',
    priceUsd: 0.003,
    short: 'SCHNELL',
    maxSize: '1536×1536',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 12, step: 1, default: 4 },
    ],
  },
  {
    id: 'fal-ai/flux/dev',
    provider: 'fal',
    name: 'FLUX dev',
    priceUsd: 0.025,
    short: 'FLUX DEV',
    maxSize: '1536×1536',
    img2img: true,
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 50, step: 1, default: 28 },
      { key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 20, step: 0.5, default: 3.5 },
    ],
  },
  {
    // FLUX.2 dev — image_size presets, num_inference_steps (def 28), guidance_scale
    // (def 2.5), seed. No negative_prompt. Custom dims 512–2048. Verified on
    // fal.ai/models/fal-ai/flux-2/api.
    id: 'fal-ai/flux-2',
    provider: 'fal',
    name: 'FLUX.2 dev',
    priceUsd: 0.012,
    short: 'FLX2 DEV',
    maxSize: '2048×2048',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 50, step: 1, default: 28 },
      { key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 20, step: 0.5, default: 2.5 },
    ],
  },
  {
    // FLUX.2 pro — image_size presets + seed only; no steps/guidance exposed.
    // Verified on fal.ai/models/fal-ai/flux-2-pro/api.
    id: 'fal-ai/flux-2-pro',
    provider: 'fal',
    name: 'FLUX.2 pro',
    priceUsd: 0.03,
    short: 'FLX2 PRO',
    maxSize: '2048×2048',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
    ],
  },
  {
    // FLUX.2 flex — the tunable one: image_size, num_inference_steps (def 28),
    // guidance_scale (def 3.5), seed. No negative_prompt. Verified on
    // fal.ai/models/fal-ai/flux-2-flex/api.
    id: 'fal-ai/flux-2-flex',
    provider: 'fal',
    name: 'FLUX.2 flex',
    priceUsd: 0.05,
    short: 'FLX2 FLX',
    maxSize: '2048×2048',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 50, step: 1, default: 28 },
      { key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 20, step: 0.5, default: 3.5 },
    ],
  },
  {
    // Qwen-Image — the only new negative-prompt model. image_size, num_inference_steps
    // (def 30), guidance_scale (CFG, def 2.5), seed, negative_prompt. Verified on
    // fal.ai/models/fal-ai/qwen-image/api. (negative_prompt/seed are injected by the
    // fal adapter from input, driven by capabilities below — not param spread.)
    id: 'fal-ai/qwen-image',
    provider: 'fal',
    name: 'Qwen-Image',
    priceUsd: 0.02,
    short: 'QWEN',
    maxSize: '1536×1536',
    capabilities: { seed: true, negativePrompt: true },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'landscape_4_3' },
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 1, max: 50, step: 1, default: 30 },
      { key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 20, step: 0.5, default: 2.5 },
    ],
  },
  {
    // Ideogram V4 — priced by rendering_speed (TURBO $0.0075 / BALANCED $0.015 /
    // QUALITY $0.025 per MP; registry price = BALANCED default). image_size, seed.
    // No negative_prompt/style. Verified on fal.ai/models/ideogram/v4/api.
    id: 'ideogram/v4',
    provider: 'fal',
    name: 'Ideogram V4',
    priceUsd: 0.015,
    short: 'IDEO 4',
    maxSize: '2048×2048',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'square_hd' },
      {
        key: 'rendering_speed',
        label: 'Render',
        type: 'select',
        options: ['TURBO', 'BALANCED', 'QUALITY'] as const,
        default: 'BALANCED',
      },
    ],
  },
  {
    // Seedream 4.5 — image_size incl. auto_2K/auto_4K, seed. No negative_prompt.
    // Max 4MP / 2048². Verified on
    // fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image/api.
    id: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    provider: 'fal',
    name: 'Seedream 4.5',
    priceUsd: 0.04,
    short: 'SEEDRM',
    maxSize: '2048×2048',
    capabilities: { seed: true, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES_HIRES, default: 'square_hd' },
    ],
  },
  {
    // Recraft V4 (replaces v3) — image_size only; per the OpenAPI schema the t2i
    // endpoint has NO style/seed/negative_prompt (colors/background_color are RGB
    // objects, not scalar params). Verified on the OpenAPI schema for
    // fal-ai/recraft/v4/text-to-image.
    id: 'fal-ai/recraft/v4/text-to-image',
    provider: 'fal',
    name: 'Recraft V4',
    priceUsd: 0.04,
    short: 'RCRF 4',
    maxSize: '2048×2048',
    capabilities: { seed: false, negativePrompt: false },
    params: [
      { key: 'image_size', label: 'Size', type: 'select', options: IMAGE_SIZES, default: 'square_hd' },
    ],
  },
  {
    // Nano Banana 2 (GA) — replaces the preview-only Gemini 2.5 flash image model.
    // Same adapter param pattern (aspect_ratio → generationConfig.imageConfig.aspectRatio).
    id: 'gemini-3.1-flash-image',
    provider: 'gemini',
    name: 'Nano Banana 2',
    priceUsd: 0.067,
    short: 'NANO-B2',
    maxSize: '1024×1024',
    beta: true,
    capabilities: { seed: false, negativePrompt: false },
    params: [
      {
        key: 'aspect_ratio',
        label: 'Aspect ratio',
        type: 'select',
        options: ['1:1', '3:4', '4:3', '9:16', '16:9'] as const,
        default: '1:1',
      },
    ],
  },
  {
    // Nano Banana 2 Lite (Google docs: "Nano Banana Lite") — shipped 2026-06-30,
    // stable in the Gemini API. $0.034 per 1K image (ai.google.dev pricing notation,
    // half of NB2's $0.067); 1K output only; wider aspect list than NB2 per the
    // image-generation guide. Same adapter mapping (aspect_ratio →
    // generationConfig.imageConfig.aspectRatio). Live-verified in-app 2026-07-07:
    // real frame in 3.0s at $0.034. beta stays — all Gemini/OpenAI models wear
    // the provider beta badge (fal is the deep integration).
    id: 'gemini-3.1-flash-lite-image',
    provider: 'gemini',
    name: 'Nano Banana 2 Lite',
    priceUsd: 0.034,
    short: 'NB2 LITE',
    maxSize: '1024×1024',
    beta: true,
    capabilities: { seed: false, negativePrompt: false },
    params: [
      {
        key: 'aspect_ratio',
        label: 'Aspect ratio',
        type: 'select',
        options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const,
        default: '1:1',
      },
    ],
  },
  {
    // GPT Image 1.5 (replaces the prior GPT Image 1) — quality-priced (low $0.009 /
    // med $0.034 / high $0.133 @1024²; registry price = medium default). size +
    // quality mapped through the openai adapter.
    id: 'gpt-image-1.5',
    provider: 'openai',
    name: 'GPT Image 1.5',
    priceUsd: 0.034,
    short: 'GPT 1.5',
    maxSize: '1536×1024',
    beta: true,
    capabilities: { seed: false, negativePrompt: false },
    params: [
      { key: 'size', label: 'Size', type: 'select', options: OPENAI_SIZES, default: '1024x1024' },
      { key: 'quality', label: 'Quality', type: 'select', options: OPENAI_QUALITY, default: 'medium' },
    ],
  },
  {
    // GPT Image 1 mini — cheaper OpenAI tier (low $0.005 / med $0.011 / high $0.036;
    // registry price = medium default).
    id: 'gpt-image-1-mini',
    provider: 'openai',
    name: 'GPT Image 1 mini',
    priceUsd: 0.011,
    short: 'GPT MINI',
    maxSize: '1536×1024',
    beta: true,
    capabilities: { seed: false, negativePrompt: false },
    params: [
      { key: 'size', label: 'Size', type: 'select', options: OPENAI_SIZES, default: '1024x1024' },
      { key: 'quality', label: 'Quality', type: 'select', options: OPENAI_QUALITY, default: 'medium' },
    ],
  },
]

export const PROVIDERS: Record<ProviderId, { name: string; keyPlaceholder: string; keyUrl: string }> = {
  fal: { name: 'fal.ai', keyPlaceholder: 'key_id:key_secret', keyUrl: 'https://fal.ai/dashboard/keys' },
  gemini: { name: 'Google Gemini', keyPlaceholder: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey' },
  openai: { name: 'OpenAI', keyPlaceholder: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
}

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id)
}

export function defaultParams(model: ModelDef): Record<string, ParamValue> {
  return Object.fromEntries(model.params.map((p) => [p.key, p.default]))
}
