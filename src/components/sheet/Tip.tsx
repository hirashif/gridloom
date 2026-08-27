import { Tooltip } from '@base-ui-components/react/tooltip'
import type * as React from 'react'

/**
 * Base UI tooltip wrapper replacing raw title= attributes.
 * The child element becomes the trigger via the render prop.
 */
export default function Tip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement<Record<string, unknown>>
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-[60]">
          <Tooltip.Popup className="max-w-60 rounded-md border border-[rgba(var(--hair),.25)] bg-card px-2 py-1 text-xs text-muted animate-fade-in">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
