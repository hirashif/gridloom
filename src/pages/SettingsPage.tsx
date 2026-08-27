import { useEffect, useState } from 'react'
import { PEN_VARIANTS } from '../components/WinnerMark'
import { db } from '../lib/db'
import { AppError } from '../lib/errors'
import { MODELS, PROVIDERS } from '../lib/models'
import { toast } from '../lib/toast'
import { testProviderKey } from '../lib/providers/keytest'
import type { ProviderId } from '../lib/types'
import { cn, inputVariants } from '../lib/ui'
import { exportZip } from '../lib/export-zip'
import { maskKey, useSettings } from '../stores/settings'
import { usePen } from '../stores/pen'
import { useTheme } from '../stores/theme'

type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'ok' } | { status: 'error'; message: string }

/** A card shell — the design's settings stack is a column of these. */
function Card({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[rgba(var(--hair),.14)] bg-card p-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {note}
      </div>
      {children}
    </div>
  )
}

/** A pill toggle group (seed policy, export format, appearance). */
function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'press flex-1 rounded-lg border px-1 py-2 text-center text-xs font-semibold transition-colors',
            value === o.id
              ? 'border-[rgba(var(--hair),.2)] bg-chip-on text-ink'
              : 'border-[rgba(var(--hair),.14)] bg-paper2 text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** ── Key vault ──────────────────────────────────────────────────
 *  A row per keyed provider (name · masked key · status · test/remove),
 *  then an add-key row for the providers that are still empty. All the
 *  test/save/remove logic is unchanged; only the shell is the design's. */

// "Add & test" saves the key (mounting a fresh KeyRow) and then tests it
// asynchronously; this bus carries that result to the row so it lands as
// valid/invalid instead of stranding on "untested".
const keyTestBus = new EventTarget()
type KeyTested = { provider: ProviderId; state: TestState }

function KeyRow({ provider }: { provider: ProviderId }) {
  const { apiKeys, removeApiKey } = useSettings()
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  useEffect(() => {
    const onTested = (e: Event) => {
      const detail = (e as CustomEvent<KeyTested>).detail
      if (detail.provider === provider) setTest(detail.state)
    }
    keyTestBus.addEventListener('tested', onTested)
    return () => keyTestBus.removeEventListener('tested', onTested)
  }, [provider])
  const info = PROVIDERS[provider]
  const key = apiKeys[provider]!

  async function runTest() {
    setTest({ status: 'testing' })
    try {
      await testProviderKey(provider, key)
      setTest({ status: 'ok' })
    } catch (err) {
      setTest({ status: 'error', message: err instanceof AppError ? err.message : 'Test failed.' })
    }
  }

  const status =
    test.status === 'testing'
      ? { word: 'testing…', color: 'text-warn' }
      : test.status === 'error'
        ? { word: 'invalid', color: 'text-danger' }
        : test.status === 'ok'
          ? { word: 'valid', color: 'text-ok' }
          : { word: 'untested', color: 'text-faint' }

  return (
    <div className="rounded-[10px] border border-[rgba(var(--hair),.12)] bg-paper2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <span className="w-[92px] shrink-0 text-[13.5px] font-semibold text-ink">{info.name}</span>
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{maskKey(key)}</code>
        <span className={cn('shrink-0 font-mono text-[11px] font-semibold', status.color)}>{status.word}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void runTest()}
            disabled={test.status === 'testing'}
            className="press rounded-full border border-[rgba(var(--hair),.2)] px-3 py-1 text-xs font-semibold text-muted hover:border-ink hover:text-ink disabled:opacity-40"
          >
            test
          </button>
          <button
            type="button"
            onClick={() => {
              removeApiKey(provider)
              toast('Key gone. Nothing to wipe on our side, there is no our side.')
            }}
            className="press rounded-full border border-danger/25 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
          >
            remove
          </button>
        </div>
      </div>
      {test.status === 'error' && <p className="mt-2 text-xs text-danger">{test.message}</p>}
    </div>
  )
}

