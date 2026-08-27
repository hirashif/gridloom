import { nanoid } from 'nanoid'
import { db, ensureTag } from './db'
import type { Generation, ImageBlobRecord, ProviderId } from './types'

/**
 * DEV-only demo data. Fills an empty library with real generated frames from
 * /public/demo so every view (library, grid, detail, tags, recipes, cost meter)
 * has something to show without burning API credits. Never bundled in prod:
 * the sole import site is guarded by import.meta.env.DEV.
 */

interface DemoFrame {
  url: string
  provider: ProviderId
  modelId: string
  seed: number
  costEstimateUsd: number
  durationMs: number
}

const PROMPT =
  'studio product shot of a hand-thrown ceramic mug, warm morning light, oak table, shallow depth of field'

const GRID_FRAMES: DemoFrame[] = [
  { url: '/demo/mug-schnell-a.webp', provider: 'fal', modelId: 'fal-ai/flux/schnell', seed: 42, costEstimateUsd: 0.003, durationMs: 1840 },
  { url: '/demo/mug-schnell-b.webp', provider: 'fal', modelId: 'fal-ai/flux/schnell', seed: 7, costEstimateUsd: 0.003, durationMs: 1710 },
  { url: '/demo/mug-dev-a.webp', provider: 'fal', modelId: 'fal-ai/flux/dev', seed: 42, costEstimateUsd: 0.025, durationMs: 4320 },
  { url: '/demo/mug-dev-b.webp', provider: 'fal', modelId: 'fal-ai/flux/dev', seed: 7, costEstimateUsd: 0.025, durationMs: 4590 },
]

const SOLO_FRAMES: Array<DemoFrame & { prompt: string }> = [
  {
    url: '/demo/mug-dev-a.webp',
    provider: 'fal',
    modelId: 'fal-ai/flux-2-pro',
    seed: 1337,
    costEstimateUsd: 0.03,
    durationMs: 6120,
    prompt: 'overhead flat lay of ceramic mugs on linen, editorial catalog style, muted palette',
  },
  {
    url: '/demo/mug-schnell-b.webp',
    provider: 'fal',
    modelId: 'fal-ai/qwen-image',
    seed: 9001,
    costEstimateUsd: 0.02,
    durationMs: 2980,
    prompt: 'ceramic mug on a windowsill at golden hour, film grain, kodak portra look',
  },
  {
    url: '/demo/mug-dev-b.webp',
    provider: 'fal',
    modelId: 'fal-ai/recraft/v4/text-to-image',
    seed: 512,
    costEstimateUsd: 0.04,
    durationMs: 5480,
    prompt: 'minimal poster illustration of a coffee mug, two flat colors, swiss grid layout',
  },
]

async function fetchFrame(url: string): Promise<{ blob: Blob; width: number; height: number }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`demo asset missing: ${url}`)
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  bitmap.close()
  return { blob, width, height }
}

function makeRecords(
  frame: { blob: Blob; width: number; height: number },
  gen: Omit<Generation, 'id' | 'imageIds' | 'tagIds'> & { tagIds?: string[] },
): { image: ImageBlobRecord; generation: Generation } {
  const image: ImageBlobRecord = {
    id: nanoid(),
    blob: frame.blob,
    mimeType: frame.blob.type || 'image/webp',
    width: frame.width,
    height: frame.height,
    bytes: frame.blob.size,
  }
  const generation: Generation = { ...gen, id: nanoid(), imageIds: [image.id], tagIds: gen.tagIds ?? [] }
  return { image, generation }
}

export async function seedDemoData(): Promise<void> {
  try {
    if ((await db.generations.count()) > 0) return

    const [productTag, clientTag, posterTag] = await Promise.all([
      ensureTag('product'),
      ensureTag('client-velora'),
      ensureTag('poster'),
    ])

    const gridRunId = nanoid()
    const now = Date.now()
    const images: ImageBlobRecord[] = []
    const generations: Generation[] = []

    // One comparison-grid run: 2 models x 2 seeds, the money shot.
    for (const [i, f] of GRID_FRAMES.entries()) {
      const frame = await fetchFrame(f.url)
      const { image, generation } = makeRecords(frame, {
        createdAt: now - 1000 * 60 * 45 + i * 5000,
        source: 'grid',
        gridRunId,
        provider: f.provider,
        modelId: f.modelId,
        prompt: PROMPT,
        params: { steps: 28, guidance: 3.5 },
        seed: f.seed,
        costEstimateUsd: f.costEstimateUsd,
        durationMs: f.durationMs,
        starred: f.modelId === 'fal-ai/flux/dev' && f.seed === 42, // the keeper
        tagIds: [productTag, clientTag],
        status: 'ok',
      })
      images.push(image)
      generations.push(generation)
    }

    // A few standalone generate-view runs for library variety.
    for (const [i, f] of SOLO_FRAMES.entries()) {
      const frame = await fetchFrame(f.url)
      const { image, generation } = makeRecords(frame, {
        createdAt: now - 1000 * 60 * 60 * (8 + i * 7),
        source: 'generate',
        provider: f.provider,
        modelId: f.modelId,
        prompt: f.prompt,
        params: { steps: 30, guidance: 4 },
        seed: f.seed,
        costEstimateUsd: f.costEstimateUsd,
        durationMs: f.durationMs,
        starred: i === 2,
        tagIds: i === 2 ? [posterTag] : [productTag],
        status: 'ok',
      })
      images.push(image)
      generations.push(generation)
    }

    await db.transaction('rw', db.generations, db.imageBlobs, async () => {
      await db.imageBlobs.bulkAdd(images)
      await db.generations.bulkAdd(generations)
    })

    if ((await db.recipes.count()) === 0) {
      await db.recipes.bulkAdd([
        {
          id: nanoid(),
          name: 'Product shot, warm light',
          createdAt: now - 1000 * 60 * 60 * 24 * 2,
          updatedAt: now - 1000 * 60 * 60 * 24,
          promptTemplate:
            'studio product shot of {subject}, warm morning light, oak table, shallow depth of field',
          provider: 'fal',
          modelId: 'fal-ai/flux/dev',
          params: { steps: 28, guidance: 3.5 },
          seedPolicy: { mode: 'fixed', seed: 42 },
          notes: 'The house look for catalog frames. Seed 42 is the keeper seed.',
        },
        {
          id: nanoid(),
          name: 'Flat poster, two colors',
          createdAt: now - 1000 * 60 * 60 * 24 * 5,
          updatedAt: now - 1000 * 60 * 60 * 24 * 5,
          promptTemplate: 'minimal poster illustration of {subject}, two flat colors, swiss grid layout',
          provider: 'fal',
          modelId: 'fal-ai/recraft/v4/text-to-image',
          params: {},
          seedPolicy: { mode: 'random' },
        },
      ])
    }

    console.info('[dev-seed] demo roll loaded: %d frames, 1 grid run, 2 recipes', generations.length)
  } catch (err) {
    console.warn('[dev-seed] skipped:', err)
  }
}
