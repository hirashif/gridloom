import { downloadZip } from 'client-zip'
import { db } from './db'
import { getModel } from './models'
import type { Generation } from './types'

/**
 * Bundle generations into a downloadable zip: one PNG + one JSON sidecar per
 * frame (prompt, model, params, seed, cost, timing — never keys). Shared by the
 * Library's batch export and Settings' "Export everything".
 */
export async function exportZip(gens: Generation[]) {
  const files: { name: string; input: Blob | string }[] = []
  let i = 0
  for (const gen of gens) {
    i++
    const model = getModel(gen.modelId)
    const base = `${String(i).padStart(3, '0')}-${(model?.name ?? gen.modelId).replaceAll(/[^\w-]+/g, '-')}${gen.seed !== null ? `-${gen.seed}` : ''}`
    const rec = gen.imageIds[0] ? await db.imageBlobs.get(gen.imageIds[0]) : undefined
    if (rec) files.push({ name: `${base}.png`, input: rec.blob })
    files.push({
      name: `${base}.json`,
      input: JSON.stringify(
        {
          prompt: gen.prompt,
          negativePrompt: gen.negativePrompt,
          provider: gen.provider,
          model: gen.modelId,
          params: gen.params,
          seed: gen.seed,
          costEstimateUsd: gen.costEstimateUsd,
          durationMs: gen.durationMs,
          createdAt: new Date(gen.createdAt).toISOString(),
          source: gen.source,
        },
        null,
        2,
      ),
    })
  }
  const blob = await downloadZip(files).blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gridloom-export-${gens.length}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
