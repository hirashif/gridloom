import { Dialog } from '@base-ui-components/react/dialog'
import { ReactCompareSlider, ReactCompareSliderHandle, ReactCompareSliderImage } from 'react-compare-slider'
import { getModel } from '../../lib/models'
import { formatUsd } from '../../stores/cost'
import { useBlobUrls } from './use-blob-urls'

export interface CompareFrame {
  imageId: string
  modelId: string
  seed: number | null
  costUsd: number
}

function caption(frame: CompareFrame): string {
  const name = getModel(frame.modelId)?.name ?? frame.modelId
  const seed = frame.seed !== null ? `seed ${frame.seed}` : 'no seed'
  return `${name} · ${seed} · ${formatUsd(frame.costUsd)}`
}

/** A/B slider comparison of two finished frames. Keyboard: arrow keys move the handle. */
export default function CompareDialog({
  a,
  b,
  onClose,
}: {
  a: CompareFrame
  b: CompareFrame
  onClose: () => void
}) {
  const urls = useBlobUrls([a.imageId, b.imageId])
  const urlA = urls[a.imageId]
  const urlB = urls[b.imageId]

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[rgba(var(--hair),.16)] bg-card p-5 shadow-[0_40px_80px_-24px_rgba(0,0,0,.45)] animate-pop">
          <Dialog.Title className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            A / B · two frames
          </Dialog.Title>
          <div className="mt-3 max-h-[70vh] overflow-hidden rounded-lg bg-white p-1.5 shadow-[0_10px_28px_-14px_rgba(60,48,24,.5)]">
            {urlA && urlB ? (
              <ReactCompareSlider
                className="overflow-hidden rounded-[4px]"
                itemOne={<ReactCompareSliderImage src={urlA} alt={caption(a)} />}
                itemTwo={<ReactCompareSliderImage src={urlB} alt={caption(b)} />}
                handle={
                  <ReactCompareSliderHandle
                    buttonStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      boxShadow: 'none',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                    }}
                    linesStyle={{ background: 'var(--accent)', boxShadow: 'none', width: 2 }}
                  />
                }
              />
            ) : (
              <div className="shimmer-cell aspect-square w-full rounded-[4px]" />
            )}
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-4 font-mono text-[11px] text-faint">
            <span>{caption(a)}</span>
            <span className="text-right">{caption(b)}</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
