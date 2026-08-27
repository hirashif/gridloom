import { AppError, fromHttpStatus, toAppError } from '../errors'
import type { GenerateInput, GenerateOutput, ProviderAdapter } from './index'

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mimeType })
}

async function withDims(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  const out = { blob, width: bmp.width, height: bmp.height }
  bmp.close()
  return out
}

interface GeminiPart {
  inlineData?: { mimeType?: string; data?: string }
}

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',

  async generate(input: GenerateInput, apiKey: string): Promise<GenerateOutput> {
    const started = performance.now()
    const aspect = input.params.aspect_ratio
    const body = {
      contents: [{ parts: [{ text: input.prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(aspect ? { imageConfig: { aspectRatio: String(aspect) } } : {}),
      },
    }

    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${input.modelId}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        },
      )
    } catch (err) {
      throw toAppError('gemini', err)
    }
    if (!res.ok) throw fromHttpStatus('gemini', res.status, await res.text())

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[]
      promptFeedback?: { blockReason?: string }
    }
    if (json.promptFeedback?.blockReason) {
      throw new AppError('content_blocked', 'Google blocked this prompt (safety filter).', { provider: 'gemini' })
    }
    const parts = json.candidates?.[0]?.content?.parts ?? []
    const imageParts = parts.filter((p) => p.inlineData?.data)
    if (imageParts.length === 0) {
      throw new AppError('unknown', 'Gemini returned no image for this prompt.', { provider: 'gemini' })
    }

    const images = await Promise.all(
      imageParts.map((p) => withDims(base64ToBlob(p.inlineData!.data!, p.inlineData!.mimeType ?? 'image/png'))),
    )
    return { images, seed: null, durationMs: Math.round(performance.now() - started) }
  },

  async testKey(apiKey: string): Promise<void> {
    let res: Response
    try {
      res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
        headers: { 'x-goog-api-key': apiKey },
      })
    } catch (err) {
      throw toAppError('gemini', err)
    }
    if (!res.ok) throw fromHttpStatus('gemini', res.status === 400 ? 401 : res.status, await res.text())
  },
}
