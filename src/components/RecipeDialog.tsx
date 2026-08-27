import { Dialog } from '@base-ui-components/react/dialog'
import { Radio } from '@base-ui-components/react/radio'
import { RadioGroup } from '@base-ui-components/react/radio-group'
import { nanoid } from 'nanoid'
import { useRef, useState } from 'react'
import { db } from '../lib/db'
import { getModel } from '../lib/models'
import { toast } from '../lib/toast'
import type { ParamValue, ProviderId, Recipe } from '../lib/types'
import { buttonVariants, cn, inputVariants } from '../lib/ui'

export interface RecipeSource {
  provider: ProviderId
  modelId: string
  prompt: string
  negativePrompt?: string
  params: Record<string, ParamValue>
  seed: number | null
}

export default function RecipeDialog({
  source,
  existing,
  onClose,
}: {
  source?: RecipeSource
  existing?: Recipe
  onClose: () => void
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(existing?.name ?? '')
  const [prompt, setPrompt] = useState(existing?.promptTemplate ?? source?.prompt ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const fixedSeed = existing?.seedPolicy.mode === 'fixed' ? existing.seedPolicy.seed : (source?.seed ?? null)
  const [seedMode, setSeedMode] = useState<'random' | 'fixed'>(
    existing?.seedPolicy.mode ?? (source?.seed !== null && source?.seed !== undefined ? 'fixed' : 'random'),
  )
  const [saving, setSaving] = useState(false)

  const canFixSeed = fixedSeed !== null
  // Sheet-saved recipes fan across several models. The editor stays single-model
  // (mechanics untouched), so we surface that set as read-only mono chips only.
  const sheetModelIds = existing?.modelIds && existing.modelIds.length > 0 ? existing.modelIds : null

  async function save() {
    if (!name.trim() || !prompt.trim() || saving) return
    setSaving(true)
    const now = Date.now()
    const seedPolicy: Recipe['seedPolicy'] =
      seedMode === 'fixed' && fixedSeed !== null ? { mode: 'fixed', seed: fixedSeed } : { mode: 'random' }
    if (existing) {
      await db.recipes.update(existing.id, {
        name: name.trim(),
        promptTemplate: prompt.trim(),
        notes: notes.trim() || undefined,
        seedPolicy,
        updatedAt: now,
      })
    } else if (source) {
      await db.recipes.add({
        id: nanoid(),
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        promptTemplate: prompt.trim(),
        negativePrompt: source.negativePrompt,
        provider: source.provider,
        modelId: source.modelId,
        params: source.params,
        seedPolicy,
        notes: notes.trim() || undefined,
      })
    }
    toast(existing ? 'Recipe updated.' : 'Recipe saved. Same look, one click, next time.')
    onClose()
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 animate-fade-in" />
        <Dialog.Popup
          initialFocus={nameRef}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border-[1.5px] border-accent bg-card p-5 animate-rise"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[13px] font-bold text-ink">
              {existing ? 'Edit recipe' : 'New recipe'}
            </Dialog.Title>
            <Dialog.Close className="press text-sm text-faint hover:text-ink" aria-label="Close">
              ✕
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="recipe-name" className="text-sm text-muted">
                Name
              </label>
              <input
                id="recipe-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="name, e.g. og-card.v1"
                className={cn(inputVariants({ tone: 'mono' }), 'mt-1')}
              />
            </div>

            <div>
              <label htmlFor="recipe-prompt" className="text-sm text-muted">
                Prompt template
              </label>
              <textarea
                id="recipe-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="prompt template — use {subject} for the variable part"
                className={cn(inputVariants(), 'mt-1 resize-y')}
              />
              <p className="mt-1 text-[11px] text-faint">
                Tip: use {'{{placeholders}}'} for parts you swap out per run.
              </p>
            </div>

            {sheetModelIds && (
              <div>
                <span className="text-sm text-muted">Models</span>
                <div className="mt-1.5 flex flex-wrap gap-[5px]">
                  {sheetModelIds.map((id) => (
                    <span
                      key={id}
                      className="rounded border border-[rgba(var(--hair),.2)] px-[7px] py-[3px] font-mono text-[9.5px] text-muted"
                    >
                      {getModel(id)?.short ?? id}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-faint">
                  Saved from a Compare sheet. Change the model set by running the sheet again.
                </p>
              </div>
            )}

            <fieldset>
              <legend className="text-sm text-muted">Seed</legend>
              <RadioGroup
                value={seedMode}
                onValueChange={(next) => setSeedMode(next as 'random' | 'fixed')}
                className="mt-1.5 space-y-1.5"
              >
                <label className="flex items-center gap-2 text-sm text-ink">
                  <Radio.Root
                    value="random"
                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--hair),.25)] bg-paper2 data-checked:border-ink"
                  >
                    <Radio.Indicator className="size-2 rounded-full bg-ink" />
                  </Radio.Root>
                  Random each run
                </label>
                {canFixSeed && (
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <Radio.Root
                      value="fixed"
                      className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--hair),.25)] bg-paper2 data-checked:border-ink"
                    >
                      <Radio.Indicator className="size-2 rounded-full bg-ink" />
                    </Radio.Root>
                    <span>
                      Fixed seed <span className="font-mono text-xs">{fixedSeed}</span>, same look every run
                    </span>
                  </label>
                )}
              </RadioGroup>
            </fieldset>

            <div>
              <label htmlFor="recipe-notes" className="text-sm text-muted">
                Notes (optional)
              </label>
              <input
                id="recipe-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What this is for…"
                className={cn(inputVariants(), 'mt-1')}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={cn(buttonVariants({ intent: 'secondary' }))}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!name.trim() || !prompt.trim() || saving}
              className={cn(buttonVariants({ intent: 'primary' }))}
            >
              {existing ? 'Save changes' : 'Save recipe'}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
