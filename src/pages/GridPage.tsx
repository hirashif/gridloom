import { useAutoAnimate } from '@formkit/auto-animate/react'
import { NumberField } from '@base-ui-components/react/number-field'
import { nanoid } from 'nanoid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BlobImage from '../components/BlobImage'
import GenerationDetail from '../components/GenerationDetail'
import { WinnerMark } from '../components/WinnerMark'
import CompareDialog, { type CompareFrame } from '../components/sheet/CompareDialog'
import ModelMenu from '../components/studio/ModelMenu'
import { db, saveGeneration } from '../lib/db'
import { AppError, toAppError } from '../lib/errors'
import { MODELS, PROVIDERS, defaultParams, type ModelDef } from '../lib/models'
import { getAdapter } from '../lib/providers'
import { exportComposite } from '../lib/grid-export'
import { buttonVariants, cn, inputVariants, randomSeed } from '../lib/ui'
import type { Recipe } from '../lib/types'
import type { Generation } from '../lib/types'
import { formatUsd, useSessionCost } from '../stores/cost'
import { useDraft } from '../stores/draft'
import { useSettings } from '../stores/settings'
import { toast, toastError } from '../lib/toast'

const SAMPLE_PROMPT = 'a ceramic mug of coffee on a wooden desk, morning light, product photography'
const MAX_SEEDS = 4
const MAX_MODELS = 6
const CONCURRENCY = 4

// Pending-cell caption. After a minute in the tray the plain "developing…"
// earns a calmer explanation — Qwen cold starts on fal can run ~5 minutes,
// and a shimmering cell with no words starts to read as dead.
function DevelopingNote({ tag }: { tag: string }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 60_000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="ml-0.5 mt-1 font-mono text-[8.5px] text-sheet-faint">
      {tag} · {slow ? 'still in the tray · slow models can take ~5 min' : 'developing…'}
    </div>
  )
}

type CellStatus = 'queued' | 'running' | 'done' | 'error'

interface Cell {
  status: CellStatus
  genId?: string
  imageId?: string
  starred?: boolean
  error?: AppError
  durationMs?: number
}

interface RunResult {
  ok: boolean
  error?: AppError
}

const cellKey = (modelId: string, seed: number, runId: string) => `${modelId}:${seed}:${runId}`
/** The design's frame stamp: column-only, "s41" for the first seed, "s42" for the next… */
const frameTag = (colIdx: number) => `s${41 + colIdx}`

/** Distinct seeds so two columns of one run can never share a cell. */
function randomSeeds(n: number): number[] {
  const out = new Set<number>()
  while (out.size < n) out.add(randomSeed() % 1_000_000)
  return [...out]
}

/** A recipe's slug of the prompt for the sheet's running head. */
function slug(prompt: string, max = 42): string {
  const p = prompt.trim()
  return p.length > max ? `${p.slice(0, max).trimEnd()}…` : p
}

