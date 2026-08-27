import type { RecipeSource } from '../RecipeDialog'
import type { Generation } from '../../lib/types'

/** Build a RecipeDialog source prop from a saved generation. */
export function toRecipeSource(
  gen: Pick<Generation, 'provider' | 'modelId' | 'prompt' | 'negativePrompt' | 'params' | 'seed'>,
): RecipeSource {
  return {
    provider: gen.provider,
    modelId: gen.modelId,
    prompt: gen.prompt,
    negativePrompt: gen.negativePrompt,
    params: gen.params,
    seed: gen.seed,
  }
}
