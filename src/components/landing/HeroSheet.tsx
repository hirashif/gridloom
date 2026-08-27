/**
 * The hero contact sheet — REAL outputs, not mockups. The frames are actual
 * FLUX generations of the dev-seed shoot ("studio product shot of a
 * hand-thrown ceramic mug…", seeds 42/7) with their true per-image costs;
 * the GPT row is still developing, which is honest: fal returns first.
 * 4 developed frames · $0.056 · + the GPT 1.5 pair (2 × $0.034 est.) ≈ $0.12
 * total = the caption math.
 *
 * To re-shoot this sheet: run the prompt in the app, download the frames,
 * drop them in public/demo/ and update CELLS below (keep costs/seeds true).
 *
 * LIGHT-ONLY marketing surface: hardcoded hexes, aria-hidden decorative.
 * Motion is pure CSS (animate-pop stagger, animate-draw circle) — CSS keeps
 * running in backgrounded tabs (rAF springs freeze there) and the global
 * prefers-reduced-motion rule collapses to the drawn/visible final state.
 */

const SHEET_LABEL = 'GRIDLOOM · CONTACT SHEET 001'
const PROMPT = '"studio product shot of a hand-thrown ceramic mug…"'
const SEEDS = 'FLUX columns pin seeds · others vary per take'

// Grease-pencil ellipse around the keeper. Draw-in via stroke-dashoffset;
// pathLength normalizes the geometry to the dash values.
const KEEPER_PATH =
  'M50 8 C 82 4, 98 24, 94 52 C 90 82, 60 98, 32 92 C 8 86, 0 60, 8 36 C 16 14, 34 6, 62 8'

type Cell = { tag: string; img?: string; cost?: string; keeper?: boolean; pending?: boolean }

const SHIMMER = 'linear-gradient(90deg,#F0EADA 25%,#E4DAC0 37%,#F0EADA 63%)'

// One prompt, one shoot: every frame is a real generation made through the
// app's Compare grid on 2026-07-07 with its true per-image cost. FLUX rows
// are seed-pinned per column (seeds 524875 / 935381 / 760110 / 449505 —
// s1..s4 below); the seedless rows are four takes each. Keeper: the
// teal-glaze GPT 1.5 take. Re-shoot: run the prompt in Compare, drop files here.
const ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: 'FLX2 DEV',
    cells: [
      { tag: 's1', img: '/demo/mug-flux2-a.webp', cost: '$.012' },
      { tag: 's2', img: '/demo/mug-flux2-b.webp', cost: '$.012' },
      { tag: 's3', img: '/demo/mug-flux2-c.webp', cost: '$.012' },
      { tag: 's4', img: '/demo/mug-flux2-d.webp', cost: '$.012' },
    ],
  },
  {
    label: 'SCHNELL',
    cells: [
      { tag: 's1', img: '/demo/mug-schnell2-a.webp', cost: '$.003' },
      { tag: 's2', img: '/demo/mug-schnell2-b.webp', cost: '$.003' },
      { tag: 's3', img: '/demo/mug-schnell2-c.webp', cost: '$.003' },
      { tag: 's4', img: '/demo/mug-schnell2-d.webp', cost: '$.003' },
    ],
  },
  {
    label: 'NANO-B2',
    cells: [
      { tag: 't1', img: '/demo/mug-nanob2-a.webp', cost: '$.067' },
      { tag: 't2', img: '/demo/mug-nanob2-b.webp', cost: '$.067' },
      { tag: 't3', img: '/demo/mug-nanob2-c.webp', cost: '$.067' },
      { tag: 't4', img: '/demo/mug-nanob2-d.webp', cost: '$.067' },
    ],
  },
  {
    label: 'GPT 1.5',
    cells: [
      { tag: 't1', img: '/demo/mug-gpt15-a.webp', cost: '$.034' },
      { tag: 't2', img: '/demo/mug-gpt15-b.webp', cost: '$.034' },
      { tag: 't3', img: '/demo/mug-gpt15-c.webp', cost: '$.034', keeper: true },
      { tag: 't4', img: '/demo/mug-gpt15-d.webp', cost: '$.034' },
    ],
  },
  {
    label: 'GPT MINI',
    cells: [
      { tag: 't1', img: '/demo/mug-gptmini-a.webp', cost: '$.011' },
      { tag: 't2', img: '/demo/mug-gptmini-b.webp', cost: '$.011' },
      { tag: 't3', img: '/demo/mug-gptmini-c.webp', cost: '$.011' },
      { tag: 't4', img: '/demo/mug-gptmini-d.webp', cost: '$.011' },
    ],
  },
]

