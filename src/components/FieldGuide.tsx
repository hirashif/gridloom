import { Dialog } from '@base-ui-components/react/dialog'
import { CloseIcon } from './icons'

/** Numbered step: a Caveat index in accent red beside body copy. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-[22px] flex-none font-hand text-xl text-accent">{n}.</span>
      <span>{children}</span>
    </div>
  )
}

/**
 * The field guide: a two-minute orientation, opened from the "?" in the chrome.
 * Content transcribed verbatim from design/Gridloom Studio.dc.html (69–89):
 * three numbered steps, a four-note grid (costs / knobs / seeds / backup), and
 * the ⌘⏎ footer. Base UI Dialog, matching the app's other dialogs.
 */
export default function FieldGuide({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px] animate-fade-in" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[84vh] w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] bg-paper2 p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,.5)] animate-pop sm:px-9">
        <Dialog.Close
          aria-label="Close"
          className="press absolute right-4 top-3.5 rounded p-0.5 text-faint hover:text-ink"
        >
          <CloseIcon className="text-lg" />
        </Dialog.Close>

        <div className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-accent">FIELD GUIDE</div>
        <Dialog.Title className="mb-4 mt-1.5 font-display text-[26px] font-medium">
          Two minutes, then you're dangerous.
        </Dialog.Title>

        <div className="flex flex-col gap-3.5 text-[13.5px] leading-relaxed text-muted">
          <Step n={1}>
            <strong className="text-ink">Add a key</strong> (Settings → Key vault). fal.ai gets you nine models on
            one key. Keys live in this browser only. We have no server to send them to.
          </Step>
          <Step n={2}>
            <strong className="text-ink">Generate</strong> is for one careful image;{' '}
            <strong className="text-ink">Compare</strong> runs one prompt across every model and seed at once. The
            grid is where you find the winner. Mark it with your pen.
          </Step>
          <Step n={3}>
            <strong className="text-ink">Keep what works.</strong> Everything auto-saves to the Library with full
            settings. A setup worth repeating? Save it as a Recipe and re-run it in one click.
          </Step>
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-dashed border-[rgba(var(--hair),.25)] pt-3.5 text-xs text-muted">
          <div>
            <strong className="text-ink">Costs.</strong> You pay providers directly, $0.003 to $0.07 an image. Every
            run shows its price before you press the button.
          </div>
          <div>
            <strong className="text-ink">Knobs vary by model.</strong> FLUX dev exposes steps + guidance; others
            manage them internally. Hidden ≠ missing.
          </div>
          <div>
            <strong className="text-ink">Seeds = repeatability.</strong> Same prompt + model + seed ≈ same image.
            Fix a seed to iterate on wording; sweep seeds to explore.
          </div>
          <div>
            <strong className="text-ink">Back up.</strong> Your library lives in this browser. Settings → Export
            everything gives you a portable zip.
          </div>
        </div>

        <div className="mt-4 text-center font-mono text-[10.5px] text-faint">
          ⌘⏎ runs the current view · full docs coming with v1.0
        </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
