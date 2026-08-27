import { NumberField } from '@base-ui-components/react/number-field'
import { Slider } from '@base-ui-components/react/slider'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BlobImage from '../components/BlobImage'
import ErrorNotice from '../components/ErrorNotice'
import RecipeDialog from '../components/RecipeDialog'
import { WinnerMark } from '../components/WinnerMark'
import ModelMenu from '../components/studio/ModelMenu'
import { toRecipeSource } from '../components/studio/recipe-source'
import { saveGeneration } from '../lib/db'
import { AppError, toAppError } from '../lib/errors'
import { MODELS, PROVIDERS, defaultParams, getModel, type ModelDef, type ParamDef } from '../lib/models'
import { getAdapter } from '../lib/providers'
import { toast, toastError } from '../lib/toast'
import type { Generation, ParamValue } from '../lib/types'
import { buttonVariants, cn, humanizeParamValue, inputVariants, randomSeed } from '../lib/ui'
import { formatUsd, useSessionCost } from '../stores/cost'
import { useDraft } from '../stores/draft'
import { useSettings } from '../stores/settings'

/** Cap matches randomSeed(): fal can return uint64 seeds JS mangles; staying under
 *  2^31-1 keeps "re-roll same seed" exact. */
const SEED_MAX = 2_147_483_647
/** How many models the "run across all models" handoff seeds into the grid. */
const GRID_MODEL_CAP = 6
const MAX_REF_BYTES = 10 * 1024 * 1024
const DEFAULT_STRENGTH = 0.6

/** The first select param is always the size/aspect control (per-model, first in
 *  the params array). Steps + guidance are the number sliders. */
function partitionParams(model: ModelDef): {
  sizeDef?: Extract<ParamDef, { type: 'select' }>
  sliderDefs: Extract<ParamDef, { type: 'number' }>[]
  otherSelects: Extract<ParamDef, { type: 'select' }>[]
} {
  const selects = model.params.filter((p): p is Extract<ParamDef, { type: 'select' }> => p.type === 'select')
  const sliderDefs = model.params.filter((p): p is Extract<ParamDef, { type: 'number' }> => p.type === 'number')
  const [sizeDef, ...otherSelects] = selects
  return { sizeDef, sliderDefs, otherSelects }
}

/** The design's "hidden ≠ missing" line, built from whichever knobs a model manages
 *  internally. Transcribed from design/Gridloom Studio.dc.html autoNote (line 916). */
function autoNote(model: ModelDef): string | null {
  const { sliderDefs } = partitionParams(model)
  const hasSteps = sliderDefs.some((d) => d.key === 'num_inference_steps')
  const hasGuidance = sliderDefs.some((d) => d.key === 'guidance_scale')
  const hidden: string[] = []
  if (!model.capabilities.negativePrompt) hidden.push('negative prompt')
  if (!hasSteps) hidden.push('steps')
  if (!hasGuidance) hidden.push('guidance')
  if (!model.capabilities.seed) hidden.push('seed')
  if (hidden.length === 0) return null
  return `${model.name} manages ${hidden.join(', ')} internally — those knobs are hidden, not missing.`
}