export default function GridPage() {
  const { apiKeys } = useSettings()
  const addCost = useSessionCost((s) => s.addCost)
  const gridModels = useMemo(() => MODELS, [])

  // A "run this across all models" handoff from Generate, consumed once. It carries
  // the prompt, the models to pre-select (validated + capped), and the seed count.
  // Falls back to the older prompt-only "send to grid" handoff.
  const [handoff] = useState(() => {
    const gd = useDraft.getState().consumeGridDraft?.()
    if (gd) {
      const validIds = gd.modelIds.filter((id) => gridModels.some((m) => m.id === id)).slice(0, MAX_MODELS)
      return {
        prompt: gd.prompt,
        models: validIds.length > 0 ? validIds : [gridModels[0]!.id, gridModels[1]!.id],
        seedCount: Math.min(Math.max(1, gd.seedCount), MAX_SEEDS),
      }
    }
    return { prompt: useDraft.getState().consumeGridPrompt() ?? '', models: null as string[] | null, seedCount: 2 }
  })

  const [selected, setSelected] = useState<string[]>(handoff.models ?? [gridModels[0]!.id, gridModels[1]!.id])
  const [seedCount, setSeedCount] = useState(handoff.seedCount)
  const [seeds] = useState<number[]>(() => randomSeeds(MAX_SEEDS))
  const [prompt, setPrompt] = useState(handoff.prompt)
  const [detail, setDetail] = useState<Generation | null>(null)
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [runId, setRunId] = useState<string | null>(null)
  // The sheet renders from this snapshot of the run, not the live pickers,
  // so changing models or seeds afterwards never corrupts finished frames.
  const [runShape, setRunShape] = useState<{ models: ModelDef[]; seeds: number[]; sheetNo: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [credit, setCredit] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePicks, setComparePicks] = useState<CompareFrame[]>([])
  const [recipeName, setRecipeName] = useState('')
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [cellsRef] = useAutoAnimate<HTMLDivElement>()

  // Run-generation counter: a re-run bumps it, so a stale retry promise
  // finishing later can never resurrect a cell after setCells(fresh).
  const sessionRef = useRef(0)
  const stopRef = useRef(false)
  const inflightRef = useRef<Set<string>>(new Set())
  const runPromptRef = useRef('')
  const sheetCountRef = useRef(0)

  const activeSeeds = seeds.slice(0, Math.min(seedCount, MAX_SEEDS))
  const selectedModels = gridModels.filter((m) => selected.includes(m.id) && apiKeys[m.provider])
  const hasKey = Object.values(apiKeys).some(Boolean)
  const totalEst = selectedModels.reduce((sum, m) => sum + m.priceUsd, 0) * activeSeeds.length
  const doneCount = Object.values(cells).filter((c) => c.status === 'done').length
  const hasResults = doneCount > 0
  const atModelCap = selected.length >= MAX_MODELS

  // "this sheet" total — completed frames only (SPEC: never bill for what didn't develop).
  const sheetCost = runShape
    ? runShape.models.reduce(
        (sum, m) =>
          sum +
          runShape.seeds.reduce((rowSum, seed) => {
            const c = cells[cellKey(m.id, seed, runId ?? '')]
            return rowSum + (c?.status === 'done' ? m.priceUsd : 0)
          }, 0),
        0,
      )
    : 0

  function setCell(k: string, session: number, patch: Partial<Cell>) {
    if (sessionRef.current !== session) return
    setCells((prev) => ({ ...prev, [k]: { ...(prev[k] ?? { status: 'queued' }), ...patch } }))
  }

  async function runOne(
    model: ModelDef,
    seed: number,
    gridRunId: string,
    promptText: string,
    session: number,
  ): Promise<RunResult> {
    const key = apiKeys[model.provider]
    if (!key) return { ok: false }
    const k = cellKey(model.id, seed, gridRunId)
    // Per-cell in-flight guard: a second retry click while this cell runs is a no-op.
    if (inflightRef.current.has(k)) return { ok: false }
    inflightRef.current.add(k)
    setCell(k, session, { status: 'running', error: undefined })
    try {
      const adapter = getAdapter(model.provider)
      const out = await adapter.generate(
        {
          modelId: model.id,
          prompt: promptText,
          seed: model.capabilities.seed ? seed : undefined,
          params: defaultParams(model),
        },
        key,
      )
      // The frame exists and was paid for: it lands in the library even if the
      // sheet on screen has since been replaced by a newer run.
      const record = await saveGeneration({
        gen: {
          source: 'grid',
          gridRunId,
          provider: model.provider,
          modelId: model.id,
          prompt: promptText,
          params: defaultParams(model),
          seed: model.capabilities.seed ? (out.seed ?? seed) : out.seed,
          costEstimateUsd: model.priceUsd * out.images.length,
          durationMs: out.durationMs,
          status: 'ok',
        },
        images: out.images,
      })
      addCost(model.id, model.priceUsd * out.images.length)
      setCell(k, session, {
        status: 'done',
        genId: record.id,
        imageId: record.imageIds[0],
        durationMs: out.durationMs,
      })
      return { ok: true }
    } catch (err) {
      const appErr = err instanceof AppError ? err : toAppError(model.provider, err)
      setCell(k, session, { status: 'error', error: appErr })
      return { ok: false, error: appErr }
    } finally {
      inflightRef.current.delete(k)
    }
  }

  async function runGrid() {
    const promptText = prompt.trim()
    if (!promptText || !hasKey || running || selectedModels.length === 0) return

    const sheetNo = sheetCountRef.current + 1
    sheetCountRef.current = sheetNo

    setRunning(true)
    setStopping(false)
    setCompareMode(false)
    setComparePicks([])
    stopRef.current = false
    const session = ++sessionRef.current
    const gridRunId = nanoid()
    setRunId(gridRunId)
    setRunShape({ models: selectedModels, seeds: activeSeeds, sheetNo })
    runPromptRef.current = promptText

    const entries = selectedModels.flatMap((model) =>
      activeSeeds.map((seed) => ({
        model,
        seed,
        key: cellKey(model.id, seed, gridRunId),
      })),
    )
    setCells(Object.fromEntries(entries.map((e) => [e.key, { status: 'queued' as CellStatus }])))

    const results: { code: string; provider: string; result: RunResult }[] = []
    const queue = [...entries]
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0 && !stopRef.current && sessionRef.current === session) {
          const entry = queue.shift()
          if (!entry) break
          const result = await runOne(entry.model, entry.seed, gridRunId, promptText, session)
          results.push({
            code: `${entry.model.short} ${frameTag(activeSeeds.indexOf(entry.seed))}`,
            provider: PROVIDERS[entry.model.provider].name,
            result,
          })
        }
      }),
    )
    if (sessionRef.current !== session) return
    setRunning(false)
    setStopping(false)
    if (stopRef.current) {
      // Finished frames are kept; frames that never started leave the sheet.
      setCells((prev) => Object.fromEntries(Object.entries(prev).filter(([, c]) => c.status !== 'queued')))
    }

    const failed = results.filter((r) => !r.result.ok)
    const succeeded = results.filter((r) => r.result.ok)
    if (failed.length === 0) return
    const rateLimited = failed.find((r) => r.result.error?.code === 'rate_limited')
    if (succeeded.length === 0) {
      const provider = rateLimited?.provider ?? failed[0]!.provider
      if (rateLimited) {
        toastError(`${provider} is rate limiting this key. Give it a minute and run the sheet again.`)
      } else {
        toastError(`Nothing developed. ${provider} said no on every frame. Check the key in Settings, then try one frame first.`)
      }
    } else if (failed.length === 1) {
      toastError(`Frame ${failed[0]!.code} didn't develop. The rest of the sheet is fine.`)
    } else {
      toastError(`${failed.length} frames didn't develop. The rest of the sheet is fine.`)
    }
  }

  function stopRun() {
    stopRef.current = true
    setStopping(true)
  }

  async function retryCell(model: ModelDef, seed: number) {
    // Per-cell retry re-runs one frame only.
    if (!runId || running) return
    await runOne(model, seed, runId, runPromptRef.current || prompt.trim(), sessionRef.current)
  }

  async function toggleStar(k: string) {
    const cell = cells[k]
    if (!cell?.genId) return
    const next = !cell.starred
    await db.generations.update(cell.genId, { starred: next })
    setCell(k, sessionRef.current, { starred: next })
  }

  function togglePick(model: ModelDef, seed: number, cell: Cell) {
    if (!cell.imageId) return
    setComparePicks((prev) => {
      const existing = prev.find((p) => p.imageId === cell.imageId)
      if (existing) return prev.filter((p) => p !== existing)
      if (prev.length >= 2) return prev
      return [...prev, { imageId: cell.imageId!, modelId: model.id, seed, costUsd: model.priceUsd }]
    })
  }

  async function doExport() {
    if (!runShape || !runId) return
    setExporting(true)
    const frames = runShape.models.flatMap((m) =>
      runShape.seeds.map((seed) => ({
        modelId: m.id,
        seed,
        imageId: cells[cellKey(m.id, seed, runId)]?.imageId,
        starred: cells[cellKey(m.id, seed, runId)]?.starred,
      })),
    )
    try {
      await exportComposite({
        prompt: runPromptRef.current || prompt.trim(),
        modelIds: runShape.models.map((m) => m.id),
        seeds: runShape.seeds,
        cells: frames,
        credit,
      })
      const n = frames.filter((f) => f.imageId).length
      toast(`Sheet exported. ${n} frame${n === 1 ? '' : 's'}, one image.`)
    } catch (err) {
      console.error('export failed', err)
      toastError('The sheet did not export. Try again in a moment.')
    } finally {
      setExporting(false)
    }
  }

  async function saveSheetRecipe() {
    const name = recipeName.trim()
    const models = runShape?.models ?? selectedModels
    if (!name || savingRecipe || models.length === 0) return
    setSavingRecipe(true)
    const now = Date.now()
    const first = models[0]!
    const recipe: Recipe = {
      id: nanoid(),
      name,
      createdAt: now,
      updatedAt: now,
      promptTemplate: (runPromptRef.current || prompt).trim(),
      provider: first.provider,
      // Legacy single-model field keeps the un-ported RecipesPage working.
      modelId: first.id,
      modelIds: models.map((m) => m.id),
      seedCount: runShape?.seeds.length ?? activeSeeds.length,
      params: defaultParams(first),
      seedPolicy: { mode: 'random' },
    }
    try {
      await db.recipes.add(recipe)
      toast('Recipe saved. Same sheet, one click, next time.')
      setRecipeName('')
    } catch (err) {
      console.error('recipe save failed', err)
      toastError('The recipe did not save. Try again in a moment.')
    } finally {
      setSavingRecipe(false)
    }
  }

  if (!hasKey) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">The comparison grid needs a provider key</h1>
        <p className="mt-2 text-sm text-muted">
          One prompt, fanned across every model and seed you pick, side by side. Keys stay in this browser.
        </p>
        <Link to="/settings" className={cn(buttonVariants({ intent: 'primary', size: 'lg' }), 'mt-6')}>
          Connect a provider
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Control bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[rgba(var(--hair),.14)] bg-card px-[18px] py-4">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              void runGrid()
            }
          }}
          placeholder="one prompt for the whole sheet"
          aria-label="Prompt for the whole sheet"
          className={cn(inputVariants(), 'min-w-[260px] flex-[2] rounded-full px-[18px] py-[11px] text-sm')}
        />

        <ModelMenu
          mode="multi"
          value={selected}
          onChange={setSelected}
          disabled={running}
          disabledUnchecked={atModelCap}
        />

        <div className="flex items-center gap-2 rounded-full border border-[rgba(var(--hair),.18)] bg-paper2 px-[7px] py-[5px]">
          <NumberField.Root
            value={activeSeeds.length}
            onValueChange={(value) => {
              if (value !== null) setSeedCount(Math.min(Math.max(1, value), MAX_SEEDS))
            }}
            min={1}
            max={MAX_SEEDS}
            disabled={running}
          >
            <NumberField.Group className="flex items-center gap-2">
              <NumberField.Decrement
                aria-label="Fewer seeds"
                className="press flex size-6 items-center justify-center rounded-full border border-[rgba(var(--hair),.2)] bg-chip text-muted hover:border-accent hover:text-accent disabled:opacity-40"
              >
                −
              </NumberField.Decrement>
              <span className="font-mono text-xs font-semibold text-ink">
                <NumberField.Input
                  aria-label="Seed count"
                  className="w-4 bg-transparent text-center font-mono text-xs font-semibold focus:outline-none"
                />
                {activeSeeds.length === 1 ? ' seed' : ' seeds'}
              </span>
              <NumberField.Increment
                aria-label="More seeds"
                className="press flex size-6 items-center justify-center rounded-full border border-[rgba(var(--hair),.2)] bg-chip text-muted hover:border-accent hover:text-accent disabled:opacity-40"
              >
                +
              </NumberField.Increment>
            </NumberField.Group>
          </NumberField.Root>
        </div>

        {running ? (
          <button
            type="button"
            onClick={stopRun}
            disabled={stopping}
            className={cn(buttonVariants({ intent: 'secondary', size: 'lg' }), 'ml-auto')}
          >
            {stopping ? 'Stopping' : 'Stop the run'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void runGrid()}
            disabled={!prompt.trim() || selectedModels.length === 0}
            className={cn(
              'press ml-auto inline-flex items-center gap-2.5 rounded-full bg-accent px-[22px] py-[11px] text-sm font-semibold text-white shadow-[0_2px_0_rgba(36,31,24,.25)] hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            Run the sheet
            <span className="rounded-[5px] bg-white/20 px-[7px] py-0.5 font-mono text-[11px]">
              ≈ {formatUsd(totalEst)}
            </span>
          </button>
        )}
      </div>

      {/* ── The sheet ───────────────────────────────────────────── */}
      {!runShape || !runId ? (
        <div className="sheet-surface rounded-2xl border border-[rgba(var(--hair),.16)] px-[22px] py-16 text-center">
          <p className="font-display text-xl text-sheet-faint">A fresh sheet loads here.</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-sm text-sheet-muted">
            One prompt down the side, models and seeds across the top. Pick both and run the sheet — it develops frame
            by frame as each one comes back.
          </p>
          {!prompt && (
            <button
              type="button"
              onClick={() => setPrompt(SAMPLE_PROMPT)}
              className="press mt-4 rounded-full border border-sheet-line px-3 py-1 font-mono text-[11px] text-sheet-muted hover:border-accent hover:text-accent"
            >
              use a sample prompt
            </button>
          )}
        </div>
      ) : (
        <div className="sheet-surface rounded-2xl border border-[rgba(var(--hair),.16)] px-[22px] pb-4 pt-5">
          {/* Sheet header */}
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sheet-muted">
              CONTACT SHEET {String(runShape.sheetNo).padStart(2, '0')} · “{slug(runPromptRef.current || prompt)}”
            </span>
            <div className="flex items-center gap-2.5">
              <span className="-rotate-2 font-hand text-[19px] text-sheet-ink">
                this sheet: {formatUsd(sheetCost)}
              </span>
              <SheetRecipeButton
                name={recipeName}
                onName={setRecipeName}
                onSave={() => void saveSheetRecipe()}
                saving={savingRecipe}
              />
              <button
                type="button"
                onClick={() => void doExport()}
                disabled={exporting || !hasResults}
                className="press rounded-md bg-sheet-btn px-[11px] py-1.5 font-mono text-[10.5px] font-semibold text-sheet-btn-ink hover:opacity-85 disabled:opacity-40"
              >
                {exporting ? 'EXPORTING…' : 'EXPORT BOARD ↓'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div ref={cellsRef} className="min-w-[560px] space-y-2.5">
              {runShape.models.map((model) => (
                <div
                  key={model.id}
                  className="grid items-stretch gap-2.5"
                  style={{ gridTemplateColumns: `96px repeat(${runShape.seeds.length}, minmax(0,1fr))` }}
                >
                  {/* Row rail: mono short + cost-each */}
                  <div className="flex flex-col items-end justify-center pr-1">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-sheet-muted">{model.short}</span>
                    <span className="font-mono text-[8.5px] text-sheet-faint">
                      {formatUsd(model.priceUsd)}/img{!model.capabilities.seed && ' · no seed'}
                    </span>
                  </div>

                  {runShape.seeds.map((seed, colIdx) => {
                    const k = cellKey(model.id, seed, runId)
                    const cell = cells[k]
                    const tag = frameTag(colIdx)
                    const picked = comparePicks.some((p) => p.imageId && cell && p.imageId === cell.imageId)

                    if (!cell) {
                      // The run was stopped before this frame started.
                      return (
                        <div key={k}>
                          <div className="aspect-square rounded-md border border-dashed border-sheet-dash" />
                          <div className="ml-0.5 mt-1 font-mono text-[8.5px] text-sheet-faint">{tag}</div>
                        </div>
                      )
                    }

                    if (cell.status === 'queued' || cell.status === 'running') {
                      return (
                        <div key={k}>
                          <div className="shimmer-cell aspect-square rounded-md border border-dashed border-sheet-dash" />
                          <DevelopingNote tag={tag} />
                        </div>
                      )
                    }

                    if (cell.status === 'error') {
                      return (
                        <div key={k}>
                          <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-mark/55 bg-mark/[.08] p-2 text-center">
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-mark">
                              {cell.error?.message ?? "didn't develop"}
                            </span>
                            {cell.error?.hint && (
                              <span className="text-[9.5px] leading-tight text-sheet-muted">{cell.error.hint}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => void retryCell(model, seed)}
                              disabled={running}
                              className="press rounded-[5px] bg-sheet-btn px-[9px] py-1 font-mono text-[9px] font-semibold text-sheet-btn-ink hover:opacity-85 disabled:opacity-40"
                            >
                              retry ↻
                            </button>
                          </div>
                          <div className="ml-0.5 mt-1 font-mono text-[8.5px] text-sheet-faint">{tag}</div>
                        </div>
                      )
                    }

                    // status === 'done'
                    return (
                      <div key={k} className="group relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (compareMode) togglePick(model, seed, cell)
                            else void toggleStar(k)
                          }}
                          aria-pressed={cell.starred}
                          aria-label={
                            compareMode
                              ? picked
                                ? `Unpick frame ${tag}`
                                : `Pick frame ${tag} to compare`
                              : cell.starred
                                ? `Unmark frame ${tag}`
                                : `Mark frame ${tag} with your pen`
                          }
                          className={cn(
                            'press block w-full rounded-md bg-white p-1.5 shadow-[0_6px_16px_-8px_rgba(60,48,24,.5)]',
                            compareMode ? 'cursor-pointer' : 'cursor-loupe',
                            picked ? 'outline outline-2 outline-accent' : 'outline outline-1 outline-transparent',
                          )}
                        >
                          <div className="animate-pop overflow-hidden rounded-[3px]">
                            {cell.imageId && (
                              <BlobImage
                                imageId={cell.imageId}
                                alt={`${model.name} seed ${seed}`}
                                className="aspect-square w-full object-cover"
                              />
                            )}
                          </div>
                        </button>

                        {cell.starred && !compareMode && <WinnerMark label={false} />}
                        {compareMode && picked && (
                          <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-white">
                            ✓
                          </span>
                        )}

                        {/* Loupe/detail on hover — inspecting the frame is distinct from marking it */}
                        {!compareMode && cell.genId && (
                          <button
                            type="button"
                            onClick={() => void db.generations.get(cell.genId!).then((g) => g && setDetail(g))}
                            aria-label={`Open frame ${tag} details`}
                            className="press absolute right-2 top-2 z-20 flex size-6 items-center justify-center rounded-full bg-ink/60 text-[11px] text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            ⤢
                          </button>
                        )}

                        <div className="ml-0.5 mt-1 flex items-center justify-between gap-1 font-mono text-[8.5px] text-sheet-muted">
                          <span>{tag}</span>
                          <span className="flex items-center gap-1.5">
                            <span>{formatUsd(model.priceUsd)}</span>
                            {cell.durationMs !== undefined && (
                              <span>{(cell.durationMs / 1000).toFixed(1)}s</span>
                            )}
                            <button
                              type="button"
                              onClick={() => void retryCell(model, seed)}
                              disabled={running}
                              aria-label={`Re-run frame ${tag}`}
                              className="press text-sheet-muted hover:text-accent disabled:opacity-40"
                            >
                              ↻
                            </button>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Sheet footer */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-0.5 font-mono text-[9.5px] text-sheet-faint">
            <span>click a frame to mark it with your pen · ↻ re-runs one cell only</span>
            <span>
              {running
                ? `developing ${doneCount} of ${runShape.models.length * runShape.seeds.length}`
                : `${doneCount} frame${doneCount === 1 ? '' : 's'} · saved to library`}
            </span>
          </div>
        </div>
      )}

      {/* Compare-mode controls (money shot: A/B two frames from the sheet) */}
      {hasResults && !running && doneCount >= 2 && (
        <div className="flex animate-fade-up flex-wrap items-center gap-3 px-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setCompareMode((v) => !v)
              setComparePicks([])
            }}
            aria-pressed={compareMode}
            className={buttonVariants({ intent: compareMode ? 'primary' : 'secondary', size: 'sm' })}
          >
            {compareMode ? 'Exit compare' : 'Compare two frames'}
          </button>
          {compareMode && (
            <span className="font-mono text-xs text-faint">
              {comparePicks.length === 0 ? 'pick two frames' : `${comparePicks.length} of 2 picked`}
            </span>
          )}
          <label className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-muted">
            <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="accent-accent" />
            “made with gridloom.app”
          </label>
        </div>
      )}

      {detail && <GenerationDetail gen={detail} onClose={() => setDetail(null)} />}

      {comparePicks.length === 2 && (
        <CompareDialog a={comparePicks[0]!} b={comparePicks[1]!} onClose={() => setComparePicks([])} />
      )}
    </div>
  )
}

/** SAVE RECIPE — a tiny popover form on the sheet header (name → write). */
function SheetRecipeButton({
  name,
  onName,
  onSave,
  saving,
}: {
  name: string
  onName: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'press rounded-md border border-sheet-line px-2.5 py-1.5 font-mono text-[10.5px] font-semibold',
          open ? 'border-accent text-accent' : 'text-sheet-muted hover:border-accent hover:text-accent',
        )}
      >
        SAVE RECIPE
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-xl border border-[rgba(var(--hair),.25)] bg-card p-3 shadow-[0_24px_48px_-16px_rgba(30,22,10,.35)] animate-rise">
          <label htmlFor="sheet-recipe-name" className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
            Recipe name
          </label>
          <input
            id="sheet-recipe-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                onSave()
                setOpen(false)
              }
            }}
            autoFocus
            placeholder="e.g. Product hero, warm"
            className={cn(inputVariants(), 'mt-1.5 text-sm')}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonVariants({ intent: 'secondary', size: 'sm' })}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave()
                setOpen(false)
              }}
              disabled={!name.trim() || saving}
              className={buttonVariants({ intent: 'primary', size: 'sm' })}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
