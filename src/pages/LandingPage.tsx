import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroSheet from '../components/landing/HeroSheet'

/**
 * The marketing landing page. Full port of design/Gridloom Landing.dc.html.
 *
 * LIGHT-ONLY marketing surface: every color is a hardcoded hex transcribed
 * from the design (bg #F7F4ED etc.), NOT the theme vars (bg-paper / text-ink),
 * which flip under data-gl-theme="dark". A Darkroom user visiting `/` must
 * still get the light page, so nothing here reads the CSS theme vars. The
 * The dark band in the trust section is intentional by design — that is a
 * hardcoded section background, not the theme.
 *
 * Scroll reveals use the repo's CSS `.reveal` (animation-timeline: view()),
 * which already degrades to the visible end-state under reduced motion; the
 * design's rAF-polling reveal code is NOT ported.
 *
 * NOTE: copy here is FINAL from the design file (em-dashes intentional; the
 * VOICE.md em-dash ban governs social posts, not this landing copy).
 */

const INK = '#241F18'
const MUTED = '#5C5344'
const ACCENT = '#D23B2E'
const MARK = '#E8483A'
const FAINT = '#8C8069'
const SHEET_MUTED = '#8A7C5E'
const HAIR = 'rgba(50,42,32,.12)'
const CARD_BORDER = 'rgba(50,42,32,.14)'
const SHIMMER = 'linear-gradient(90deg,#F0EADA 25%,#E4DAC0 37%,#F0EADA 63%)'
const CIRCLE_PATH =
  'M50 8 C 82 4, 98 24, 94 52 C 90 82, 60 98, 32 92 C 8 86, 0 60, 8 36 C 16 14, 34 6, 62 8'

// ── Small building blocks ────────────────────────────────────────────────

function NavLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" style={{ overflow: 'visible' }}>
      <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2} />
      <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2} />
      <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2} />
      <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill={INK} />
      <path
        d="M21.2 15.2 C 27.5 16.5, 28.5 24.5, 21.5 26.2 C 14.5 27.8, 12.5 21, 16 17.5 C 18 15.5, 20 14.8, 22.5 15.6"
        fill="none"
        stroke={ACCENT}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Static grease-pencil circle (feature/light-table cells). `inset` is the px
 *  overhang on each side; the svg is sized to 100% + 2×inset so the loop sits
 *  just outside the frame, matching the design. */
