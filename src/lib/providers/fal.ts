import { createFalClient } from '@fal-ai/client'
import { AppError, fromHttpStatus, toAppError } from '../errors'
import { getModel } from '../models'
import type { GenerateInput, GenerateOutput, ProviderAdapter } from './index'

interface FalImage {
  url: string
  width?: number
  height?: number
}

/** fal exposes img2img as a sibling endpoint of the text endpoint. The only model
 *  we flag `img2img` (flux/dev) follows the `/image-to-image` suffix; the FLUX.2
 *  family uses a different `/edit` payload we have not verified, so it stays off. */
function imageToImageEndpoint(modelId: string): string {
  return `${modelId}/image-to-image`
}

export const falAdapter: ProviderAdapter = {
  id: 'fal',

  async generate(input: GenerateInput, apiKey: string): Promise<GenerateOutput> {
    const fal = createFalClient({ credentials: apiKey })
    const started = performance.now()

    // img2img is honored only when the model has an image-to-image endpoint on fal.
    // For text-to-image (no reference, or a model without the flag) nothing below
    // changes: same endpoint id, same payload as before.
    const model = getModel(input.modelId)
    const useImg2img = Boolean(input.referenceImage && model?.img2img)

    let imageUrl: string | undefined
    if (useImg2img) {
      try {
        imageUrl = await fal.storage.upload(input.referenceImage!)
      } catch (err) {
        throw toAppError('fal', err)
      }
    }

    const endpointId = useImg2img ? imageToImageEndpoint(input.modelId) : input.modelId

    let data: { images?: FalImage[]; seed?: number }
    try {
      const result = await fal.subscribe(endpointId, {
        input: {
          prompt: input.prompt,
          ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
          ...(input.seed !== undefined ? { seed: input.seed } : {}),
          ...input.params,
          ...(useImg2img && imageUrl
            ? { image_url: imageUrl, strength: input.referenceStrength ?? 0.6 }
            : {}),
        },
      })
      data = result.data as typeof data
    } catch (err) {
      throw toAppError('fal', err)
    }

    const falImages = data.images ?? []
    if (falImages.length === 0) {
      throw new AppError('unknown', 'fal.ai returned no images.', { provider: 'fal' })
    }

    // Results come back as fal CDN URLs — pull them down so everything lives locally.
    const images = await Promise.all(
      falImages.map(async (img) => {
        const res = await fetch(img.url)
        if (!res.ok) throw new AppError('network', 'Failed to download the generated image.', { provider: 'fal' })
        const blob = await res.blob()
        return { blob, width: img.width ?? 0, height: img.height ?? 0 }
      }),
    )

    return {
      images,
      seed: typeof data.seed === 'number' ? data.seed : null,
      durationMs: Math.round(performance.now() - started),
    }
  },

  async testKey(apiKey: string): Promise<void> {
    // Authenticated GET against a nonexistent request id: invalid key → 401,
    // valid key → 404/422. Costs nothing.
    let res: Response
    try {
      res = await fetch(
        'https://queue.fal.run/fal-ai/flux/requests/00000000-0000-0000-0000-000000000000/status',
        { headers: { Authorization: `Key ${apiKey}` } },
      )
    } catch (err) {
      throw toAppError('fal', err)
    }
    if (res.status === 401 || res.status === 403) {
      throw fromHttpStatus('fal', res.status, await res.text())
    }
  },
}
