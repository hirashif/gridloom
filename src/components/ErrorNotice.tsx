import { Link } from 'react-router-dom'
import { AppError } from '../lib/errors'
import { buttonVariants, cn } from '../lib/ui'

export default function ErrorNotice({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger/25 bg-danger-soft p-4 text-sm">
      <p className="font-medium text-danger">{error.message}</p>
      {error.hint && <p className="mt-1 text-danger/80">{error.hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {(error.code === 'invalid_key' || error.code === 'billing_required') && (
          <Link to="/settings" className={cn(buttonVariants({ intent: 'danger' }))}>
            Open Settings
          </Link>
        )}
        {onRetry && error.code !== 'invalid_key' && (
          <button type="button" onClick={onRetry} className={cn(buttonVariants({ intent: 'secondary' }))}>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