function CircleMark({ strokeWidth = 6, inset = 6 }: { strokeWidth?: number; inset?: number }) {
  const span = `calc(100% + ${inset * 2}px)`
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute overflow-visible"
      style={{ inset: -inset, width: span, height: span }}
    >
      <path d={CIRCLE_PATH} fill="none" stroke={MARK} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

function Kicker({ text, color = ACCENT }: { text: string; color?: string }) {
  return (
    <div className="font-mono text-[11.5px] font-semibold tracking-[.12em]" style={{ color }}>
      {text}
    </div>
  )
}

function GradientCell({ bg, className, style }: { bg: string; className?: string; style?: React.CSSProperties }) {
  return <span className={`aspect-square rounded-[5px] ${className ?? ''}`} style={{ background: bg, ...style }} />
}

function ShimmerCell({ className }: { className?: string }) {
  return (
    <span
      className={`shimmer-cell aspect-square rounded-[5px] ${className ?? ''}`}
      style={{ background: SHIMMER, backgroundSize: '200% 100%' }}
    />
  )
}

// ── Data ─────────────────────────────────────────────────────────────────

const AUDIENCE: { title: string; body: string; rotate: string }[] = [
  {
    title: 'the indie hacker',
    body: 'Shipping a product this month. Needs a hero image, empty-state art, and OG cards, tonight, for under a dollar.',
    rotate: '-1deg',
  },
  {
    title: 'the marketer',
    body: 'Twelve campaign variants by Friday. Runs one brief across every model, circles keepers, exports a board for the client.',
    rotate: '1deg',
  },
  {
    title: 'the founder',
    body: 'Is also the design team. Saves a "pitch deck art" recipe once and re-runs it every time the deck changes. Which is weekly.',
    rotate: '-1.5deg',
  },
  {
    title: 'the creator',
    body: 'Sells visuals. Seed-hunts across models until the frame is right, keeps the metadata, and never pays a middleman margin.',
    rotate: '1deg',
  },
]

const COMPARE: { label: string; gridloom: React.ReactNode; cloud: string }[] = [
  { label: 'Where your key lives', gridloom: 'Your browser', cloud: 'Their database' },
  { label: 'Where prompts go', gridloom: 'Straight to the provider', cloud: 'Through their backend' },
  { label: 'Who sees your images', gridloom: 'You + the provider', cloud: 'Them, and maybe a model' },
  { label: 'Data retention', gridloom: <>Until <em>you</em> delete it</>, cloud: "Per their policy, today's" },
  { label: 'What you pay', gridloom: 'Once. Then provider cents', cloud: '$20 to $60, monthly, forever' },
]

const FAQS: { q: React.ReactNode; a: string }[] = [
  {
    q: <>Is it really <em>my</em> key? What do you see?</>,
    a: "Yes. Keys are stored in your browser's localStorage and sent only to the provider you're calling. Gridloom has no backend to see anything. Open the network tab and watch: zero requests to us.",
  },
  {
    q: 'What does it actually cost to run?',
    a: 'Whatever the providers charge, typically $0.003 to $0.07 per image across the current lineup. A 12-image comparison sheet lands anywhere from a nickel to about a dollar depending on which models you pick, and Gridloom quotes the exact number before every run.',
  },
  {
    q: 'Why not just Midjourney or ChatGPT?',
    a: 'They give you one model, one image at a time, and no memory of how you got there. Gridloom is about repeatability: compare models side by side, pin seeds, keep every parameter, and re-run the winning setup forever. And nobody charges you $30 a month for it.',
  },
  {
    q: 'What happens if Gridloom disappears?',
    a: "The app keeps working. It's a static page talking to providers with your keys, your library lives in your browser, and it exports to a plain zip anytime. There's no server to shut down and lose your data on.",
  },
  {
    q: 'Which models are supported?',
    a: 'Twelve models across three providers: fal.ai (FLUX schnell + dev, the FLUX.2 family, Qwen-Image, Ideogram V4, Seedream 4.5, Recraft V4), Google Gemini (Nano Banana 2), and OpenAI (GPT Image 1.5 + mini). New models land as app updates.',
  },
  {
    q: 'Do I need keys for all three providers?',
    a: 'No, one is enough to start. The comparison grid shows the models your keys can reach. Most people start with fal.ai, which covers nine of the twelve models on one key, from $0.003 an image.',
  },
]

// ── Pen picker (functional; the light-table marks + hero echo it) ─────────

type Pen = 'grease-pencil' | 'red-dot' | 'washi-tape' | 'marker-star' | 'stamp' | 'paint-check'

const PENS: { id: Pen; label: string; swatch: React.ReactNode }[] = [
  {
    id: 'grease-pencil',
    label: 'Grease pencil',
    swatch: (
      <svg width="14" height="14" viewBox="0 0 100 100" aria-hidden="true">
        <path d={CIRCLE_PATH} fill="none" stroke={MARK} strokeWidth={9} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'red-dot',
    label: 'Red dot',
    swatch: <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#FF7A5C,#D9301B 70%)' }} />,
  },
  {
    id: 'washi-tape',
    label: 'Washi tape',
    swatch: <span style={{ width: 16, height: 9, background: '#FBE38A', transform: 'rotate(-8deg)', boxShadow: '0 1px 2px rgba(60,40,0,.25)' }} />,
  },
  {
    id: 'marker-star',
    label: 'Marker star',
    swatch: <span className="font-hand" style={{ fontSize: 16, lineHeight: 1, color: MARK }}>★</span>,
  },
  {
    id: 'stamp',
    label: 'Stamp',
    swatch: (
      <span
        className="font-mono"
        style={{ border: '1.5px solid rgba(232,72,58,.85)', color: 'rgba(232,72,58,.9)', fontSize: 7, fontWeight: 600, letterSpacing: '.1em', padding: '1px 4px', borderRadius: 2, transform: 'rotate(-8deg)' }}
      >
        WIN
      </span>
    ),
  },
  {
    id: 'paint-check',
    label: 'Paint check',
    swatch: (
      <svg width="13" height="13" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M22 55 L 42 76 L 84 24" fill="none" stroke="#4C7C4C" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

/** The winner mark rendered on the top light-table print, switched by the pen picker. */
function LightTableMark({ pen }: { pen: Pen }) {
  switch (pen) {
    case 'grease-pencil':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute overflow-visible" style={{ inset: '0 0 12px 0' }}>
          {/* pathLength normalizes the geometry so dasharray/draw-length match exactly */}
          <path
            className="animate-draw"
            style={{ ['--draw-length' as string]: '330', animationDuration: '.7s' }}
            d={CIRCLE_PATH}
            pathLength={330}
            strokeDasharray={330}
            fill="none"
            stroke={MARK}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </svg>
      )
    case 'red-dot':
      return <span className="animate-pop" style={{ position: 'absolute', top: -9, right: -9, width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#FF7A5C,#D9301B 70%)', boxShadow: '0 2px 5px rgba(120,20,0,.4)' }} />
    case 'washi-tape':
      return (
        <span className="animate-pop font-mono" style={{ position: 'absolute', top: 4, left: -13, background: '#FBE38A', color: '#5C4A12', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', padding: '3px 12px', transform: 'rotate(-9deg)', boxShadow: '0 2px 5px rgba(60,40,0,.3)', opacity: 0.94 }}>
          KEEP
        </span>
      )
    case 'marker-star':
      return <span className="animate-pop font-hand" style={{ position: 'absolute', bottom: 16, right: 2, fontSize: 34, lineHeight: 1, color: MARK, textShadow: '0 1px 3px rgba(0,0,0,.3)', transform: 'rotate(-6deg)' }}>★</span>
    case 'stamp':
      return (
        <span className="animate-pop font-mono" style={{ position: 'absolute', top: 48, left: 2, border: '2.5px solid rgba(232,72,58,.85)', color: 'rgba(232,72,58,.9)', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', padding: '4px 8px', borderRadius: 4, transform: 'rotate(-11deg)' }}>
          WINNER
        </span>
      )
    case 'paint-check':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true" className="pointer-events-none absolute" style={{ inset: '14px 14px 30px 14px' }}>
          <path d="M22 55 L 42 76 L 84 24" fill="none" stroke="#FFF3E8" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.4))' }} />
        </svg>
      )
  }
}

// ── Page ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [pen, setPen] = useState<Pen>('grease-pencil')

  // Animate the nav's in-page anchors (#how/#features/#faq).
  // Scoped to the landing and removed on unmount so studio routes keep
  // instant scrolling; the OS reduced-motion setting wins.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  // React Router doesn't scroll to hashes on cross-route navigation
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    // Instant jump on arrival — smooth-scrolling from the very top on a
    // fresh load would be a five-second cruise past the whole page.
    const jump = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
    jump()
    // Layout settles as sections/fonts land; re-align once.
    const settle = window.setTimeout(jump, 350)
    return () => window.clearTimeout(settle)
  }, [])

  return (
    <div style={{ background: '#F7F4ED', color: INK }} className="font-sans">
      {/* ============ NAV ============ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,244,237,.88)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${HAIR}` }}>
        <div className="mx-auto flex max-w-[1140px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-[11px]">
            <NavLogo />
            <span className="font-display text-[21px] font-semibold tracking-[-.01em]">Gridloom</span>
          </div>
          <div className="hidden items-center gap-7 text-sm font-medium md:flex" style={{ color: MUTED }}>
            <a href="#how" className="transition-colors hover:text-[#241F18]" style={{ color: 'inherit', textDecoration: 'none' }}>How it works</a>
            <a href="#features" className="transition-colors hover:text-[#241F18]" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
            <a href="#faq" className="transition-colors hover:text-[#241F18]" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
          </div>
          <Link
            to="/generate"
            className="press inline-flex items-center gap-[7px] rounded-full px-[18px] py-[9px] font-semibold transition-colors hover:bg-[#D23B2E] hover:text-[#F7F4ED]"
            style={{ background: INK, color: '#F7F4ED' }}
          >
            Open the studio
          </Link>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <div className="mx-auto grid max-w-[1140px] items-center gap-12 px-6 pb-[84px] pt-[72px] md:grid-cols-[1fr_500px]">
        <div>
          <div
            className="animate-rise inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11.5px] font-medium tracking-[.08em]"
            style={{ color: MUTED, borderColor: 'rgba(50,42,32,.25)', animationDelay: '.05s' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />A PHOTO STUDIO FOR AI IMAGES
          </div>
          <h1 className="animate-rise mt-[22px] font-display text-[44px] font-medium leading-[1.03] tracking-[-.015em] md:text-[62px]" style={{ animationDelay: '.15s' }}>
            Run the shoot.
            <br />
            <em className="font-normal">
              Circle the{' '}
              <span className="relative inline-block">
                keeper.
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 200 74"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute overflow-visible"
                  style={{ inset: '-8px -14px', width: 'calc(100% + 28px)', height: 'calc(100% + 16px)' }}
                >
                  <path
                    className="animate-draw"
                    style={{ ['--draw-length' as string]: '640', animationDelay: '.8s', animationDuration: '1.1s', opacity: 0.9 }}
                    d="M28 12 C 90 -4, 196 4, 197 34 C 198 62, 120 74, 52 66 C 6 60, -4 38, 22 20 C 40 8, 90 2, 150 6"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={640}
                  />
                </svg>
              </span>
            </em>
          </h1>
          <p className="animate-rise mt-5 max-w-[44ch] text-[17.5px] leading-relaxed" style={{ color: MUTED, animationDelay: '.25s' }}>
            One prompt, every model, every seed, developed side by side in your browser. Your API keys, your images,
            provider prices. No subscription, no middleman.
          </p>
          <div className="animate-rise mt-[30px] flex items-center gap-[18px]" style={{ animationDelay: '.35s' }}>
            <Link
              to="/generate"
              className="press inline-flex items-center gap-[9px] rounded-full px-[26px] py-3.5 text-[15.5px] font-semibold transition-colors hover:bg-[#B32A1F]"
              style={{ background: ACCENT, color: '#FFF6F0', boxShadow: '0 2px 0 rgba(36,31,24,.3)' }}
            >
              Open the studio <span className="font-mono">→</span>
            </Link>
          </div>
          <div className="animate-rise mt-[26px] font-mono text-xs" style={{ color: FAINT, animationDelay: '.45s' }}>
            free in early access · keys never leave your browser
          </div>
        </div>

        <HeroSheet />
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <div id="how" className="scroll-mt-16" style={{ background: '#F0EBDF', borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` }}>
        <div className="reveal mx-auto max-w-[1140px] px-6 py-[84px]">
          <Kicker text="HOW IT WORKS" />
          <h2 className="mt-3 max-w-[22ch] font-display text-[42px] font-medium tracking-[-.01em]">
            Three steps between you and the best version of your image.
          </h2>
          <div className="mt-11 grid gap-[22px] md:grid-cols-3">
            {/* 1 · paste a key */}
            <div className="flex flex-col gap-4 rounded-[14px] border p-[26px_26px_24px]" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
              <div className="font-hand text-[26px]" style={{ color: ACCENT }}>1.</div>
              <div className="flex flex-col gap-[9px] rounded-[10px] border p-3.5" style={{ background: '#F7F4ED', borderColor: HAIR }}>
                <div className="flex items-center justify-between font-mono text-[11px]" style={{ color: MUTED }}>
                  <span>fal.ai</span>
                  <span className="font-semibold" style={{ color: '#4C7C4C' }}>✓ key works</span>
                </div>
                <div className="overflow-hidden whitespace-nowrap rounded-[7px] border px-[11px] py-2 font-mono text-[11.5px]" style={{ background: '#FFF', borderColor: 'rgba(50,42,32,.15)', color: FAINT }}>
                  fal_sk_••••••••••••7f2a
                </div>
              </div>
              <div>
                <div className="text-[17px] font-semibold">Paste a key</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: MUTED }}>
                  fal.ai, Google Gemini, or OpenAI. Any one will do. It's stored in your browser, tested with one
                  click, and never sent anywhere but the provider.
                </p>
              </div>
            </div>
            {/* 2 · write one prompt */}
            <div className="flex flex-col gap-4 rounded-[14px] border p-[26px_26px_24px]" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
              <div className="font-hand text-[26px]" style={{ color: ACCENT }}>2.</div>
              <div className="flex flex-col gap-[9px] rounded-[10px] border p-3.5" style={{ background: '#F7F4ED', borderColor: HAIR }}>
                <div className="rounded-[7px] border px-[11px] py-2 font-mono text-[11.5px]" style={{ background: '#FFF', borderColor: 'rgba(50,42,32,.15)', color: INK }}>
                  brand mascot, riso print style
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-[5px] px-2 py-1 font-mono text-[10px]" style={{ background: INK, color: '#F7F4ED' }}>flux-1.1-pro</span>
                  <span className="rounded-[5px] px-2 py-1 font-mono text-[10px]" style={{ background: INK, color: '#F7F4ED' }}>nano-banana</span>
                  <span className="rounded-[5px] border border-dashed px-2 py-1 font-mono text-[10px]" style={{ background: '#FFF', color: FAINT, borderColor: 'rgba(50,42,32,.3)' }}>+ 5 more</span>
                  <span className="rounded-[5px] border px-2 py-1 font-mono text-[10px]" style={{ background: '#FFF', color: MUTED, borderColor: 'rgba(50,42,32,.2)' }}>seeds × 4</span>
                </div>
                <div className="font-mono text-[10.5px] font-semibold" style={{ color: '#B5763B' }}>this run ≈ $0.18</div>
              </div>
              <div>
                <div className="text-[17px] font-semibold">Write one prompt</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: MUTED }}>
                  Pick models and a seed count. Gridloom quotes the cost <em>before</em> you run, then fires every
                  combination at once.
                </p>
              </div>
            </div>
            {/* 3 · circle the keeper */}
            <div className="flex flex-col gap-4 rounded-[14px] border p-[26px_26px_24px]" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
              <div className="font-hand text-[26px]" style={{ color: ACCENT }}>3.</div>
              <div className="flex items-center gap-[9px] rounded-[10px] border p-3.5" style={{ background: '#F7F4ED', borderColor: HAIR }}>
                <div className="grid w-[86px] flex-none grid-cols-2 gap-[5px]">
                  <GradientCell bg="linear-gradient(135deg,#D9A05B,#8C5A2E)" className="rounded-[4px]" />
                  <span className="relative aspect-square rounded-[4px]" style={{ background: 'linear-gradient(120deg,#F2D8A0,#B5763B)' }}>
                    <CircleMark strokeWidth={6} inset={6} />
                  </span>
                  <GradientCell bg="linear-gradient(140deg,#B9C49A,#6E7C4C)" className="rounded-[4px]" />
                  <GradientCell bg="linear-gradient(150deg,#9AB3C4,#4C6E7C)" className="rounded-[4px]" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="rounded-[5px] border px-2 py-1 text-center font-mono text-[10px]" style={{ background: '#FFF', borderColor: 'rgba(50,42,32,.2)', color: MUTED }}>save as recipe</span>
                  <span className="rounded-[5px] px-2 py-1 text-center font-mono text-[10px]" style={{ background: INK, color: '#F7F4ED' }}>export grid ↓</span>
                </div>
              </div>
              <div>
                <div className="text-[17px] font-semibold">Circle the keeper</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: MUTED }}>
                  Mark the winner with your pen, save the whole setup as a recipe, and export the image, or the entire
                  grid as one board.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FEATURE TOUR (bento) ============ */}
      <div id="features" className="reveal mx-auto max-w-[1140px] scroll-mt-16 px-6 py-[84px]">
        <Kicker text="THE STUDIO" />
        <h2 className="mt-3 max-w-[24ch] font-display text-[42px] font-medium tracking-[-.01em]">
          Everything a working image person needs. Nothing a tourist does.
        </h2>

        <div className="mt-11 grid gap-5 md:grid-cols-3">
          {/* comparison grid: spans 2 */}
          <div className="grid items-center gap-6 rounded-[16px] border p-[30px] md:col-span-2 md:grid-cols-[1fr_240px]" style={{ background: '#FFFDF6', borderColor: CARD_BORDER, color: INK }}>
            <div>
              <div className="font-display text-[26px] font-medium">The comparison grid</div>
              <p className="mt-2.5 max-w-[42ch] text-[14.5px] leading-relaxed" style={{ color: MUTED }}>
                Models across, seeds down: every model your keys can reach, on one sheet. Cells land as each provider
                answers, with cost and time stamped on every frame. A bad cell? Re-run just that one, not the whole
                shoot.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['per-cell re-run', 'cost + duration per cell', 'composite export'].map((t) => (
                  <span key={t} className="rounded-full border px-2.5 py-1 font-mono text-[10.5px]" style={{ borderColor: 'rgba(50,42,32,.25)' }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <GradientCell bg="linear-gradient(135deg,#D9A05B,#8C5A2E)" />
              <GradientCell bg="linear-gradient(160deg,#E8C285,#A06A32)" />
              <span className="relative aspect-square rounded-[5px]" style={{ background: 'linear-gradient(120deg,#F2D8A0,#B5763B)' }}>
                <CircleMark strokeWidth={5} inset={6} />
              </span>
              <GradientCell bg="linear-gradient(140deg,#B9C49A,#6E7C4C)" />
              <GradientCell bg="linear-gradient(170deg,#D2D8B0,#889460)" />
              <ShimmerCell />
              <GradientCell bg="linear-gradient(150deg,#9AB3C4,#4C6E7C)" />
              <ShimmerCell />
              <ShimmerCell />
            </div>
          </div>

          {/* cost */}
          <div className="flex flex-col gap-3.5 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="font-mono text-[22px] font-semibold" style={{ color: INK }}>
              ≈ $0.18 <span className="text-xs font-medium" style={{ color: '#B5763B' }}>before you run</span>
            </div>
            <div className="text-[16.5px] font-semibold">You always know the price</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              A quote before every run, a live session meter while you work, and the exact cost stamped on every image
              forever.
            </p>
            <div className="animate-tick mt-auto border-t border-dashed pt-3 font-mono text-[11px]" style={{ color: FAINT, borderColor: 'rgba(50,42,32,.2)' }}>
              this session: $0.42 · 31 images
            </div>
          </div>

          {/* library */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="flex gap-[5px]">
              {['linear-gradient(135deg,#D9A05B,#8C5A2E)', 'linear-gradient(140deg,#B9C49A,#6E7C4C)', 'linear-gradient(150deg,#9AB3C4,#4C6E7C)', 'linear-gradient(120deg,#F2D8A0,#B5763B)'].map((bg) => (
                <span key={bg} className="rounded-[5px]" style={{ width: 34, height: 34, background: bg }} />
              ))}
            </div>
            <div className="text-[16.5px] font-semibold">A library that keeps itself</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Every generation auto-saved with its full negative: prompt, model, seed, params, cost, date. Search it,
              filter it, never lose a good frame again.
            </p>
          </div>

          {/* recipes */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="rounded-[7px] border px-[11px] py-2 font-mono text-[11px]" style={{ color: MUTED, background: '#F7F4ED', borderColor: HAIR }}>
              recipe: <span className="font-semibold" style={{ color: INK }}>product-hero.v3</span> → run
            </div>
            <div className="text-[16.5px] font-semibold">Recipes, not lucky accidents</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Freeze a winning setup (prompt template, models, params, seed policy) and re-run it next week in one
              click.
            </p>
          </div>

          {/* winner marks */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="flex items-center gap-2.5">
              <span className="relative rounded-[5px]" style={{ width: 34, height: 34, background: 'linear-gradient(120deg,#F2D8A0,#B5763B)' }}>
                <CircleMark strokeWidth={7} inset={5} />
              </span>
              <span className="relative rounded-[5px]" style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#B9C49A,#6E7C4C)' }}>
                <span style={{ position: 'absolute', top: -5, right: -5, width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#FF7A5C,#D9301B 70%)' }} />
              </span>
              <span className="relative overflow-visible rounded-[5px]" style={{ width: 34, height: 34, background: 'linear-gradient(150deg,#9AB3C4,#4C6E7C)' }}>
                <span className="font-mono" style={{ position: 'absolute', top: 2, left: -8, background: '#FBE38A', color: '#5C4A12', fontSize: 6, fontWeight: 600, padding: '2px 6px', transform: 'rotate(-9deg)' }}>KEEP</span>
              </span>
            </div>
            <div className="text-[16.5px] font-semibold">Mark winners with your pen</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Grease-pencil circle, red-dot sticker, washi tape, stamp. Pick your mark once and it follows you across
              grids, library, and exports.
            </p>
          </div>

          {/* key vault */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="flex flex-col gap-[5px] font-mono text-[11px]" style={{ color: MUTED }}>
              <span>fal_sk_••••7f2a <span className="font-semibold" style={{ color: '#4C7C4C' }}>✓</span></span>
              <span>AIza••••q9Lm <span className="font-semibold" style={{ color: '#4C7C4C' }}>✓</span></span>
              <span style={{ color: '#B5A98E' }}>sk-proj-•••• <span style={{ color: '#B5763B' }}>test</span></span>
            </div>
            <div className="text-[16.5px] font-semibold">A vault, not a server</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Keys live in your browser's storage, tested against the provider directly. We couldn't read them if we
              wanted to. There's nothing to send them to.
            </p>
          </div>

          {/* reference image */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center rounded-[5px] border-[1.5px] border-dashed text-[15px]" style={{ width: 34, height: 34, borderColor: 'rgba(50,42,32,.35)', color: FAINT }}>+</span>
              <span className="font-mono text-sm" style={{ color: FAINT }}>→</span>
              <span className="rounded-[5px]" style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#D9A05B,#8C5A2E)' }} />
              <span className="rounded-[5px]" style={{ width: 34, height: 34, background: 'linear-gradient(160deg,#E8C285,#A06A32)' }} />
            </div>
            <div className="text-[16.5px] font-semibold">Start from a reference</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Drop in a product shot or style frame and run image-to-image on the models that support it: "make this,
              but in our brand style."
            </p>
          </div>

          {/* export/backup */}
          <div className="flex flex-col gap-3 rounded-[16px] border p-7" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="rounded-[7px] border px-[11px] py-2 font-mono text-[11px]" style={{ color: MUTED, background: '#F7F4ED', borderColor: HAIR }}>
              gridloom-backup-2026-07-03.zip ↓
            </div>
            <div className="text-[16.5px] font-semibold">Yours means yours</div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              One-click export of any image, any grid board, or your entire library + settings as a backup file.
              Restore it on any machine.
            </p>
          </div>
        </div>
      </div>

      {/* ============ LIGHT TABLE + PEN PICKER ============ */}
      <div className="reveal mx-auto max-w-[1140px] px-6 pb-[84px]">
        <div className="grid items-center gap-12 md:grid-cols-[0.9fr_1.3fr]">
          <div>
            <Kicker text="YOUR PEN" />
            <h2 className="mt-3 font-display text-[42px] font-medium tracking-[-.01em]">Filed on the light table. Marked your way.</h2>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed" style={{ color: MUTED }}>
              Favoriting is personal. Pick the pen you'd actually reach for. It marks your winners across the grid, the
              library, and every export.
            </p>
            <div className="mt-6 flex flex-wrap gap-[9px]">
              {PENS.map((p) => {
                const on = pen === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPen(p.id)}
                    className="press inline-flex items-center gap-[7px] rounded-full border-[1.5px] px-[15px] py-2 text-[13px] font-semibold hover:border-[#D23B2E]"
                    style={{
                      color: on ? INK : MUTED,
                      background: on ? '#FFF3EC' : '#FFFDF6',
                      borderColor: on ? ACCENT : 'rgba(50,42,32,.2)',
                    }}
                  >
                    {p.swatch}
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-[18px] font-hand text-[19px]" style={{ color: FAINT, transform: 'rotate(-1deg)' }}>
              try one, the sheet updates too ↗
            </div>
          </div>

          {/* light table */}
          <div className="sheet-surface rounded-[18px] border p-[28px_30px_32px]" style={{ borderColor: 'rgba(38,34,26,.14)' }}>
            <div className="mb-[18px] flex items-center justify-between">
              <span className="rounded-[7px] border px-[11px] py-1.5 font-mono text-[11px]" style={{ color: '#7A7057', background: 'rgba(255,255,255,.7)', borderColor: 'rgba(38,34,26,.12)' }}>
                library · search "mug" · 3 results
              </span>
              <span className="font-hand text-[18px]" style={{ color: MUTED, transform: 'rotate(-2deg)' }}>everything auto-saved</span>
            </div>
            <div className="flex flex-wrap justify-center gap-[18px]">
              {/* Real frames from the 2026-07-07 Compare shoot — true model/cost stamps. */}
              <div className="relative" style={{ background: '#FFF', padding: '8px 8px 6px', borderRadius: 6, boxShadow: '0 10px 22px -8px rgba(60,48,24,.42)', transform: 'rotate(-1.8deg)' }}>
                <img src="/demo/mug-nanob2-a.webp" alt="" decoding="async" style={{ width: 132, aspectRatio: '1', borderRadius: 3, objectFit: 'cover', display: 'block' }} />
                <div className="mt-[5px] flex justify-between px-[2px] font-mono text-[9px]" style={{ color: SHEET_MUTED }}>
                  <span>nano-b2 · t1</span>
                  <span>$.067</span>
                </div>
                {/* key forces a remount per pick so the mark's entrance replays */}
                <LightTableMark key={pen} pen={pen} />
              </div>
              <div style={{ background: '#FFF', padding: '8px 8px 6px', borderRadius: 6, boxShadow: '0 6px 16px -6px rgba(60,48,24,.35)', transform: 'rotate(1.6deg) translateY(-5px)' }}>
                <img src="/demo/mug-gpt15-b.webp" alt="" decoding="async" style={{ width: 132, aspectRatio: '1', borderRadius: 3, objectFit: 'cover', display: 'block' }} />
                <div className="mt-[5px] flex justify-between px-[2px] font-mono text-[9px]" style={{ color: SHEET_MUTED }}>
                  <span>gpt 1.5 · t2</span>
                  <span>$.034</span>
                </div>
              </div>
              <div style={{ background: '#FFF', padding: '8px 8px 6px', borderRadius: 6, boxShadow: '0 6px 16px -6px rgba(60,48,24,.35)', transform: 'rotate(-.6deg) translateY(4px)' }}>
                <img src="/demo/mug-gptmini-c.webp" alt="" decoding="async" style={{ width: 132, aspectRatio: '1', borderRadius: 3, objectFit: 'cover', display: 'block' }} />
                <div className="mt-[5px] flex justify-between px-[2px] font-mono text-[9px]" style={{ color: SHEET_MUTED }}>
                  <span>gpt mini · t3</span>
                  <span>$.011</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-center gap-3.5 font-mono text-[10.5px]" style={{ color: SHEET_MUTED }}>
              {['prompt ✓', 'model ✓', 'seed ✓', 'params ✓', 'cost ✓', 'date ✓'].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ PERSONAS ============ */}
      <div style={{ background: '#F0EBDF', borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` }}>
        <div className="reveal mx-auto max-w-[1140px] px-6 py-[84px]">
          <Kicker text="WHO IT'S FOR" />
          <h2 className="mt-3 max-w-[22ch] font-display text-[42px] font-medium tracking-[-.01em]">People who need the image, not the hobby.</h2>
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="flex flex-col gap-2.5 rounded-[14px] border p-6" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
                <div className="font-hand text-[24px]" style={{ color: ACCENT, transform: `rotate(${a.rotate})` }}>{a.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ TRUST / PRIVACY ============ */}
      <div className="reveal mx-auto max-w-[1140px] px-6 py-[84px]">
        <div className="grid items-start gap-14 md:grid-cols-[1fr_1.2fr]">
          <div>
            <Kicker text="TRUST" />
            <h2 className="mt-3 font-display text-[42px] font-medium tracking-[-.01em]">Your keys never meet our servers. We don't have servers.</h2>
            <p className="mt-[18px] text-base leading-relaxed" style={{ color: MUTED }}>
              Gridloom is a static page. Keys sit in localStorage, images in IndexedDB, and every generation call goes
              from your browser straight to the provider. Zero runtime calls to our infrastructure.
            </p>
            <div className="mt-[22px] rounded-[11px] px-[18px] py-[15px] font-mono text-xs" style={{ background: '#26211A', color: '#C9BFA8', lineHeight: 1.7 }}>
              <span style={{ color: FAINT }}>$ open devtools → network tab</span>
              <br />
              POST api.fal.ai/... <span style={{ color: '#7FA86B' }}>200</span>
              <br />
              POST generativelanguage.googleapis.com/... <span style={{ color: '#7FA86B' }}>200</span>
              <br />
              <span style={{ color: FAINT }}>gridloom.app requests: <span style={{ color: '#F0EBDD' }}>0</span>. go look.</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-[14px] border" style={{ background: '#FFFDF6', borderColor: CARD_BORDER }}>
            <div className="grid grid-cols-[1.2fr_1fr_1fr] text-[13.5px]">
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${HAIR}` }} />
              <div className="flex items-center gap-1.5 font-bold" style={{ padding: '14px 12px', borderBottom: `1px solid ${HAIR}` }}>
                <svg width="14" height="14" viewBox="0 0 28 28" aria-hidden="true">
                  <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2.6} />
                  <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2.6} />
                  <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke={INK} strokeWidth={2.6} />
                  <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill={INK} />
                </svg>
                Gridloom
              </div>
              <div className="font-semibold" style={{ padding: '14px 12px', borderBottom: `1px solid ${HAIR}`, color: FAINT }}>Cloud AI studios</div>
              {COMPARE.map((row, i) => {
                const last = i === COMPARE.length - 1
                const rb = last ? {} : { borderBottom: '1px solid rgba(50,42,32,.08)' }
                return (
                  <div key={row.label} className="contents">
                    <div className="font-medium" style={{ padding: '13px 18px', color: MUTED, ...rb }}>{row.label}</div>
                    <div className="font-semibold" style={{ padding: '13px 12px', ...rb }}>{row.gridloom}</div>
                    <div style={{ padding: '13px 12px', color: FAINT, ...rb }}>{row.cloud}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============ FAQ ============ */}
      <div id="faq" className="reveal mx-auto max-w-[840px] scroll-mt-16 px-6 py-[84px]">
        <Kicker text="FAQ" />
        <h2 className="mb-7 mt-3 font-display text-[42px] font-medium tracking-[-.01em]">Fair questions.</h2>
        {FAQS.map((f, i) => (
          <details key={i} style={{ borderTop: '1px solid rgba(50,42,32,.15)', ...(i === FAQS.length - 1 ? { borderBottom: '1px solid rgba(50,42,32,.15)' } : {}) }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-[18px] text-[16.5px] font-semibold [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span className="font-hand text-[24px]" style={{ color: ACCENT }}>+</span>
            </summary>
            <p className="mb-[18px] max-w-[64ch] px-1 text-[15px] leading-relaxed" style={{ color: MUTED }}>{f.a}</p>
          </details>
        ))}
      </div>

      {/* ============ FOOTER ============ */}
      <div style={{ borderTop: `1px solid ${HAIR}` }}>
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-[9px]">
            <NavLogo size={20} />
            <span className="text-[13px]" style={{ color: FAINT }}>© 2026 Gridloom. A static page with opinions.</span>
          </div>
          <div className="flex gap-[22px] text-[13px] font-medium" style={{ color: MUTED }}>
            <a href="https://github.com/hirashif/gridloom" target="_blank" rel="noreferrer" className="hover:text-[#241F18]" style={{ color: 'inherit', textDecoration: 'none' }}>Source on GitHub</a>
          </div>
        </div>
      </div>
    </div>
  )
}
