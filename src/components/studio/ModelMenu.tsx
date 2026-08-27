import { Popover } from '@base-ui-components/react/popover'
import { Select } from '@base-ui-components/react/select'
import { CaretDown, Check } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { MODELS, PROVIDERS, type ModelDef } from '../../lib/models'
import type { ProviderId } from '../../lib/types'
import { useSettings } from '../../stores/settings'
import { formatUsd } from '../../stores/cost'
import { cn, inputVariants } from '../../lib/ui'

/**
 * The shared model picker — one component, two shapes. Used by Compare (multi,
 * rows = models) and Generate (single, one model). Grouped by provider with mono
 * headers; models from providers with no key render dimmed with an "add in
 * Settings" note; a registry footer counts what's on offer. The max-6 cap for
 * Compare is enforced by the caller via `disabledUnchecked`, not here.
 * Structure transcribed from design/Gridloom Studio.dc.html (compare 258–270,
 * generate 120–131).
 */

const PROVIDER_ORDER: ProviderId[] = ['fal', 'gemini', 'openai']

interface ProviderGroup {
  id: ProviderId
  name: string
  keyed: boolean
  models: ModelDef[]
}

function useGroups(): ProviderGroup[] {
  const apiKeys = useSettings((s) => s.apiKeys)
  return PROVIDER_ORDER.map((id) => ({
    id,
    name: PROVIDERS[id].name,
    keyed: Boolean(apiKeys[id]),
    models: MODELS.filter((m) => m.provider === id),
  })).filter((g) => g.models.length > 0)
}

const registryLabel = `${MODELS.length} models · ${PROVIDER_ORDER.length} providers`

function costLabel(model: ModelDef, keyed: boolean): string {
  return keyed ? `${formatUsd(model.priceUsd)}/img` : 'no key — add in Settings'
}

type ModelMenuProps =
  | {
      mode: 'single'
      value: string[]
      onChange: (ids: string[]) => void
      disabled?: boolean
      id?: string
      className?: string
    }
  | {
      mode: 'multi'
      value: string[]
      onChange: (ids: string[]) => void
      disabled?: boolean
      /** When true, unchecked rows are disabled — the caller's cap (six max) is hit. */
      disabledUnchecked?: boolean
      className?: string
    }

export default function ModelMenu(props: ModelMenuProps) {
  return props.mode === 'single' ? <SingleMenu {...props} /> : <MultiMenu {...props} />
}

/** Base UI Select — Generate's one-model dropdown. `value` is an array of one. */
function SingleMenu({
  value,
  onChange,
  disabled,
  id,
  className,
}: Extract<ModelMenuProps, { mode: 'single' }>) {
  const groups = useGroups()
  const current = value[0] ?? ''
  return (
    <Select.Root
      items={MODELS.map((m) => ({ value: m.id, label: m.name }))}
      value={current}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange([next])
      }}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        className={cn(
          inputVariants(),
          'flex items-center justify-between gap-2 rounded-full text-left',
          className,
        )}
      >
        <Select.Value className="truncate font-medium" />
        <Select.Icon className="flex shrink-0 text-faint">
          <CaretDown weight="light" className="size-3.5" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} className="z-[70] outline-none">
          <Select.Popup className="max-h-[min(22rem,var(--available-height))] w-[max(var(--anchor-width),18rem)] overflow-y-auto rounded-xl border border-[rgba(var(--hair),.25)] bg-card p-[7px] shadow-[0_24px_48px_-16px_rgba(30,22,10,.35)] animate-rise">
            {groups.map((group) => (
              <Select.Group key={group.id}>
                <GroupHeader name={group.name} keyed={group.keyed} />
                {group.models.map((model) => (
                  <Select.Item
                    key={model.id}
                    value={model.id}
                    disabled={!group.keyed}
                    className={cn(
                      'flex cursor-default items-center justify-between gap-2 rounded-[7px] px-[10px] py-2 text-sm data-highlighted:bg-chip-on',
                      !group.keyed && 'opacity-45',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Select.ItemIndicator className="flex w-3 text-accent">
                        <Check weight="bold" className="size-3" />
                      </Select.ItemIndicator>
                      <Select.ItemText className="font-medium text-ink">{model.name}</Select.ItemText>
                    </span>
                    <span className="font-mono text-[10px] text-faint">{costLabel(model, group.keyed)}</span>
                  </Select.Item>
                ))}
              </Select.Group>
            ))}
            <RegistryFooter note="list updates itself · free" />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

/** Base UI Popover with a checkbox list — Compare's multi-model picker. */
function MultiMenu({
  value,
  onChange,
  disabled,
  disabledUnchecked,
  className,
}: Extract<ModelMenuProps, { mode: 'multi' }>) {
  const groups = useGroups()
  const selected = new Set(value)
  const count = value.length
  const countLabel = count === 1 ? '1 model' : `${count} models`

  function toggle(model: ModelDef) {
    if (selected.has(model.id)) {
      onChange(value.filter((v) => v !== model.id))
    } else {
      onChange([...value, model.id])
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        disabled={disabled}
        className={cn(
          'press inline-flex items-center gap-2 rounded-full border border-[rgba(var(--hair),.18)] bg-paper2 px-4 py-[9px] text-[13px] font-semibold text-ink hover:border-accent disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
      >
        {countLabel}
        <CaretDown weight="light" className="size-3 text-faint" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-[70] outline-none">
          <Popover.Popup className="max-h-[21rem] w-[20.5rem] overflow-y-auto rounded-xl border border-[rgba(var(--hair),.25)] bg-card p-[7px] shadow-[0_24px_48px_-16px_rgba(30,22,10,.35)] animate-rise">
            {groups.map((group) => (
              <div key={group.id}>
                <GroupHeader name={group.name} keyed={group.keyed} />
                {group.models.map((model) => {
                  const checked = selected.has(model.id)
                  const rowDisabled = !group.keyed || (Boolean(disabledUnchecked) && !checked)
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      disabled={rowDisabled}
                      onClick={() => toggle(model)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-[7px] px-[10px] py-2 text-left text-sm hover:bg-chip-on',
                        checked && 'bg-chip-on',
                        rowDisabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-[13px] shrink-0 items-center justify-center rounded-[3px] border',
                            checked ? 'border-accent bg-accent text-white' : 'border-[rgba(var(--hair),.3)]',
                          )}
                        >
                          {checked && <Check weight="bold" className="size-2.5" />}
                        </span>
                        <span className="font-medium text-ink">{model.name}</span>
                      </span>
                      <span className="font-mono text-[10px] text-faint">{costLabel(model, group.keyed)}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            <RegistryFooter note="rows = models · six max" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function GroupHeader({ name, keyed }: { name: string; keyed: boolean }) {
  return (
    <div className="flex items-baseline justify-between px-[10px] pb-1 pt-2">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">{name}</span>
      <span className="font-mono text-[9px] text-faint">{keyed ? 'key ✓' : 'no key'}</span>
    </div>
  )
}

function RegistryFooter({ note }: { note: string }) {
  return (
    <div className="mx-1 mb-0.5 mt-1.5 flex items-center justify-between gap-3 border-t border-dashed border-[rgba(var(--hair),.2)] px-1.5 pb-1 pt-2 font-mono text-[9.5px] text-faint">
      <Link to="/settings" className="hover:text-ink">
        {registryLabel}
      </Link>
      <span>{note}</span>
    </div>
  )
}
