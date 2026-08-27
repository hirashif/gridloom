import { Link } from 'react-router-dom'
import { RouteMeta } from '../components/RouteMeta'

/**
 * 404 page. LIGHT-ONLY marketing surface: colors are hardcoded hexes (not the
 * theme vars, which flip in Darkroom) so a dark-mode user hitting a bad URL
 * still gets the light page.
 *
 * Hand-built STATIC mirror lives at public/404.html (served by Cloudflare Pages
 * for hard 404s before the SPA boots). These two MUST stay visually in sync.
 */
export default function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: '#F7F4ED', color: '#241F18' }}
    >
      <RouteMeta title="This frame didn't develop. | Gridloom" noindex />

      {/* contact sheet with a missing frame */}
      <div
        className="animate-rise sheet-surface rounded-[10px] border p-[16px_18px_14px]"
        style={{
          borderColor: 'rgba(50,42,32,.16)',
          transform: 'rotate(-1.5deg)',
          animationDelay: '.1s',
        }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span
            className="font-mono text-[10px] tracking-[.14em]"
            style={{ color: '#8A7C5E' }}
          >
            GRIDLOOM · SHEET 404
          </span>
          <span
            className="font-hand text-[17px]"
            style={{ color: '#241F18', transform: 'rotate(-2deg)' }}
          >
            where'd it go?
          </span>
        </div>
        <div className="grid grid-cols-[repeat(3,86px)] gap-2">
          {[
            'linear-gradient(135deg,#D9A05B,#8C5A2E 60%,#3E2A18)',
            'linear-gradient(140deg,#B9C49A,#6E7C4C 60%,#333D22)',
            'linear-gradient(150deg,#9AB3C4,#4C6E7C 60%,#22333D)',
            'linear-gradient(160deg,#E8C285,#A06A32 55%,#57381C)',
          ].map((bg) => (
            <div
              key={bg}
              className="aspect-square rounded-[3px] border"
              style={{ borderColor: 'rgba(50,42,32,.2)', background: bg }}
            />
          ))}
          <div
            className="relative flex aspect-square items-center justify-center rounded-[3px] border-[1.5px] border-dashed"
            style={{ borderColor: 'rgba(232,72,58,.6)' }}
          >
            <span className="font-mono text-[13px] font-semibold" style={{ color: '#E8483A' }}>
              404
            </span>
            <svg
              viewBox="0 0 100 100"
              aria-hidden="true"
              className="pointer-events-none absolute inset-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible"
            >
              <path
                className="animate-draw"
                style={{ ['--draw-length' as string]: '330', animationDelay: '.8s', animationDuration: '.9s' }}
                d="M50 8 C 82 4, 98 24, 94 52 C 90 82, 60 98, 32 92 C 8 86, 0 60, 8 36 C 16 14, 34 6, 62 8"
                fill="none"
                stroke="#E8483A"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={330}
              />
            </svg>
          </div>
          <div
            className="aspect-square rounded-[3px] border"
            style={{ borderColor: 'rgba(50,42,32,.2)', background: 'linear-gradient(170deg,#D2D8B0,#889460 55%,#49502E)' }}
          />
        </div>
      </div>

      <h1
        className="animate-rise mt-[38px] font-display text-[40px] font-medium tracking-[-.01em]"
        style={{ animationDelay: '.25s' }}
      >
        This frame didn't develop.
      </h1>
      <p
        className="animate-rise mt-3 max-w-[42ch] text-base leading-relaxed"
        style={{ color: '#5C5344', animationDelay: '.35s' }}
      >
        The page you're after isn't on any of our contact sheets. It may have been moved, renamed, or never shot at all.
      </p>
      <div className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-3.5" style={{ animationDelay: '.45s' }}>
        <Link
          to="/"
          className="press rounded-full px-6 py-3 text-[14.5px] font-semibold"
          style={{ background: '#D23B2E', color: '#FFF6F0', boxShadow: '0 2px 0 rgba(36,31,24,.25)' }}
        >
          Back to the homepage
        </Link>
        <Link
          to="/generate"
          className="press rounded-full border px-[22px] py-3 text-[14.5px] font-semibold"
          style={{ background: '#FFFDF6', color: '#241F18', borderColor: 'rgba(50,42,32,.2)' }}
        >
          Open the studio
        </Link>
      </div>
      <p
        className="animate-rise mt-[26px] font-mono text-[11px]"
        style={{ color: '#8C8069', animationDelay: '.55s' }}
      >
        error 404 · no request left your browser while looking for it, obviously
      </p>
    </div>
  )
}
