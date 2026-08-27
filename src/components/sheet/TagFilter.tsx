import { useCombobox } from 'downshift'
import { useState } from 'react'
import type { Tag } from '../../lib/types'
import { cn, inputVariants } from '../../lib/ui'
import { CloseIcon } from '../icons'

/** Library tag filter: a downshift combobox over the tags table (single select). */
export default function TagFilter({
  tags,
  value,
  onChange,
}: {
  tags: Tag[]
  value: string
  onChange: (tagId: string) => void
}) {
  const [input, setInput] = useState('')
  const selected = tags.find((t) => t.id === value) ?? null
  const filtered = tags.filter((t) => t.name.includes(input.trim().toLowerCase()))

  const cb = useCombobox<Tag>({
    items: filtered,
    itemToString: (t) => t?.name ?? '',
    selectedItem: selected,
    inputValue: input,
    onInputValueChange: ({ inputValue }) => setInput(inputValue ?? ''),
    onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem?.id ?? ''),
    onIsOpenChange: ({ isOpen }) => {
      // Reopening with a selection shows the full list, not a one-item filter.
      if (isOpen) setInput('')
    },
  })

  return (
    <div className="relative">
      <label {...cb.getLabelProps({ className: 'sr-only' })}>Filter by tag</label>
      <div className="relative w-36">
        <input
          {...cb.getInputProps({ placeholder: 'all tags' })}
          className={cn(inputVariants(), 'rounded-full py-1.5 pr-7 font-mono text-xs')}
        />
        {selected && (
          <button
            type="button"
            aria-label="Clear tag filter"
            onClick={() => {
              onChange('')
              setInput('')
              cb.selectItem(null)
            }}
            className="press absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-ink"
          >
            <CloseIcon className="text-xs" />
          </button>
        )}
      </div>
      <ul
        {...cb.getMenuProps()}
        className={cn(
          'absolute left-0 top-full z-20 mt-1 max-h-48 w-36 overflow-y-auto rounded-lg border border-[rgba(var(--hair),.2)] bg-card py-1 shadow-[0_16px_36px_-14px_rgba(30,22,10,.35)]',
          (!cb.isOpen || filtered.length === 0) && 'hidden',
        )}
      >
        {cb.isOpen &&
          filtered.map((item, index) => (
            <li
              key={item.id}
              {...cb.getItemProps({ item, index })}
              className={cn(
                'cursor-pointer px-2.5 py-1 font-mono text-xs text-ink',
                cb.highlightedIndex === index && 'bg-chip-on',
                selected?.id === item.id && 'font-semibold',
              )}
            >
              {item.name}
            </li>
          ))}
      </ul>
    </div>
  )
}
