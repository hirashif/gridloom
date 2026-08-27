import { useCombobox } from 'downshift'
import { useState } from 'react'
import { cn } from '../../lib/ui'

/**
 * Tag adder: a downshift combobox over the tags table. Selecting an option
 * (or pressing Enter on free text) adds the tag; the input then clears.
 */
export default function TagCombobox({
  options,
  exclude = [],
  onAdd,
}: {
  options: string[]
  exclude?: string[]
  onAdd: (name: string) => void
}) {
  const [input, setInput] = useState('')
  const excluded = new Set(exclude.map((t) => t.toLowerCase()))
  const filtered = options.filter(
    (t) => !excluded.has(t.toLowerCase()) && t.toLowerCase().includes(input.trim().toLowerCase()),
  )

  const cb = useCombobox<string>({
    items: filtered,
    inputValue: input,
    selectedItem: null,
    onInputValueChange: ({ inputValue }) => setInput(inputValue ?? ''),
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onAdd(selectedItem)
        setInput('')
      }
    },
  })

  return (
    <div className="relative">
      <label {...cb.getLabelProps({ className: 'sr-only' })}>Add a tag</label>
      <input
        {...cb.getInputProps({
          placeholder: 'add tag',
          onKeyDown: (e) => {
            if (e.key === 'Enter' && cb.highlightedIndex < 0 && input.trim()) {
              onAdd(input.trim())
              setInput('')
            }
          },
        })}
        className="w-24 rounded-full border border-dashed border-[rgba(var(--hair),.25)] bg-transparent px-2 py-0.5 font-mono text-[11px] text-ink placeholder:text-ph focus:border-accent focus:outline-none"
      />
      <ul
        {...cb.getMenuProps()}
        className={cn(
          'absolute left-0 top-full z-20 mt-1 max-h-40 w-40 overflow-y-auto rounded-lg border border-[rgba(var(--hair),.2)] bg-card py-1 shadow-[0_16px_36px_-14px_rgba(30,22,10,.35)]',
          (!cb.isOpen || filtered.length === 0) && 'hidden',
        )}
      >
        {cb.isOpen &&
          filtered.map((item, index) => (
            <li
              key={item}
              {...cb.getItemProps({ item, index })}
              className={cn(
                'cursor-pointer px-2.5 py-1 font-mono text-xs text-ink',
                cb.highlightedIndex === index && 'bg-chip-on',
              )}
            >
              {item}
            </li>
          ))}
      </ul>
    </div>
  )
}
