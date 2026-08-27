import { db } from './db'
import { getModel } from './models'
import { formatUsd } from '../stores/cost'
import { usePen } from '../stores/pen'
import type { PenVariant } from '../components/WinnerMark'

export interface ExportCell {
  modelId: string
  seed: number
  imageId?: string
  starred?: boolean
}

// The sheet palette, in sync with the light-print tokens in src/index.css.
const PAPER = '#F3EFE6'
const INK = '#241F18'
const FAINT = '#A89C82'
const MUTED = '#8A7C5E'
const LINE = '#B7B1A2'
const MARK = '#E8483A'
const TAPE = '#FBE38A'
const MUNT = '#5C4A12'
const mono = (size: number, weight = 400) => `${weight} ${size}px "JetBrains Mono", ui-monospace, monospace`
const hand = (size: number) => `400 ${size}px "Caveat", cursive`

/**
 * Draws the photographer's pen on a keeper frame — the same six pens the live
 * sheet offers, ported to canvas. `x,y,w,h` is the image rectangle. Marks that
 * draw in on screen (grease pencil, paint check) are rendered as finished
 * strokes here; the pop-in pens (dot, tape, star, stamp) are drawn in place.
 */
export function drawPenMark(ctx: CanvasRenderingContext2D, variant: PenVariant, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.save()
  switch (variant) {
    case 'grease-pencil': {
      // Two slightly-offset imperfect ellipses — the chinagraph double-loop.
      ctx.strokeStyle = MARK
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.9
      const rx = w * 0.46
      const ry = h * 0.42
      ctx.lineWidth = Math.max(5, w * 0.016)
      ctx.beginPath()
      ctx.ellipse(cx - 4, cy + 3, rx, ry, -0.06, -0.4, Math.PI * 2 - 0.15)
      ctx.stroke()
      ctx.lineWidth = Math.max(3, w * 0.009)
      ctx.beginPath()
      ctx.ellipse(cx + 3, cy - 2, rx * 0.985, ry * 1.02, 0.05, 0.3, Math.PI * 2 + 0.2)
      ctx.stroke()
      break
    }
    case 'red-dot': {
      // A wax binder dot in the top-right corner.
      const r = w * 0.075
      const dx = x + w - r * 0.4
      const dy = y + r * 0.4
      const grad = ctx.createRadialGradient(dx - r * 0.3, dy - r * 0.35, r * 0.1, dx, dy, r)
      grad.addColorStop(0, '#FF7A5C')
      grad.addColorStop(0.7, '#D9301B')
      grad.addColorStop(1, '#D9301B')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(dx, dy, r, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'washi-tape': {
      // A strip of gold tape, slightly angled and translucent, reading KEEP.
      ctx.translate(x + w * 0.06, y + h * 0.1)
      ctx.rotate((-9 * Math.PI) / 180)
      ctx.globalAlpha = 0.94
      const tw = w * 0.34
      const th = h * 0.09
      ctx.fillStyle = TAPE
      ctx.fillRect(-tw * 0.12, 0, tw, th)
      ctx.globalAlpha = 1
      ctx.fillStyle = MUNT
      ctx.font = mono(th * 0.55, 600)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('KEEP', -tw * 0.12 + tw / 2, th / 2)
      break
    }
    case 'marker-star': {
      // A hand-drawn star, Caveat's ★, wax-red in the lower-right.
      ctx.translate(x + w * 0.82, y + h * 0.78)
      ctx.rotate((-6 * Math.PI) / 180)
      ctx.fillStyle = MARK
      ctx.font = hand(w * 0.28)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,.3)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1
      ctx.fillText('★', 0, 0)
      break
    }
    case 'stamp': {
      // A bordered WINNER stamp, tilted.
      ctx.translate(x + w * 0.08, y + h * 0.42)
      ctx.rotate((-11 * Math.PI) / 180)
      ctx.font = mono(w * 0.05, 600)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const label = 'WINNER'
      const padX = w * 0.02
      const padY = w * 0.014
      const tw = ctx.measureText(label).width
      const th = w * 0.05
      ctx.strokeStyle = 'rgba(232,72,58,.85)'
      ctx.lineWidth = Math.max(2, w * 0.007)
      ctx.strokeRect(0, 0, tw + padX * 2, th + padY * 2)
      ctx.fillStyle = 'rgba(232,72,58,.9)'
      ctx.fillText(label, padX, padY + th / 2 + w * 0.006)
      break
    }
    case 'paint-check': {
      // A thick white check with a soft shadow, centered.
      ctx.strokeStyle = '#FFF3E8'
      ctx.lineWidth = Math.max(6, w * 0.024)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = 'rgba(0,0,0,.4)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1
      // Same proportions as the design's 100×100 path (22,55 → 42,76 → 84,24), inset.
      const px = (fx: number) => x + w * 0.12 + (w * 0.76) * (fx / 100)
      const py = (fy: number) => y + h * 0.12 + (h * 0.76) * (fy / 100)
      ctx.beginPath()
      ctx.moveTo(px(22), py(55))
      ctx.lineTo(px(42), py(76))
      ctx.lineTo(px(84), py(24))
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

/**
 * Renders a grid run as a marked-up contact sheet: title strip, frame numbers,
 * edge codes, and the keeper marked with the user's chosen pen. Always exports
 * on the paper tone — the artifact should be recognizably a Gridloom sheet.
 */
export async function exportComposite(opts: {
  prompt: string
  modelIds: string[]
  seeds: number[]
  cells: ExportCell[]
  credit: boolean
}): Promise<void> {
  // Canvas text needs the webfonts resolved before the first fillText.
  await document.fonts.ready
  const pen = usePen.getState().pen

  const CELL = 440
  const GAP = 14
  const GUTTER_LEFT = 170
  const HEADER = 84
  const COL_HEAD = 40
  const FRAME_STRIP = 30
  const PAD = 36
  const FOOTER = 46

  const cols = opts.seeds.length
  const rows = opts.modelIds.length
  const rowH = CELL + FRAME_STRIP
  const width = PAD + GUTTER_LEFT + cols * CELL + (cols - 1) * GAP + PAD
  const height = PAD + HEADER + COL_HEAD + rows * rowH + (rows - 1) * GAP + FOOTER + PAD

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)

  // Header strip: running head + prompt slug + date
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = FAINT
  ctx.font = mono(16, 500)
  const dateStr = new Date().toISOString().slice(0, 10)
  ctx.fillText(`GRIDLOOM · CONTACT SHEET · ${dateStr}`, PAD, PAD + 16)
  ctx.fillStyle = INK
  ctx.font = mono(24, 500)
  const maxSlug = width - PAD * 2
  let body = opts.prompt
  // Remove one char at a time until the quoted+ellipsized string fits (guaranteed to terminate).
  while (body.length > 4 && ctx.measureText(`“${body}…”`).width > maxSlug) {
    body = body.slice(0, -1)
  }
  const slugStr = body === opts.prompt ? `“${opts.prompt}”` : `“${body.trimEnd()}…”`
  ctx.fillText(slugStr, PAD, PAD + 52)

  // "this sheet" total, hand-annotated top-right (completed frames only).
  const sheetTotal = opts.cells.reduce((sum, c) => {
    if (!c.imageId) return sum
    const model = getModel(c.modelId)
    return sum + (model?.priceUsd ?? 0)
  }, 0)
  ctx.fillStyle = MARK
  ctx.font = hand(30)
  ctx.textAlign = 'right'
  ctx.fillText(`this sheet: ${formatUsd(sheetTotal)}`, width - PAD, PAD + 30)
  ctx.textAlign = 'left'

  // header rule
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, PAD + HEADER - 6)
  ctx.lineTo(width - PAD, PAD + HEADER - 6)
  ctx.stroke()

  const gridTop = PAD + HEADER + COL_HEAD

  // Column headers (seeds)
  ctx.fillStyle = FAINT
  ctx.font = mono(17, 500)
  ctx.textAlign = 'center'
  opts.seeds.forEach((seed, c) => {
    const x = PAD + GUTTER_LEFT + c * (CELL + GAP) + CELL / 2
    ctx.fillText(`SEED ${seed}`, x, gridTop - COL_HEAD / 2)
  })

  // Row labels (models) — mono short + cost-each, matching the on-screen rail.
  ctx.textAlign = 'left'
  opts.modelIds.forEach((modelId, r) => {
    const model = getModel(modelId)
    const y = gridTop + r * (rowH + GAP) + CELL / 2
    ctx.fillStyle = INK
    ctx.font = mono(20, 500)
    ctx.fillText(model?.short ?? model?.name ?? modelId, PAD, y - 13, GUTTER_LEFT - 24)
    if (model) {
      ctx.fillStyle = FAINT
      ctx.font = mono(16)
      ctx.fillText(`${formatUsd(model.priceUsd)}/img`, PAD, y + 14, GUTTER_LEFT - 24)
    }
  })

  // Cells
  for (const cell of opts.cells) {
    const r = opts.modelIds.indexOf(cell.modelId)
    const c = opts.seeds.indexOf(cell.seed)
    if (r < 0 || c < 0) continue
    const x = PAD + GUTTER_LEFT + c * (CELL + GAP)
    const y = gridTop + r * (rowH + GAP)
    // Frame stamp matches the sheet's column-only "s41" scheme.
    const frameNo = `s${41 + c}`

    if (!cell.imageId) {
      ctx.fillStyle = '#E7DEC4'
      ctx.fillRect(x, y, CELL, CELL)
      ctx.fillStyle = FAINT
      ctx.font = mono(16)
      ctx.textAlign = 'center'
      ctx.fillText('—', x + CELL / 2, y + CELL / 2)
      ctx.textAlign = 'left'
    } else {
      const rec = await db.imageBlobs.get(cell.imageId)
      if (rec) {
        const bmp = await createImageBitmap(rec.blob)
        const scale = Math.max(CELL / bmp.width, CELL / bmp.height)
        const sw = CELL / scale
        const sh = CELL / scale
        ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, x, y, CELL, CELL)
        bmp.close()
      }
      // film-frame keyline
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.75, y + 0.75, CELL - 1.5, CELL - 1.5)
    }

    // frame strip below the image
    ctx.fillStyle = FAINT
    ctx.font = mono(15, 500)
    ctx.textAlign = 'left'
    ctx.fillText(frameNo, x + 2, y + CELL + FRAME_STRIP / 2 + 2)
    if (cell.starred) {
      ctx.fillStyle = MARK
      ctx.textAlign = 'right'
      ctx.font = mono(14, 600)
      ctx.fillText('K E E P E R', x + CELL - 2, y + CELL + FRAME_STRIP / 2 + 2)
      ctx.textAlign = 'left'
      // the user's pen, on the keeper frame
      drawPenMark(ctx, pen, x, y, CELL, CELL)
    }
  }

  // Footer
  const footerY = height - PAD - FOOTER / 2
  ctx.fillStyle = MUTED
  ctx.font = mono(16)
  ctx.textAlign = 'left'
  const shot = opts.cells.filter((c) => c.imageId).length
  ctx.fillText(`${shot} frames · ${rows} models × ${cols} seeds`, PAD, footerY)
  if (opts.credit) {
    ctx.fillStyle = FAINT
    ctx.textAlign = 'right'
    ctx.fillText('made with gridloom.app', width - PAD, footerY)
    ctx.textAlign = 'left'
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Export failed')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gridloom-sheet-${Date.now()}.png`
  a.click()
  URL.revokeObjectURL(url)
}
