import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RecipeDialog from '../components/RecipeDialog'
import ConfirmDialog from '../components/studio/ConfirmDialog'
import { toRecipeSource } from '../components/studio/recipe-source'
import { db } from '../lib/db'
import { getModel } from '../lib/models'
import type { Recipe } from '../lib/types'
import { cn } from '../lib/ui'
import { useDraft } from '../stores/draft'

/** The models a recipe fans across: the sheet-saved list if present, else its single legacy model. */
function recipeModelIds(recipe: Recipe): string[] {
  return recipe.modelIds && recipe.modelIds.length > 0 ? recipe.modelIds : [recipe.modelId]
}

/** Short mono label for a model id — the registry's `short`, or the raw id if it's gone. */
function modelShort(id: string): string {
  return getModel(id)?.short ?? id
}

/** The seed line shown on the card: fixed pins one seed, random fans `seedCount` columns. */
function seedLabel(recipe: Recipe): string {
  if (recipe.seedPolicy.mode === 'fixed') return `seed ${recipe.seedPolicy.seed}`
  const n = recipe.seedCount ?? 3
  return `${n} random seed${n === 1 ? '' : 's'}`
}

export default function RecipesPage() {
  const navigate = useNavigate()
  const setGridDraft = useDraft((s) => s.setGridDraft)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Recipe | null>(null)

  const recipes = useLiveQuery(() => db.recipes.orderBy('updatedAt').reverse().toArray())
  const lastGen = useLiveQuery(() => db.generations.orderBy('createdAt').reverse().first())

  if (recipes === undefined) return null

  // Run a recipe = hand its whole setup to the Compare grid and jump there.
  // Sheet-saved recipes carry modelIds + seedCount; legacy single-model recipes fall
  // back to their one model and a seed count derived from the fixed/random policy.
  function run(recipe: Recipe) {
    setGridDraft({
      prompt: recipe.promptTemplate,
      modelIds: recipeModelIds(recipe),
      seedCount: recipe.seedCount ?? (recipe.seedPolicy.mode === 'fixed' ? 1 : 3),
    })
    navigate('/grid')
  }

  async function duplicate(recipe: Recipe) {
    const now = Date.now()
    await db.recipes.add({ ...recipe, id: nanoid(), name: `${recipe.name} copy`, createdAt: now, updatedAt: now })
  }

  return (
    <div className="mx-auto w-full max-w-[1220px]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Recipes</h1>
          <p className="mt-[3px] text-[13px] text-faint">
            A recipe = prompt template + models + seed policy. Frozen luck.
          </p>
        </div>
        {lastGen && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="press shrink-0 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper2 hover:bg-accent"
          >
            + New recipe
          </button>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {recipes.length === 0 ? (
        <div className="mt-[22px] flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[rgba(var(--hair),.25)] bg-card px-10 py-[60px] animate-rise">
          <span className="-rotate-2 font-hand text-[26px] text-faint">no recipes yet</span>
          <p className="max-w-[40ch] text-center text-[13.5px] leading-[1.55] text-faint">
            Next time a comparison run lands a keeper, hit “save as recipe” — the whole setup gets frozen here for
            one-click re-runs.
          </p>
          {lastGen ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="press mt-1 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper2 hover:bg-accent"
            >
              Save your last generation as a recipe
            </button>
          ) : (
            <Link
              to="/grid"
              className="press mt-1 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper2 hover:bg-accent"
            >
              Run a sheet first
            </Link>
          )}
        </div>
      ) : (
        /* ── Card grid ────────────────────────────────────────── */
        <div className="mt-[22px] grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const modelIds = recipeModelIds(recipe)
            return (
              <div
                key={recipe.id}
                className="flex flex-col gap-3 rounded-[14px] border border-[rgba(var(--hair),.14)] bg-card p-5 transition-colors hover:border-[rgba(var(--hair),.3)] animate-rise"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-mono text-[13px] font-semibold text-ink">{recipe.name}</h2>
                  <div className="flex shrink-0 items-center gap-2.5 text-xs text-faint">
                    <button
                      type="button"
                      onClick={() => setEditing(recipe)}
                      title="edit"
                      aria-label={`Edit ${recipe.name}`}
                      className="press hover:text-ink"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => void duplicate(recipe)}
                      title="duplicate"
                      aria-label={`Duplicate ${recipe.name}`}
                      className="press hover:text-ink"
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(recipe)}
                      title="delete"
                      aria-label={`Delete ${recipe.name}`}
                      className="press hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <p className="rounded-lg bg-paper2 px-[11px] py-[9px] text-[12.5px] italic leading-[1.55] text-muted">
                  “{recipe.promptTemplate}”
                </p>

                <div className="flex flex-wrap gap-[5px]">
                  {modelIds.map((id, i) => (
                    <span
                      key={id}
                      className={cn(
                        'rounded font-mono text-[9.5px]',
                        i === 0
                          ? 'bg-ink px-[7px] py-[3px] text-paper2'
                          : 'border border-[rgba(var(--hair),.2)] px-[7px] py-[3px] text-muted',
                      )}
                    >
                      {modelShort(id)}
                    </span>
                  ))}
                  <span className="rounded border border-[rgba(var(--hair),.2)] px-[7px] py-[3px] font-mono text-[9.5px] text-muted">
                    {seedLabel(recipe)}
                  </span>
                </div>

                {recipe.notes && <p className="text-[11px] italic text-faint">{recipe.notes}</p>}

                <div className="mt-auto flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => run(recipe)}
                    className="press rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_2px_0_rgba(36,31,24,.25)] hover:bg-accent-hover"
                  >
                    Run ▸
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        destructive
        title="Delete this recipe?"
        body={deleting ? `“${deleting.name}” goes for good. Frames you made with it stay in your library.` : ''}
        confirmLabel="Delete recipe"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void db.recipes.delete(deleting.id)
          setDeleting(null)
        }}
      />

      {editing && <RecipeDialog existing={editing} onClose={() => setEditing(null)} />}
      {creating && lastGen && (
        <RecipeDialog source={toRecipeSource(lastGen)} onClose={() => setCreating(false)} />
      )}
    </div>
  )
}
