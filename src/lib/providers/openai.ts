import { AppError, fromHttpStatus, toAppError } from '../errors'
import type { GenerateInput, GenerateOutput, ProviderAdapter } from './index'

function base64ToBlob(b64: string): Blob {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: 'image/png' })
}

export const openaiAdapter: ProviderAdapter = {
  id: 'openai',

  async generate(input: GenerateInput, apiKey: string): Promise<GenerateOutput> {
    const started = performance.now()
    const size = String(input.params.size ?? '1024x1024')
    const body = {
      model: input.modelId,
      prompt: input.prompt,
      n: 1,
      size,
      quality: String(input.params.quality ?? 'medium'),
    }

    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw toAppError('openai', err)
    }
    if (!res.ok) throw fromHttpStatus('openai', res.status, await res.text())

    const json = (await res.json()) as { data?: { b64_json?: string }[] }
    const b64 = json.data?.[0]?.b64_json
    if (!b64) throw new AppError('unknown', 'OpenAI returned no image.', { provider: 'openai' })

    const [w, h] = size.split('x').map(Number)
    return {
      images: [{ blob: base64ToBlob(b64), width: w ?? 0, height: h ?? 0 }],
      seed: null,
      durationMs: Math.round(performance.now() - started),
    }
  },

  async testKey(apiKey: string): Promise<void> {
    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    } catch (err) {
      throw toAppError('openai', err)
    }
    if (!res.ok) throw fromHttpStatus('openai', res.status, await res.text())
  },
}
