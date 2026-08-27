import { Popover } from '@base-ui-components/react/popover'
import NumberFlow from '@number-flow/react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import FieldGuide from './FieldGuide'
import Logo from './Logo'
import ConfirmDialog from './sheet/ConfirmDialog'
import Tip from './sheet/Tip'
import { APP_NAME } from '../lib/constants'
import { formatUsd, useSessionCost } from '../stores/cost'
import { useTheme } from '../stores/theme'

const navItems = [
  { to: '/generate', label: 'Generate' },
  { to: '/grid', label: 'Compare' },
  { to: '/library', label: 'Library' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/settings', label: 'Settings' },
]

/** Pill tab: ink fill on the active route, muted text otherwise. */
function tabClass({ isActive }: { isActive: boolean }) {
  return `press whitespace-nowrap rounded-full px-[15px] py-[7px] text-[13.5px] font-semibold transition-colors ${
    isActive ? 'bg-ink text-paper2' : 'text-muted hover:text-ink'
  }`
}

/** Session cost ticker: red mono in the chrome, with the per-model breakdown
 *  popover behind it. Keeps the idle tick and NumberFlow from before. */
function CostMeter() {
  const totalUsd = useSessionCost((s) => s.totalUsd)
  const byModel = useSessionCost((s) => s.byModel)
  const startedAt = useSessionCost((s) => s.startedAt)
  const reset = useSessionCost((s) => s.reset)
  const [confirmReset, setConfirmReset] = useState(false)
  const models = Object.entries(byModel).sort(([, a], [, b]) => b - a)

  return (
    <>
      <Popover.Root>
        <Tip label="Estimated session spend, per model">
          <Popover.Trigger className="press flex items-baseline gap-1 font-mono text-xs font-semibold text-accent animate-tick">
            <span>session</span>
            <NumberFlow
              value={totalUsd}
              format={{
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: totalUsd > 0 && totalUsd < 0.05 ? 3 : 2,
              }}
              transformTiming={{ duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              respectMotionPreference
              className="font-mono tabular-nums"
            />
          </Popover.Trigger>
        </Tip>
        <Popover.Portal>
          <Popover.Positioner sideOffset={10} className="z-50">
            <Popover.Popup className="w-60 rounded-xl border border-[rgba(var(--hair),.14)] bg-card p-3 shadow-[0_18px_40px_-18px_rgba(60,48,24,.4)] animate-scale-in">
              <Popover.Title className="text-xs font-medium text-ink">Session spend</Popover.Title>
              <p className="mt-0.5 font-mono text-[10px] text-faint">
                since {new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
              {models.length === 0 ? (
                <p className="mt-2 text-xs text-muted">Nothing spent yet.</p>
              ) : (
                <div className="mt-2 divide-y divide-[rgba(var(--hair),.14)]">
                  {models.map(([modelId, usd]) => (
                    <div key={modelId} className="flex items-baseline justify-between gap-3 py-1 font-mono text-[11px]">
                      <span className="truncate text-muted">{modelId}</span>
                      <span className="shrink-0 text-ink">{formatUsd(usd)}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (totalUsd > 0) setConfirmReset(true)
                }}
                className="press mt-3 w-full rounded-full border border-[rgba(var(--hair),.2)] px-2 py-1 text-xs text-muted hover:bg-chip-on"
              >
                Reset the meter
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the session meter?"
        body="The estimate starts over at zero. Every frame keeps its own cost in the library."
        confirmLabel="Reset it"
        onConfirm={() => {
          reset()
          setConfirmReset(false)
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      title="toggle darkroom"
      aria-label="Toggle theme"
      className="press px-1 text-[15px] leading-none text-faint hover:text-ink"
    >
      {theme === 'light' ? '☾' : '☀︎'}
    </button>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      {/* Sticky chrome: translucent bar with a hairline base */}
      <header className="sticky top-0 z-40 border-b border-[rgba(var(--hair),.14)] bg-[var(--chrome)] backdrop-blur-[10px]">
        <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-5">
          {/* Brand */}
          <div className="flex flex-none items-center gap-2.5">
            <Logo size={24} />
            <span className="font-display text-lg font-semibold tracking-[-0.01em]">{APP_NAME}</span>
            <span className="rounded border border-[rgba(var(--hair),.2)] px-[5px] py-px font-mono text-[9px] text-faint">
              BETA
            </span>
          </div>

          {/* Tabs — scroll horizontally on narrow screens, never break */}
          <nav className="flex min-w-0 flex-1 justify-start gap-1 overflow-x-auto sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={tabClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Status cluster */}
          <div className="flex flex-none items-center gap-2.5 sm:gap-3">
            <span className="hidden sm:block">
            </span>
            <CostMeter />
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              title="field guide"
              aria-label="Open field guide"
              className="press flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(var(--hair),.25)] font-display text-[15px] italic leading-none text-faint hover:border-ink hover:text-ink"
            >
              ?
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <FieldGuide open={guideOpen} onOpenChange={setGuideOpen} />

      <main className="flex-1">
        {/* Centered content column matching the design's per-screen wrapper
            (max 1220px). Route fade only; dialogs portal to <body>, so this
            transform-free wrapper never affects their positioning. Steps 4/5
            restyle the pages inside. */}
        <div
          key={location.pathname}
          className="mx-auto w-full max-w-[1220px] animate-fade-in px-5 py-6 lg:px-8"
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
