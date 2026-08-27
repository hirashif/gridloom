import { Dialog } from '@base-ui-components/react/dialog'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, deleteGenerations, ensureTag } from '../lib/db'
import { getModel } from '../lib/models'
import { toast } from '../lib/toast'
import type { Generation } from '../lib/types'
import { cn, humanizeParamValue } from '../lib/ui'
import { formatUsd } from '../stores/cost'
import { useDraft } from '../stores/draft'
import BlobImage from './BlobImage'
import { WinnerMark } from './WinnerMark'
import RecipeDialog from './RecipeDialog'
import ConfirmDialog from './studio/ConfirmDialog'
import FrameLightbox from './sheet/FrameLightbox'
import TagCombobox from './sheet/TagCombobox'

/** One row of the mono metadata stamp: dim label, right-aligned data value. */
function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-faint">{label}</span>
      <span className="truncate text-right text-ink">{value}</span>
    </div>
  )
}

/** A flat paper action pill — used for every secondary action in the detail rail. */
const actionPill =
  'press flex items-center justify-center gap-2 rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 px-3.5 py-2.5 text-[13px] font-semibold text-ink hover:border-accent'

export default function GenerationDetail({ gen: initial, onClose }: { gen: Generation; onClose: () => void }) {
  const navigate = useNavigate()
  const setDraft = useDraft((s) => s.setDraft)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Animate the keeper draw only when it was circled in this dialog session.
  const [justCircled, setJustCircled] = useState(false)

  // Read live from the DB so star/tags always reflect truth, never a stale snapshot.
  const gen = useLiveQuery(() => db.generations.get(initial.id), [initial.id]) ?? initial
  const model = getModel(gen.modelId)
  const allTags = useLiveQuery(() => db.tags.orderBy('name').toArray()) ?? []
  const genTags = allTags.filter((t) => gen.tagIds.includes(t.id))

  async function addTag(name: string) {
    if (!name.trim()) return
    const id = await ensureTag(name)
    if (gen.tagIds.includes(id)) return
    await db.generations.update(gen.id, { tagIds: [...gen.tagIds, id] })
  }

  async function removeTag(id: string) {
    await db.generations.update(gen.id, { tagIds: gen.tagIds.filter((t) => t !== id) })
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(gen.prompt)
    toast('Prompt copied.')
  }

  function useAgain() {
    setDraft({
      provider: gen.provider,
      modelId: gen.modelId,
      prompt: gen.prompt,
      negativePrompt: gen.negativePrompt,
      params: gen.params,
      seed: gen.seed ?? undefined,
    })
    onClose()
    navigate('/generate')
  }

  async function download() {
    const imageId = gen.imageIds[0]
    if (!imageId) return
    const rec = await db.imageBlobs.get(imageId)
    if (!rec) return
    const url = URL.createObjectURL(rec.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gridloom-${model?.name.replaceAll(' ', '-') ?? gen.modelId}${gen.seed !== null ? `-${gen.seed}` : ''}.png`
    a.click()
    URL.revokeObjectURL(url)
    toast('Image downloaded.')
  }

  async function toggleStar() {
    const next = !gen.starred
    await db.generations.update(gen.id, { starred: next })
    if (next) {
      setJustCircled(true)
      toast('Keeper marked.')
    } else {
      setJustCircled(false)
    }
  }

  async function remove() {
    await deleteGenerations([gen.id])
    setConfirmDelete(false)
    toast('Frame discarded from this browser. There was never a server copy.')
    onClose()
  }

  const lightboxFrames = gen.imageIds.map((imageId, i) => ({
    imageId,
    caption: `${gen.modelId} · seed ${gen.seed ?? 'none'} · ${formatUsd(gen.costEstimateUsd)}${
      gen.imageIds.length > 1 ? ` · frame ${i + 1} of ${gen.imageIds.length}` : ''
    }`,
    alt: gen.prompt,
  }))

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-[3px] animate-fade-in" />
        <Dialog.Popup className="animate-pop fixed left-1/2 top-1/2 z-50 grid max-h-[88vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 grid-cols-1 gap-6 overflow-y-auto rounded-2xl bg-paper2 p-[26px] shadow-[0_40px_80px_-20px_rgba(0,0,0,.5)] md:grid-cols-[1fr_260px]">
          <Dialog.Close
            aria-label="Close"
            className="press absolute right-4 top-3.5 z-10 text-lg text-faint hover:text-ink"
          >
            ✕
          </Dialog.Close>

          {/* Big print on its white mount */}
          <div className="self-start rounded-lg bg-white p-3 pb-2.5 shadow-[0_16px_36px_-14px_rgba(60,48,24,.4)]">
            {gen.imageIds[0] && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="View full size"
                className="cursor-loupe relative block w-full overflow-hidden rounded-[4px]"
              >
                <BlobImage imageId={gen.imageIds[0]} alt={gen.prompt} className="w-full object-contain" />
                {gen.starred && <WinnerMark label={false} animate={justCircled} />}
              </button>
            )}
            <div className="mt-2 flex justify-between px-0.5 font-mono text-[10px] text-[#8A7C5E]">
              <span>
                {model?.short ?? gen.modelId}
                {gen.seed !== null && ` · s${gen.seed}`}
              </span>
              <span>{gen.imageIds.length > 1 ? `${gen.imageIds.length} frames` : 'click to zoom'}</span>
            </div>
          </div>

          {/* Metadata + actions rail */}
          <div className="flex flex-col gap-3 pt-1">
            <Dialog.Title className="text-sm font-semibold leading-snug text-ink">“{gen.prompt}”</Dialog.Title>
            {gen.negativePrompt && (
              <p className="text-xs text-muted">
                <span className="text-faint">negative:</span> {gen.negativePrompt}
              </p>
            )}

            <div className="flex flex-col gap-1.5 rounded-[9px] border border-[rgba(var(--hair),.14)] bg-card px-3.5 py-3 font-mono text-[10.5px] leading-relaxed">
              <MetaRow label="model" value={model?.name ?? gen.modelId} />
              <MetaRow label="provider" value={gen.provider} />
              <MetaRow label="seed" value={gen.seed ?? 'none'} />
              {Object.entries(gen.params).map(([k, v]) => (
                <MetaRow
                  key={k}
                  label={k.replaceAll('_', ' ')}
                  value={typeof v === 'string' ? humanizeParamValue(k, v) : String(v)}
                />
              ))}
              <MetaRow label="cost" value={`est. ${formatUsd(gen.costEstimateUsd)}`} />
              <MetaRow label="time" value={`${(gen.durationMs / 1000).toFixed(1)}s`} />
              <MetaRow label="source" value={gen.source === 'grid' ? 'grid run' : 'generate'} />
              <MetaRow label="date" value={new Date(gen.createdAt).toLocaleString()} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {genTags.map((t) => (
                <span
                  key={t.id}
                  className="flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[11px] text-muted"
                >
                  {t.name}
                  <button
                    type="button"
                    aria-label={`Remove tag ${t.name}`}
                    onClick={() => void removeTag(t.id)}
                    className="press rounded p-0.5 text-faint hover:text-danger"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <TagCombobox
                options={allTags.map((t) => t.name)}
                exclude={genTags.map((t) => t.name)}
                onAdd={(name) => void addTag(name)}
              />
            </div>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void toggleStar()} className={cn(actionPill, 'col-span-2')}>
                {gen.starred ? 'Marked as keeper ✓' : 'Mark as keeper'}
              </button>
              <button type="button" onClick={() => void copyPrompt()} className={actionPill}>
                Copy prompt
              </button>
              <button type="button" onClick={useAgain} className={actionPill}>
                Run it again
              </button>
              <button type="button" onClick={() => setRecipeOpen(true)} className={actionPill}>
                ✎ Save recipe
              </button>
              <button type="button" onClick={() => void download()} className={actionPill}>
                ↓ Export PNG
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="press col-span-2 flex items-center justify-center gap-2 rounded-[9px] border border-danger/30 px-3.5 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger-soft"
              >
                Discard frame
              </button>
            </div>
          </div>

          {recipeOpen && (
            <RecipeDialog
              source={{
                provider: gen.provider,
                modelId: gen.modelId,
                prompt: gen.prompt,
                negativePrompt: gen.negativePrompt,
                params: gen.params,
                seed: gen.seed,
              }}
              onClose={() => setRecipeOpen(false)}
            />
          )}

          <ConfirmDialog
            open={confirmDelete}
            title="Discard this frame?"
            body="The frame is discarded from this browser. There was never a server copy."
            confirmLabel="Discard it"
            destructive
            onConfirm={() => void remove()}
            onCancel={() => setConfirmDelete(false)}
          />

          {lightboxOpen && <FrameLightbox frames={lightboxFrames} onClose={() => setLightboxOpen(false)} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
