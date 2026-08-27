import { m, useReducedMotion } from 'motion/react'
import { usePen } from '../stores/pen'

export type PenVariant = 'grease-pencil' | 'red-dot' | 'washi-tape' | 'marker-star' | 'stamp' | 'paint-check'

/** The grease-pencil ellipse, transcribed from the design's contact-sheet cell mark. */
const GREASE_PATH =
  'M50 8 C 82 4, 98 24, 94 52 C 90 82, 60 98, 32 92 C 8 86, 0 60, 8 36 C 16 14, 34 6, 62 8'
/** The paint-check tick, same coordinates the design uses. */
const CHECK_PATH = 'M22 55 L 42 76 L 84 24'

/**
 * The winner mark: the photographer's pen on the keeper frame. Six pens, each an
 * absolutely-positioned overlay sized to its parent frame. Draw-in strokes
 * (grease pencil, paint check) animate via motion's pathLength; the pop-in pens
 * (dot, tape, star, stamp) use the pop keyframe. Everything renders instantly
 * when animation is off or motion is reduced, and a mono label keeps color from
 * being the only signal. Markup transcribed from design/Gridloom Studio.dc.html
 * (animated forms 303–308, static forms 382–387).
 */
export function WinnerMark({
  variant,
  animate = true,
  label = true,
  className,
}: {
  variant?: PenVariant
  animate?: boolean
  label?: boolean
  className?: string
}) {
  const storePen = usePen((s) => s.pen)
  const pen = variant ?? storePen
  const reducedMotion = useReducedMotion()
  const draw = animate && !reducedMotion

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 ${className ?? ''}`}
    >
      <Mark pen={pen} draw={draw} />
      {label && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 translate-y-full font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-mark">
          keeper
        </span>
      )}
    </div>
  )
}

/** The pen itself, without the wrapper/label — shared by the overlay and the previews. */
function Mark({ pen, draw }: { pen: PenVariant; draw: boolean }) {
  switch (pen) {
    case 'grease-pencil':
      return (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          {draw ? (
            <m.path
              d={GREASE_PATH}
              fill="none"
              stroke="var(--mark)"
              strokeWidth={3.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.3, 1] }}
            />
          ) : (
            <path d={GREASE_PATH} fill="none" stroke="var(--mark)" strokeWidth={3.5} strokeLinecap="round" />
          )}
        </svg>
      )
    case 'red-dot':
      return (
        <span
          className={`absolute -right-2 -top-2 h-[22px] w-[22px] rounded-full ${draw ? 'animate-pop' : ''}`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #FF7A5C, #D9301B 70%)',
            boxShadow: '0 2px 5px rgba(120,20,0,.45)',
          }}
        />
      )
    case 'washi-tape':
      return (
        <span
          className={`absolute -left-[10px] top-[3px] -rotate-[9deg] px-[10px] py-[3px] font-mono text-[8.5px] font-semibold tracking-[0.08em] ${
            draw ? 'animate-pop' : ''
          }`}
          style={{
            background: '#FBE38A',
            color: '#5C4A12',
            boxShadow: '0 2px 5px rgba(60,40,0,.3)',
            opacity: 0.94,
          }}
        >
          KEEP
        </span>
      )
    case 'marker-star':
      return (
        <span
          className={`absolute bottom-[34px] right-1 -rotate-[6deg] font-hand text-[32px] leading-none text-mark ${
            draw ? 'animate-pop' : ''
          }`}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,.3)' }}
        >
          ★
        </span>
      )
    case 'stamp':
      return (
        <span
          className={`absolute left-0 top-[36%] -rotate-[11deg] rounded-[3px] border-2 px-[7px] py-[3px] font-mono text-[10px] font-semibold tracking-[0.1em] ${
            draw ? 'animate-pop' : ''
          }`}
          style={{ borderColor: 'rgba(232,72,58,.85)', color: 'rgba(232,72,58,.9)' }}
        >
          WINNER
        </span>
      )
    case 'paint-check':
      return (
        <svg
          viewBox="0 0 100 100"
          className="absolute"
          style={{ top: 12, right: 12, bottom: 40, left: 12 }}
        >
          {draw ? (
            <m.path
              d={CHECK_PATH}
              fill="none"
              stroke="#FFF3E8"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.4))' }}
            />
          ) : (
            <path
              d={CHECK_PATH}
              fill="none"
              stroke="#FFF3E8"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.4))' }}
            />
          )}
        </svg>
      )
  }
}

/** A pen rendered over a small placeholder frame — used by Settings' pen picker
 *  (step 6) with zero new markup. Static (no draw-in) so the picker sits still. */
function makePreview(pen: PenVariant): React.FC {
  return function PenPreview() {
    return (
      <span className="relative inline-block h-11 w-11 shrink-0 rounded-[5px] bg-chip-on ring-1 ring-[rgba(var(--hair),.14)]">
        <Mark pen={pen} draw={false} />
      </span>
    )
  }
}

export const PEN_VARIANTS: { id: PenVariant; label: string; Preview: React.FC }[] = [
  { id: 'grease-pencil', label: 'Grease pencil', Preview: makePreview('grease-pencil') },
  { id: 'red-dot', label: 'Red dot', Preview: makePreview('red-dot') },
  { id: 'washi-tape', label: 'Washi tape', Preview: makePreview('washi-tape') },
  { id: 'marker-star', label: 'Marker star', Preview: makePreview('marker-star') },
  { id: 'stamp', label: 'Stamp', Preview: makePreview('stamp') },
  { id: 'paint-check', label: 'Paint check', Preview: makePreview('paint-check') },
]
