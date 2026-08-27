import { AlertDialog } from '@base-ui-components/react/alert-dialog'
import { buttonVariants } from '../../lib/ui'

/**
 * Portaled confirm dialog on the Base UI AlertDialog primitive: focus trap,
 * Escape, scroll lock, and focus restore come for free.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-ink/30 animate-fade-in" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[rgba(var(--hair),.25)] bg-card p-5 animate-scale-in">
          <AlertDialog.Title className="text-sm font-semibold text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {body}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className={buttonVariants({ intent: 'ghost' })}>
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={buttonVariants({ intent: destructive ? 'danger' : 'primary' })}
            >
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