function CellFrame({ cell, delay }: { cell: Cell; delay: number }) {
  const inner = (
    <>
      {cell.pending ? (
        <div
          className="shimmer-cell aspect-square rounded-[3px] border border-dashed"
          style={{ borderColor: 'rgba(50,42,32,.3)', background: SHIMMER, backgroundSize: '200% 100%' }}
        />
      ) : (
        <img
          src={cell.img}
          alt=""
          decoding="async"
          className="aspect-square w-full rounded-[3px] border object-cover"
          style={{ borderColor: 'rgba(50,42,32,.25)' }}
        />
      )}
      <div
        className="mt-[3px] flex justify-between px-[1px] font-mono text-[9px]"
        style={{ color: cell.pending ? '#A89C82' : '#8A7C5E' }}
      >
        <span>{cell.tag}</span>
        <span>{cell.pending ? 'developing…' : cell.cost}</span>
      </div>
    </>
  )

  // Pending cells shimmer in place from the start; developed frames pop in on
  // the stagger (animate-pop fills "both", so they hold hidden until their turn).
  const popped = cell.pending ? (
    <div>{inner}</div>
  ) : (
    <div className="animate-pop" style={{ animationDelay: `${delay}s` }}>
      {inner}
    </div>
  )

  if (cell.keeper) {
    return (
      <div className="relative">
        {popped}
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible"
        >
          <path
            className="animate-draw"
            style={{ ['--draw-length' as string]: '330', animationDelay: '1.9s', animationDuration: '.9s' }}
            d={KEEPER_PATH}
            pathLength={330}
            strokeDasharray={330}
            fill="none"
            stroke="#E8483A"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="animate-rise font-hand text-[17px]"
          style={{
            position: 'absolute',
            bottom: '-14px',
            right: '-8px',
            color: '#E8483A',
            transform: 'rotate(-4deg)',
            animationDelay: '2.6s',
          }}
        >
          this one
        </span>
      </div>
    )
  }

  return popped
}

export default function HeroSheet() {
  // Pop-in cadence roughly matches the design's per-cell delays.
  const cellDelay = (row: number, col: number) => 0.4 + (row * 4 + col) * 0.09

  return (
    <div className="relative" aria-hidden="true">
      {/* Extra bottom padding keeps the prompt/seeds caption clear of the
          floating cost chip that overlaps the sheet's bottom-left corner. */}
      <div
        className="animate-float sheet-surface rounded-[10px] border p-[16px_18px_44px]"
        style={{ borderColor: 'rgba(50,42,32,.16)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[.14em]" style={{ color: '#8A7C5E' }}>
            {SHEET_LABEL}
          </span>
          <span className="font-hand text-[19px]" style={{ color: '#241F18', transform: 'rotate(-2deg)' }}>
            20 images → $0.51
          </span>
        </div>

        <div className="grid grid-cols-[58px_repeat(4,1fr)] items-center gap-x-2 gap-y-2">
          {ROWS.map((row, ri) => (
            <div key={row.label} className="contents">
              <div className="pr-[2px] text-right font-mono text-[9.5px] tracking-[.08em]" style={{ color: '#8A7C5E' }}>
                {row.label}
              </div>
              {row.cells.map((cell, ci) => (
                <CellFrame key={`${row.label}-${cell.tag}`} cell={cell} delay={cellDelay(ri, ci)} />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between px-[2px] font-mono text-[9.5px]" style={{ color: '#A89C82' }}>
          <span>{PROMPT}</span>
          <span>{SEEDS}</span>
        </div>
      </div>

      {/* floating caption chip */}
      <div
        className="animate-float-b"
        style={{
          position: 'absolute',
          left: '-16px',
          bottom: '-18px',
          background: '#FFFDF6',
          border: '1px solid rgba(50,42,32,.18)',
          color: '#5C5344',
          fontSize: '12px',
          padding: '10px 14px',
          borderRadius: '9px',
          boxShadow: '0 10px 22px -10px rgba(40,30,15,.3)',
        }}
      >
        <span className="font-hand text-[18px]" style={{ color: '#241F18' }}>
          the whole sheet cost $0.51
        </span>
        , cheaper than the coffee you drank deciding
      </div>
    </div>
  )
}
