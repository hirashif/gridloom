import type { ProviderId } from '../types'
import { getAdapter } from './index'

/** Zero-cost key validation per provider. Resolves on valid, throws AppError on invalid. */
export async function testProviderKey(provider: ProviderId, apiKey: string): Promise<void> {
  return getAdapter(provider).testKey(apiKey)
}