function AddKeyRow({ available }: { available: ProviderId[] }) {
  const { setApiKey } = useSettings()
  const [prov, setProv] = useState<ProviderId>(available[0]!)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  // Keep the selected provider valid as keys get added elsewhere.
  useEffect(() => {
    if (!available.includes(prov) && available[0]) setProv(available[0])
  }, [available, prov])

  async function addAndTest() {
    const key = draft.trim()
    if (!key || busy) return
    setBusy(true)
    setApiKey(prov, key)
    setDraft('')
    toast('Key saved to this browser. It never leaves.')
    keyTestBus.dispatchEvent(new CustomEvent<KeyTested>('tested', { detail: { provider: prov, state: { status: 'testing' } } }))
    try {
      await testProviderKey(prov, key)
      keyTestBus.dispatchEvent(new CustomEvent<KeyTested>('tested', { detail: { provider: prov, state: { status: 'ok' } } }))
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Saved, but the test call failed.'
      keyTestBus.dispatchEvent(new CustomEvent<KeyTested>('tested', { detail: { provider: prov, state: { status: 'error', message } } }))
      toast(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <label htmlFor="add-key-provider" className="sr-only">
        Provider
      </label>
      <select
        id="add-key-provider"
        value={prov}
        onChange={(e) => setProv(e.target.value as ProviderId)}
        className="rounded-[9px] border border-[rgba(var(--hair),.18)] bg-paper2 px-2.5 py-2 text-[13px] text-ink focus:border-accent focus:outline-none"
      >
        {available.map((p) => (
          <option key={p} value={p}>
            {PROVIDERS[p].name}
          </option>
        ))}
      </select>
      <input
        value={draft}
        type="password"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void addAndTest()}
        placeholder={PROVIDERS[prov].keyPlaceholder}
        aria-label={`${PROVIDERS[prov].name} API key`}
        className={cn(inputVariants({ tone: 'mono' }), 'min-w-[180px] flex-1 rounded-[9px] text-xs')}
      />
      <button
        type="button"
        onClick={() => void addAndTest()}
        disabled={!draft.trim() || busy}
        className="press shrink-0 rounded-[9px] bg-ink px-[18px] py-2 text-[13px] font-semibold text-paper2 hover:bg-accent disabled:opacity-40"
      >
        {busy ? 'Testing…' : 'Add & test'}
      </button>
    </div>
  )
}

/** ── Your pen ───────────────────────────────────────────────────
 *  Driven entirely by PEN_VARIANTS — each option renders its own Preview. */
function PenPicker() {
  const { pen, setPen } = usePen()
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      {PEN_VARIANTS.map(({ id, label, Preview }) => {
        const active = pen === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setPen(id)}
            aria-pressed={active}
            className={cn(
              'press flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13px] font-semibold transition-colors',
              active
                ? 'border-[rgba(var(--hair),.2)] bg-chip-on text-ink ring-1 ring-[rgba(var(--hair),.14)]'
                : 'border-[rgba(var(--hair),.14)] bg-paper2 text-muted hover:border-accent hover:text-ink',
            )}
          >
            <Preview />
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** ── Your data ──────────────────────────────────────────────────
 *  Export everything (reuses LibraryPage's exportZip), a storage meter, and an
 *  inline two-step wipe. No browser confirm(). */
function DataCard() {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [usedMb, setUsedMb] = useState<number | null>(null)
  const [frames, setFrames] = useState<number | null>(null)

  useEffect(() => {
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined) setUsedMb(est.usage / 1024 / 1024)
      })
    }
    void db.generations.count().then(setFrames)
  }, [])

  async function exportEverything() {
    if (busy) return
    setBusy(true)
    try {
      const gens = await db.generations.orderBy('createdAt').reverse().toArray()
      if (gens.length === 0) {
        toast('Nothing to export yet. Shoot a frame first.')
        return
      }
      await exportZip(gens)
      toast('Everything exported. Prompts, seeds, params, cost — keys excluded.')
    } finally {
      setBusy(false)
    }
  }

  async function wipe() {
    await Promise.all([db.generations.clear(), db.imageBlobs.clear(), db.recipes.clear(), db.tags.clear()])
    setConfirming(false)
    setFrames(0)
    toast('Studio wiped. Every frame and recipe gone from this browser.')
  }

  const storageLabel =
    usedMb !== null
      ? `${usedMb < 100 ? usedMb.toFixed(1) : Math.round(usedMb)} MB${frames !== null ? ` · ${frames} frame${frames === 1 ? '' : 's'}` : ''}`
      : frames !== null
        ? `${frames} frame${frames === 1 ? '' : 's'}`
        : 'storage estimate unavailable'

  return (
    <Card title="Your data">
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void exportEverything()}
          disabled={busy}
          className="press flex-1 rounded-[9px] border border-[rgba(var(--hair),.18)] bg-paper2 px-2 py-2.5 text-center text-[13px] font-semibold text-ink hover:border-ink disabled:opacity-40"
        >
          {busy ? 'Exporting…' : 'Export everything'}
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="press flex-1 rounded-[9px] border border-danger/30 px-2 py-2.5 text-center text-[13px] font-semibold text-danger hover:bg-danger-soft"
          >
            Wipe the studio
          </button>
        ) : (
          <div className="flex flex-[1.6] items-center gap-2">
            <span className="min-w-0 flex-1 font-mono text-[11px] leading-tight text-muted">
              sure? this deletes every frame + recipe
            </span>
            <button
              type="button"
              onClick={() => void wipe()}
              className="press animate-pop shrink-0 rounded-[9px] bg-danger px-3 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
            >
              yes, wipe
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="press shrink-0 font-mono text-[11px] text-faint hover:text-ink"
            >
              keep
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 border-t border-dashed border-[rgba(var(--hair),.2)] pt-2.5 font-mono text-[10.5px] text-faint">
        {storageLabel}
      </div>
      <p className="mt-2 text-xs text-faint">
        Backups are a zip of images plus a JSON of metadata, keys excluded. Restore from Settings on any machine.
      </p>
    </Card>
  )
}