/** The design's mono native select — Size, plus per-model style/quality. */
function ParamSelect({
  def,
  value,
  onChange,
}: {
  def: Extract<ParamDef, { type: 'select' }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      id={`param-${def.key}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[rgba(var(--hair),.18)] bg-paper2 px-2.5 py-2 font-mono text-xs text-ink transition-colors focus:border-accent focus:outline-none"
    >
      {def.options.map((o) => (
        <option key={o} value={o}>
          {humanizeParamValue(def.key, o)}
        </option>
      ))}
    </select>
  )
}

/** A number-slider knob (steps / guidance), styled to the design's inline row. */
function KnobSlider({
  def,
  value,
  onChange,
}: {
  def: Extract<ParamDef, { type: 'number' }>
  value: ParamValue
  onChange: (v: number) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="flex items-baseline justify-between text-xs font-semibold text-muted">
        <span id={`param-${def.key}-label`}>{def.label}</span>
        <span className="font-mono text-ink">{String(value)}</span>
      </label>
      <Slider.Root
        value={Number(value)}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0]! : v)}
        min={def.min}
        max={def.max}
        step={def.step}
        aria-labelledby={`param-${def.key}-label`}
      >
        <Slider.Control className="flex w-full touch-none select-none items-center py-1.5">
          <Slider.Track className="relative h-1 w-full select-none rounded-full bg-chip-on">
            <Slider.Indicator className="select-none rounded-full bg-accent" />
            <Slider.Thumb className="size-3.5 select-none rounded-full border border-[rgba(var(--hair),.3)] bg-accent outline-none focus-visible:ring-1 focus-visible:ring-accent" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  )
}

export default function GeneratePage() {
  const { apiKeys } = useSettings()
  const addCost = useSessionCost((s) => s.addCost)
  const navigate = useNavigate()
  const setGridDraft = useDraft((s) => s.setGridDraft)

  // Peek at a pending "use again" / recipe draft without mutating the store
  // (a consume() inside useState runs twice under StrictMode and loses the draft).
  const [draft] = useState(() => useDraft.getState().draft)
  useEffect(() => {
    useDraft.getState().consume()
  }, [])
  const draftModel = draft ? getModel(draft.modelId) : undefined

  const [modelId, setModelId] = useState(draftModel?.id ?? MODELS[0]!.id)
  const model = getModel(modelId)!
  const [prompt, setPrompt] = useState(draft?.prompt ?? '')
  const [negativePrompt, setNegativePrompt] = useState(draft?.negativePrompt ?? '')
  const [seed, setSeed] = useState<number | null>(draft?.seed ?? null)
  const [params, setParams] = useState<Record<string, ParamValue>>(() =>
    draftModel ? { ...defaultParams(draftModel), ...draft!.params } : defaultParams(MODELS[0]!),
  )
  // The reference image lives only in component state — never persisted to a draft
  // or recipe (it's a raw Blob, and img2img is per-shot).
  const [refImage, setRefImage] = useState<Blob | null>(null)
  const [refName, setRefName] = useState('')
  const [refUrl, setRefUrl] = useState<string>()
  const [strength, setStrength] = useState(DEFAULT_STRENGTH)
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [result, setResult] = useState<Generation | null>(null)
  const [starred, setStarred] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)

  const hasKey = Boolean(apiKeys[model.provider])
  const anyKey = useMemo(() => Object.values(apiKeys).some(Boolean), [apiKeys])
  const { sizeDef, sliderDefs, otherSelects } = partitionParams(model)
  const note = autoNote(model)
  const supportsRef = Boolean(model.img2img)

  // Thumbnail preview object-URL lifecycle for the reference slot.
  useEffect(() => {
    if (!refImage) {
      setRefUrl(undefined)
      return
    }
    const url = URL.createObjectURL(refImage)
    setRefUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [refImage])

  // Surface the "still working" note once a provider passes ~10s.
  useEffect(() => {
    if (!busy) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), 10_000)
    return () => clearTimeout(timer)
  }, [busy])

  function switchModel(ids: string[]) {
    const id = ids[0]
    if (!id) return
    setModelId(id)
    const m = getModel(id)!
    setParams(defaultParams(m))
    // A reference image only makes sense on an img2img model — drop it otherwise.
    if (!m.img2img) clearRef()
  }

  function clearRef() {
    setRefImage(null)
    setRefName('')
  }

  function acceptRefFile(file: File | undefined | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toastError('That is not an image. Drop a PNG, JPG, or WebP as the reference frame.')
      return
    }
    if (file.size > MAX_REF_BYTES) {
      toastError('That reference is over 10MB. Use a smaller image.')
      return
    }
    setRefImage(file)
    setRefName(file.name)
  }

  async function generate(seedOverride?: number) {
    const key = apiKeys[model.provider]
    if (!key || !prompt.trim() || busy) return
    setBusy(true)
    setError(null)
    setStarred(false)
    try {
      // Always send a client-generated seed on seed-capable models: fal can
      // return uint64 seeds that lose precision in JS, breaking "same seed" re-rolls.
      const sentSeed = seedOverride ?? (seed ?? (model.capabilities.seed ? randomSeed() : undefined))
      const useRef = supportsRef && refImage
      const adapter = getAdapter(model.provider)
      const out = await adapter.generate(
        {
          modelId: model.id,
          prompt: prompt.trim(),
          negativePrompt:
            model.capabilities.negativePrompt && negativePrompt.trim() ? negativePrompt.trim() : undefined,
          seed: sentSeed,
          params,
          ...(useRef ? { referenceImage: refImage, referenceStrength: strength } : {}),
        },
        key,
      )
      const record = await saveGeneration({
        gen: {
          source: 'generate',
          provider: model.provider,
          modelId: model.id,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          params,
          seed: sentSeed ?? out.seed,
          costEstimateUsd: model.priceUsd * out.images.length,
          durationMs: out.durationMs,
          status: 'ok',
        },
        images: out.images,
      })
      addCost(model.id, model.priceUsd * out.images.length)
      setResult(record)
    } catch (err) {
      setError(err instanceof AppError ? err : toAppError(model.provider, err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleStar() {
    if (!result) return
    const next = !starred
    setStarred(next)
    try {
      const { db } = await import('../lib/db')
      await db.generations.update(result.id, { starred: next })
    } catch {
      // The frame is already saved; a failed star flag is non-fatal.
    }
  }

  function runAcrossModels() {
    if (!result) return
    // Per the design's "run this across all models": every model whose provider
    // has a key, capped at the grid's six.
    const modelIds = MODELS.filter((m) => apiKeys[m.provider])
      .map((m) => m.id)
      .slice(0, GRID_MODEL_CAP)
    setGridDraft({ prompt: result.prompt, modelIds, seedCount: 2 })
    navigate('/grid')
  }

  if (!anyKey) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">
          The studio needs a key before anything can develop.
        </h1>
        <p className="mt-2 text-sm text-muted">Paste one in Settings. It stays in this browser.</p>
        <Link to="/settings" className={cn(buttonVariants({ intent: 'primary', size: 'lg' }), 'mt-6')}>
          Open Settings
        </Link>
      </div>
    )
  }

  const estimate = formatUsd(model.priceUsd)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── Set up the shot ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-[rgba(var(--hair),.14)] bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-xl font-semibold text-ink">Set up the shot</h1>
          <span className="font-mono text-[10px] text-faint">single image</span>
        </div>

        {!hasKey && (
          <div className="flex flex-col gap-2 rounded-[10px] border-[1.5px] border-dashed border-accent/45 bg-danger-soft p-3.5">
            <div className="text-[13px] font-semibold text-danger">
              No {PROVIDERS[model.provider].name} key in the vault yet
            </div>
            <div className="text-[12.5px] leading-relaxed text-danger/85">
              Paste a {PROVIDERS[model.provider].name} key to shoot with {model.name}, or pick a model whose provider
              you have keyed. It never leaves this browser.
            </div>
            <Link
              to="/settings"
              className="self-start rounded-full bg-accent px-3.5 py-[7px] text-[12.5px] font-semibold text-white hover:bg-accent-hover"
            >
              Add a key
            </Link>
          </div>
        )}

        {/* Prompt */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="prompt-input" className="text-xs font-semibold text-muted">
              Prompt
            </label>
            <span className="font-mono text-[10px] text-faint">⌘↵ to develop</span>
          </div>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void generate()
            }}
            rows={3}
            placeholder="what are we shooting?"
            className={cn(inputVariants(), 'resize-y leading-relaxed')}
          />
        </div>

        {/* Negative prompt — only when the model supports it */}
        {model.capabilities.negativePrompt && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="negative-prompt-input" className="text-xs font-semibold text-muted">
              Negative prompt
            </label>
            <input
              id="negative-prompt-input"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="text, watermark, extra fingers…"
              className={inputVariants()}
            />
          </div>
        )}

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Model</label>
          <ModelMenu mode="single" value={[modelId]} onChange={switchModel} />
        </div>

        {/* Reference image — only on img2img-capable models */}
        {supportsRef && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-baseline justify-between text-xs font-semibold text-muted">
              Reference image
              <span className="font-mono text-[10px] font-medium text-faint">image-to-image</span>
            </label>
            {!refImage ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  acceptRefFile(e.dataTransfer.files?.[0])
                }}
                className="cursor-pointer rounded-[9px] border-[1.5px] border-dashed border-[rgba(var(--hair),.3)] p-3.5 text-center text-[12.5px] text-faint transition-colors hover:border-accent hover:text-ink"
              >
                + drop a product shot or style frame
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => acceptRefFile(e.target.files?.[0])}
                />
              </label>
            ) : (
              <>
                <div className="flex items-center gap-2.5 rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 p-2">
                  {refUrl && (
                    <img
                      src={refUrl}
                      alt="reference"
                      className="size-[34px] shrink-0 rounded-[5px] object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">{refName}</span>
                  <button
                    type="button"
                    onClick={clearRef}
                    aria-label="Remove reference image"
                    className="press px-1.5 py-0.5 text-[13px] text-faint hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
                <label className="mt-1 flex items-baseline justify-between text-xs font-semibold text-muted">
                  Strength <span className="font-mono text-ink">{strength.toFixed(2)}</span>
                </label>
                <Slider.Root
                  value={strength}
                  onValueChange={(v) => setStrength(Array.isArray(v) ? v[0]! : v)}
                  min={0.1}
                  max={1}
                  step={0.05}
                  aria-label="Reference strength"
                >
                  <Slider.Control className="flex w-full touch-none select-none items-center py-1.5">
                    <Slider.Track className="relative h-1 w-full select-none rounded-full bg-chip-on">
                      <Slider.Indicator className="select-none rounded-full bg-accent" />
                      <Slider.Thumb className="size-3.5 select-none rounded-full border border-[rgba(var(--hair),.3)] bg-accent outline-none focus-visible:ring-1 focus-visible:ring-accent" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
                <span className="font-mono text-[10px] text-faint">
                  0 keeps the reference · 1 follows the prompt
                </span>
              </>
            )}
          </div>
        )}

        {/* Adaptive knobs: steps + guidance (sliders) · seed (seedable) · size */}
        <div className="grid grid-cols-2 gap-3">
          {sliderDefs.map((def) => (
            <KnobSlider
              key={def.key}
              def={def}
              value={params[def.key] ?? def.default}
              onChange={(v) => setParams((prev) => ({ ...prev, [def.key]: v }))}
            />
          ))}

          {model.capabilities.seed && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="seed-input" className="text-xs font-semibold text-muted">
                Seed
              </label>
              <div className="flex gap-1.5">
                <NumberField.Root
                  id="seed-input"
                  value={seed}
                  onValueChange={(v) => setSeed(v)}
                  min={0}
                  max={SEED_MAX}
                  className="min-w-0 flex-1"
                >
                  <NumberField.Group className="flex">
                    <NumberField.Input
                      placeholder="random"
                      className={cn(inputVariants({ tone: 'mono' }), 'text-xs')}
                    />
                  </NumberField.Group>
                </NumberField.Root>
                <button
                  type="button"
                  aria-label="Random seed"
                  title="random seed"
                  onClick={() => setSeed(randomSeed())}
                  className="press flex w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(var(--hair),.18)] bg-paper2 text-faint hover:border-accent hover:text-accent"
                >
                  <ArrowsClockwise weight="light" className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {sizeDef && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`param-${sizeDef.key}`} className="flex items-baseline justify-between text-xs font-semibold text-muted">
                {sizeDef.label}
                {model.maxSize && (
                  <span className="font-mono text-[10px] font-medium text-faint">max {model.maxSize}</span>
                )}
              </label>
              <ParamSelect
                def={sizeDef}
                value={String(params[sizeDef.key] ?? sizeDef.default)}
                onChange={(v) => setParams((prev) => ({ ...prev, [sizeDef.key]: v }))}
              />
            </div>
          )}
        </div>

        {/* Remaining selects (style / quality) — full width below the knob grid */}
        {otherSelects.map((def) => (
          <div key={def.key} className="flex flex-col gap-1.5">
            <label htmlFor={`param-${def.key}`} className="text-xs font-semibold text-muted">
              {def.label}
            </label>
            <ParamSelect
              def={def}
              value={String(params[def.key] ?? def.default)}
              onChange={(v) => setParams((prev) => ({ ...prev, [def.key]: v }))}
            />
          </div>
        ))}

        {/* Hidden ≠ missing note */}
        {note && (
          <div className="rounded-lg border border-dashed border-[rgba(var(--hair),.25)] bg-paper2 px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-faint">
            {note}
          </div>
        )}

        {/* Develop */}
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || !prompt.trim() || !hasKey}
          className={cn(buttonVariants({ intent: 'primary', size: 'lg' }), 'w-full')}
        >
          {busy && (
            <span
              aria-hidden
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          )}
          {busy ? 'Developing' : 'Develop ▸'}
          {!busy && <span className="font-mono text-[11px] opacity-80">≈ {estimate}</span>}
        </button>
        <div className="text-center font-mono text-[10.5px] text-faint">1 image · ≈ {estimate}</div>
      </div>

      {/* ── Result rail ─────────────────────────────────────────── */}
      <div className="flex min-h-[520px] flex-col rounded-xl border border-[rgba(var(--hair),.14)] bg-card p-[22px]">
        {error ? (
          <ErrorNotice error={error} onRetry={() => void generate()} />
        ) : busy ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="shimmer-cell aspect-square w-[340px] max-w-full rounded-xl" />
            <div className="font-mono text-xs text-faint">
              developing… <span className="text-mark">{model.name}</span>
              {seed !== null && <> · seed {seed}</>}
            </div>
            {slow && (
              <div className="animate-fade-in text-xs text-muted">
                Still in the bath. Some models take 20 seconds or more.
              </div>
            )}
          </div>
        ) : result ? (
          <div className="grid flex-1 items-start gap-6 lg:grid-cols-[1fr_250px]">
            {/* Photo mount */}
            <div className="animate-pop relative justify-self-center rounded-lg bg-white p-3 pb-2.5 shadow-[0_16px_36px_-14px_rgba(60,48,24,.4)]">
              <div className="relative w-[400px] max-w-full overflow-hidden rounded-[4px]">
                {result.imageIds.map((id) => (
                  <BlobImage key={id} imageId={id} alt={result.prompt} className="w-full" />
                ))}
                {starred && <WinnerMark label={false} />}
              </div>
              <div className="mt-2 flex justify-between px-0.5 font-mono text-[10px] text-[#8A7C5E]">
                <span>
                  {getModel(result.modelId)?.name ?? result.modelId}
                  {result.seed !== null && <> · seed {result.seed}</>}
                </span>
                <span>
                  {formatUsd(result.costEstimateUsd)} · {(result.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* This frame */}
            <div className="flex flex-col gap-2.5">
              <div className="text-[13px] font-semibold text-muted">This frame</div>
              <button
                type="button"
                onClick={() => void toggleStar()}
                aria-pressed={starred}
                className="press flex items-center gap-2 rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 px-3.5 py-2.5 text-[13px] font-semibold text-ink hover:border-accent"
              >
                {starred ? 'Marked as keeper' : 'Mark as keeper'}
              </button>
              <button
                type="button"
                onClick={() => void download(result)}
                className="press flex items-center gap-2 rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 px-3.5 py-2.5 text-[13px] font-semibold text-ink hover:border-accent"
              >
                ↓ Export PNG
              </button>
              <div className="rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 px-3.5 py-2.5 font-mono text-[10.5px] leading-loose text-faint">
                {sliderDefs.map((d) => (
                  <span key={d.key}>
                    {d.label.toLowerCase()} {String(params[d.key] ?? d.default)}
                    {' · '}
                  </span>
                ))}
                <br />
                size {String(params[sizeDef?.key ?? ''] ?? '—')}
                <br />
                auto-saved to Library ✓
              </div>
              <button
                type="button"
                onClick={() => setRecipeOpen(true)}
                className="press flex items-center gap-2 rounded-[9px] border border-[rgba(var(--hair),.16)] bg-paper2 px-3.5 py-2.5 text-[13px] font-semibold text-ink hover:border-accent"
              >
                ✎ Save as recipe
              </button>
              <button
                type="button"
                onClick={runAcrossModels}
                className="press flex items-center gap-2 rounded-[9px] bg-ink px-3.5 py-2.5 text-[13px] font-semibold text-paper2 hover:bg-accent"
              >
                ⧉ Run this across all models ▸
              </button>
            </div>
          </div>
        ) : (
          // Idle empty state
          <div className="m-0.5 flex flex-1 flex-col items-center justify-center gap-3.5 rounded-xl border-[1.5px] border-dashed border-[rgba(var(--hair),.22)] px-6 text-center">
            <svg width="52" height="52" viewBox="0 0 28 28" className="text-ink opacity-35" aria-hidden>
              <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <div className="font-display text-xl text-faint">Your image appears here.</div>
            <div className="max-w-[36ch] text-[13px] leading-relaxed text-ph">
              Describe what you need and press Develop. Every result is auto-saved to your Library with its full
              settings.
            </div>
          </div>
        )}
      </div>

      {recipeOpen && result && (
        <RecipeDialog source={toRecipeSource(result)} onClose={() => setRecipeOpen(false)} />
      )}
    </div>
  )
}

/** Pull the frame's first blob out of IndexedDB and save it as a PNG download. */
async function download(result: Generation) {
  try {
    const { db } = await import('../lib/db')
    const id = result.imageIds[0]
    if (!id) return
    const rec = await db.imageBlobs.get(id)
    if (!rec) return
    const url = URL.createObjectURL(rec.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gridloom-${result.id}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast('Could not export that frame. It is still in your Library.')
  }
}
