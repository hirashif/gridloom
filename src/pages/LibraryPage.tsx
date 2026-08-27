import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BlobImage from '../components/BlobImage'
import GenerationDetail from '../components/GenerationDetail'
import { WinnerMark } from '../components/WinnerMark'
import ConfirmDialog from '../components/studio/ConfirmDialog'
import FrameLightbox from '../components/sheet/FrameLightbox'
import TagFilter from '../components/sheet/TagFilter'
import { db, deleteGenerations } from '../lib/db'
import { exportZip } from '../lib/export-zip'
import { PROVIDERS, getModel } from '../lib/models'
import type { Generation, ProviderId } from '../lib/types'
import { cn, inputVariants } from '../lib/ui'
import { formatUsd } from '../stores/cost'
import { toast } from '../lib/toast'

function useStorageEstimate(deps: unknown[]) {
  const [usedMb, setUsedMb] = useState<number | null>(null)
  useEffect(() => {
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined) setUsedMb(est.usage / 1024 / 1024)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return usedMb
}

/** Filter kinds: everything, keepers only, or a single provider. */
type Filt = { kind: 'all' } | { kind: 'marked' } | { kind: 'provider'; provider: ProviderId }

/** Small deterministic tilt so the light table reads as loose prints, not a data
 *  grid. Straightens to 0 on hover (see the print's group-hover class). */
const ROTATIONS = ['-1.2deg', '0.8deg', '-0.6deg', '1.1deg', '-0.9deg', '0.5deg']

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filt, setFilt] = useState<Filt>({ kind: 'all' })
  const [tagFilter, setTagFilter] = useState<string>('')
  const [selected, setSelected] = useState<Generation | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [gridRef] = useAutoAnimate<HTMLDivElement>()

  const starredOnly = filt.kind === 'marked'
  const providerFilter = filt.kind === 'provider' ? filt.provider : null

  // ~150ms debounce so typing does not re-filter on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 150)
    return () => clearTimeout(t)
  }, [search])

  const tags = useLiveQuery(() => db.tags.orderBy('name').toArray()) ?? []
  // In-memory filter over the whole table. Fine at this scale; grid
  // virtualization is a later pass.
  const generations = useLiveQuery(async () => {
    const q = query.trim().toLowerCase()
    let items = await db.generations.orderBy('createdAt').reverse().toArray()
    if (starredOnly) items = items.filter((g) => g.starred)
    if (providerFilter) items = items.filter((g) => g.provider === providerFilter)
    if (tagFilter) items = items.filter((g) => g.tagIds.includes(tagFilter))
    if (q) items = items.filter((g) => g.prompt.toLowerCase().includes(q))
    return items
  }, [query, starredOnly, providerFilter, tagFilter])

  const usedMb = useStorageEstimate([generations?.length])

  if (generations === undefined) return null

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkExport() {
    const gens = generations!.filter((g) => checked.has(g.id))
    if (gens.length === 0) return
    setExporting(true)
    try {
      await exportZip(gens)
      toast('Library exported. Every prompt, seed, and cost went with it.')
    } finally {
      setExporting(false)
    }
  }

  async function bulkDelete() {
    const n = checked.size
    if (n === 0) return
    await deleteGenerations([...checked])
    setConfirmDelete(false)
    setChecked(new Set())
    toast(
      n === 1
        ? 'Frame discarded from this browser. There was never a server copy.'
        : `${n} frames discarded from this browser. There was never a server copy.`,
    )
  }

  const lightboxFrames = generations
    .filter((g) => g.imageIds[0])
    .map((g) => ({
      genId: g.id,
      imageId: g.imageIds[0]!,
      caption: `${g.modelId} · seed ${g.seed ?? 'none'} · ${formatUsd(g.costEstimateUsd)}`,
      alt: g.prompt,
    }))

  function openLightbox(genId: string) {
    const idx = lightboxFrames.findIndex((f) => f.genId === genId)
    if (idx >= 0) setLightboxIndex(idx)
  }

  // Providers that actually have frames on the table — only those chips show.
  const presentProviders = (Object.keys(PROVIDERS) as ProviderId[]).filter((p) =>
    generations.some((g) => g.provider === p),
  )

  // Cold-empty state: nothing shot at all, no filters engaged — the light table.
  if (generations.length === 0 && !query && filt.kind === 'all' && !tagFilter) {
    return (
      <div className="sheet-surface mt-5 flex flex-col items-center gap-3.5 rounded-2xl border border-[rgba(var(--hair),.16)] px-10 py-[70px] text-center">
        <div className="flex gap-3">
          <span className="flex size-[74px] -rotate-3 items-center justify-center rounded-md bg-white shadow-[0_8px_18px_-8px_rgba(60,48,24,.35)]">
            <span className="size-14 rounded-[3px] border-[1.5px] border-dashed border-[rgba(var(--hair),.25)]" />
          </span>
          <span className="flex size-[74px] rotate-2 items-center justify-center rounded-md bg-white shadow-[0_8px_18px_-8px_rgba(60,48,24,.35)]">
            <span className="size-14 rounded-[3px] border-[1.5px] border-dashed border-[rgba(var(--hair),.25)]" />
          </span>
        </div>
        <h1 className="font-display text-2xl text-muted">The light table is empty.</h1>
        <p className="max-w-[38ch] text-[13.5px] leading-relaxed text-faint">
          Everything you generate files itself here automatically — prompt, seed, params, cost, all of it.
        </p>
        <Link
          to="/grid"
          className="press mt-1 rounded-full bg-accent px-[22px] py-[11px] text-sm font-semibold text-white shadow-[0_2px_0_rgba(36,31,24,.25)] hover:bg-accent-hover"
        >
          Run your first sheet →
        </Link>
      </div>
    )
  }

  const chip = (active: boolean) =>
    cn(
      'press rounded-full border px-3.5 py-[7px] font-mono text-[11.5px] font-medium transition-colors',
      active
        ? 'border-[rgba(var(--hair),.2)] bg-chip-on text-ink'
        : 'border-[rgba(var(--hair),.16)] bg-chip text-muted hover:text-ink',
    )

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="library-search" className="sr-only">
          Search prompts and tags
        </label>
        <input
          id="library-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search prompts, tags…"
          className={cn(inputVariants(), 'min-w-[220px] flex-1 rounded-full px-[18px] py-[10px]')}
        />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setFilt({ kind: 'all' })} className={chip(filt.kind === 'all')}>
            All
          </button>
          <button type="button" onClick={() => setFilt({ kind: 'marked' })} className={chip(filt.kind === 'marked')}>
            Marked
          </button>
          {presentProviders.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilt({ kind: 'provider', provider: p })}
              className={chip(filt.kind === 'provider' && filt.provider === p)}
            >
              {PROVIDERS[p].name}
            </button>
          ))}
        </div>
        {tags.length > 0 && <TagFilter tags={tags} value={tagFilter} onChange={setTagFilter} />}
        <span className="ml-auto font-mono text-[11px] text-faint">
          {generations.length} frame{generations.length === 1 ? '' : 's'}
          {usedMb !== null && ` · ${usedMb < 100 ? usedMb.toFixed(1) : Math.round(usedMb)} MB`}
        </span>
      </div>

      {/* ── Batch action rail ───────────────────────────────────── */}
      {checked.size > 0 && (
        <div className="mt-3 flex animate-rise items-center gap-3 rounded-xl border border-[rgba(var(--hair),.16)] bg-card px-4 py-2.5 text-sm">
          <span className="font-mono text-xs text-muted">{checked.size} selected</span>
          <button
            type="button"
            onClick={() => void bulkExport()}
            disabled={exporting}
            className="press rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : 'Export ZIP (PNG + metadata)'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="press rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="press ml-auto font-mono text-[11px] text-faint hover:text-ink"
          >
            clear
          </button>
        </div>
      )}

      {/* ── The prints ──────────────────────────────────────────── */}
      {generations.length === 0 ? (
        <div className="pt-16 text-center text-sm text-faint">
          <p>No frames match that. Try a shorter word from the prompt.</p>
          <button
            type="button"
            className="press link-underline mt-2 font-mono text-xs text-accent"
            onClick={() => {
              setSearch('')
              setFilt({ kind: 'all' })
              setTagFilter('')
            }}
          >
            clear filters
          </button>
        </div>
      ) : (
        <div ref={gridRef} className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {generations.map((gen, i) => {
            const isChecked = checked.has(gen.id)
            const model = getModel(gen.modelId)
            return (
              <div
                key={gen.id}
                className={cn(
                  'group relative rounded-lg bg-white p-[9px] pb-[7px] shadow-[0_8px_20px_-10px_rgba(60,48,24,.35)] transition-[transform,box-shadow] duration-200 hover:z-10 hover:-translate-y-[3px] hover:rotate-0 hover:shadow-[0_14px_30px_-10px_rgba(60,48,24,.5)]',
                  isChecked && 'outline outline-2 outline-accent',
                )}
                style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})` }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(gen)}
                  aria-label={`Open details: ${gen.prompt.slice(0, 80)}`}
                  className="cursor-loupe block w-full text-left focus-visible:outline-none"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[4px] bg-neutral-950">
                    {gen.imageIds[0] && (
                      <BlobImage imageId={gen.imageIds[0]} alt={gen.prompt} className="aspect-square w-full object-cover" />
                    )}
                    {gen.starred && <WinnerMark label={false} animate={false} />}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5 font-mono text-[9px] text-[#8A7C5E]">
                    <span className="truncate">
                      {model?.short ?? gen.modelId}
                      {gen.seed !== null && ` · s${gen.seed}`}
                    </span>
                    <span className="shrink-0">{formatUsd(gen.costEstimateUsd)}</span>
                  </div>
                  <p className="mt-0.5 truncate px-0.5 text-[11px] text-muted">{gen.prompt}</p>
                </button>

                {/* Select checkbox — hover/focus-revealed, sticky once checked. */}
                <button
                  type="button"
                  aria-label={isChecked ? 'Deselect frame' : 'Select frame'}
                  onClick={() => toggleChecked(gen.id)}
                  className={cn(
                    'press absolute left-2 top-2 z-20 flex size-5 items-center justify-center rounded-md border text-[11px] transition-opacity',
                    isChecked
                      ? 'border-accent bg-accent text-white opacity-100'
                      : 'border-white/60 bg-ink/30 text-white opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                  )}
                >
                  {isChecked && '✓'}
                </button>
                {gen.imageIds[0] && (
                  <button
                    type="button"
                    aria-label="View full size"
                    onClick={() => openLightbox(gen.id)}
                    className="press absolute right-2 top-2 z-20 flex size-6 items-center justify-center rounded-full bg-ink/50 text-[11px] text-white opacity-0 transition-opacity hover:bg-ink/70 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    ⤢
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && <GenerationDetail gen={selected} onClose={() => setSelected(null)} />}

      {lightboxIndex !== null && (
        <FrameLightbox frames={lightboxFrames} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Discard ${checked.size} frame${checked.size === 1 ? '' : 's'}?`}
        body="Frames are discarded from this browser. There was never a server copy."
        confirmLabel="Discard"
        destructive
        onConfirm={() => void bulkDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