export default function SettingsPage() {
  const providers = Object.keys(PROVIDERS) as ProviderId[]
  const { apiKeys } = useSettings()
  const { defaults, setDefault } = useSettings()
  const { theme, toggle } = useTheme()

  const keyed = providers.filter((p) => apiKeys[p])
  const unkeyed = providers.filter((p) => !apiKeys[p])

  // Registry counts from the static model list — honest, no fake sync time.
  const providerCounts = providers
    .map((p) => ({ id: p, name: PROVIDERS[p].name, count: MODELS.filter((m) => m.provider === p).length }))
    .filter((c) => c.count > 0)

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-[18px]">
      {/* ── Key vault ──────────────────────────────────────────── */}
      <Card
        title="Key vault"
        note={<span className="font-mono text-[10.5px] text-ok">stored in localStorage · never sent to us</span>}
      >
        <div className="mt-4 flex flex-col gap-2.5">
          {keyed.map((p) => (
            <KeyRow key={p} provider={p} />
          ))}
          {keyed.length === 0 && (
            <div className="rounded-[10px] border-[1.5px] border-dashed border-[rgba(var(--hair),.25)] px-5 py-5 text-center text-[13px] text-faint">
              The vault is empty. Paste your first key below — takes 20 seconds.
            </div>
          )}
          {unkeyed.length > 0 && <AddKeyRow available={unkeyed} />}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">Your keys never leave this browser.</span> They sit in local
          storage on this machine and go only to the provider you are calling, straight from your browser. There is no
          Gridloom server. Open devtools and watch the network tab if you want to verify.
        </p>
      </Card>

      {/* ── Model registry (static) ────────────────────────────── */}
      <Card
        title="Model registry"
        note={
          <span className="font-mono text-[10.5px] text-faint">
            {MODELS.length} models · {providerCounts.length} providers
          </span>
        }
      >
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          {providerCounts.map((c) => (
            <span
              key={c.id}
              className="rounded-[7px] border border-[rgba(var(--hair),.14)] bg-paper2 px-2.5 py-1.5 font-mono text-[11px] text-muted"
            >
              {c.name} <span className="text-ink">· {c.count}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          The registry ships with the app — new models land free on every tier as updates roll out. No sync, nothing to
          poll.
        </p>
      </Card>

      {/* ── Your pen ───────────────────────────────────────────── */}
      <Card
        title="Your pen"
        note={<span className="text-xs text-faint">how you mark a winner, everywhere</span>}
      >
        <PenPicker />
        <p className="mt-3 font-mono text-[10.5px] text-faint">follows you across grid, library, exports.</p>
      </Card>

      {/* ── Studio defaults ────────────────────────────────────── */}
      <Card title="Studio defaults">
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="default-size" className="text-xs font-semibold text-muted">
              Default size
            </label>
            <select
              id="default-size"
              value={defaults.defaultSize ?? '1024×1024'}
              onChange={(e) => setDefault('defaultSize', e.target.value)}
              className="rounded-lg border border-[rgba(var(--hair),.18)] bg-paper2 px-2.5 py-2 font-mono text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="1024×1024">1024×1024</option>
              <option value="1344×768">1344×768</option>
              <option value="768×1344">768×1344</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Seed policy</span>
            <Segment
              value={defaults.seedPolicy ?? 'random'}
              onChange={(v) => setDefault('seedPolicy', v)}
              options={[
                { id: 'random', label: 'random' },
                { id: 'fixed', label: 'fixed' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Export format</span>
            <Segment
              value={defaults.exportFormat ?? 'png'}
              onChange={(v) => setDefault('exportFormat', v)}
              options={[
                { id: 'png', label: 'PNG' },
                { id: 'webp', label: 'WebP' },
              ]}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-faint">
          Exports always embed the full recipe — prompt, model, seed, params, cost — in the file's metadata.
        </p>
      </Card>

      {/* ── Appearance + Your data ─────────────────────────────── */}
      <div className="grid gap-[18px] md:grid-cols-2">
        <Card title="Appearance">
          <Segment
            value={theme}
            onChange={(v) => {
              if (v !== theme) toggle()
            }}
            options={[
              { id: 'light', label: '☀︎ Studio light' },
              { id: 'dark', label: '☾ Darkroom' },
            ]}
          />
          <p className="mt-3 text-xs text-faint">
            Prints get judged under studio light. Darkroom is for the late-night seed hunts.
          </p>
        </Card>
        <DataCard />
      </div>

      <p className="flex gap-4 px-1 text-xs">
        <a href="https://github.com/hirashif/gridloom" target="_blank" rel="noreferrer" className="link-underline text-accent">
          github.com/hirashif/gridloom
        </a>
      </p>
    </div>
  )
}
