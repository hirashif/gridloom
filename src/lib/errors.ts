import type { ProviderId } from './types'

export type AppErrorCode =
  | 'invalid_key'
  | 'billing_required'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'content_blocked'
  | 'model_unavailable'
  | 'network'
  | 'storage_full'
  | 'unknown'

export class AppError extends Error {
  code: AppErrorCode
  hint?: string
  provider?: ProviderId

  constructor(code: AppErrorCode, message: string, opts?: { hint?: string; provider?: ProviderId }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.hint = opts?.hint
    this.provider = opts?.provider
  }
}

/** Map an HTTP status + body from a provider into a normalized AppError. */
export function fromHttpStatus(provider: ProviderId, status: number, bodyText?: string): AppError {
  const body = (bodyText ?? '').toLowerCase()
  if (status === 401 || status === 403) {
    if (provider === 'gemini' && (body.includes('billing') || body.includes('billed'))) {
      return new AppError('billing_required', 'Google requires a billing-enabled project for image generation.', {
        provider,
        hint: 'Your key may be valid but the Google Cloud project behind it needs billing enabled.',
      })
    }
    return new AppError('invalid_key', 'Your key was rejected by the provider.', {
      provider,
      hint: 'Check the key in Settings. It may be revoked, mistyped, or lack permissions.',
    })
  }
  if (status === 429) {
    if (body.includes('quota') || body.includes('credit') || body.includes('balance')) {
      return new AppError('quota_exceeded', 'Your account is out of credits or quota.', {
        provider,
        hint:
          provider === 'gemini'
            ? 'Google free-tier keys have little to no image quota. Enable billing on the project (pay-as-you-go) to use Nano Banana.'
            : undefined,
      })
    }
    return new AppError('rate_limited', 'Rate limited by the provider.', {
      provider,
      hint: 'Wait a moment and retry.',
    })
  }
  if (status === 404) {
    return new AppError('model_unavailable', 'Model unavailable. It may have been renamed or retired.', { provider })
  }
  if (body.includes('safety') || body.includes('content policy') || body.includes('blocked')) {
    return new AppError('content_blocked', 'The provider blocked this prompt (safety filter).', { provider })
  }
  return new AppError('unknown', `Provider error (HTTP ${status}).`, { provider })
}

export function toAppError(provider: ProviderId, err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof TypeError && String(err.message).toLowerCase().includes('fetch')) {
    return new AppError('network', "Couldn't reach the provider. Check your connection.", { provider })
  }
  const msg = err instanceof Error ? err.message : String(err)
  // @fal-ai/client throws ApiError with .status and .body
  const status = (err as { status?: number })?.status
  if (typeof status === 'number') {
    const body = (err as { body?: unknown })?.body
    return fromHttpStatus(provider, status, typeof body === 'string' ? body : JSON.stringify(body ?? ''))
  }
  return new AppError('unknown', msg, { provider })
}
