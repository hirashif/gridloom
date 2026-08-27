import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cva, type VariantProps } from 'class-variance-authority'

/** Merge class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const buttonVariants = cva(
  'press inline-flex items-center justify-center gap-1.5 rounded-full font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      intent: {
        primary: 'bg-accent text-white hover:bg-accent-hover',
        secondary: 'border border-[rgba(var(--hair),.2)] bg-chip text-ink hover:bg-chip-on',
        ghost: 'text-muted hover:text-ink',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'px-3 py-1 text-xs',
        md: 'px-4 py-1.5 text-sm',
        lg: 'px-5 py-2 text-sm',
      },
    },
    defaultVariants: { intent: 'secondary', size: 'md' },
  },
)

export const inputVariants = cva(
  'w-full rounded-lg border border-[rgba(var(--hair),.18)] bg-paper2 px-3 py-1.5 text-sm text-ink placeholder:text-ph transition-colors focus:border-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
  {
    variants: {
      tone: {
        default: '',
        mono: 'font-mono',
        error: 'border-danger',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

export { cva, type VariantProps }

// Human-readable labels for provider-native enum values.

const IMAGE_SIZE_LABELS: Record<string, string> = {
  square_hd: 'Square HD · 1024×1024',
  square: 'Square · 512×512',
  portrait_4_3: 'Portrait · 768×1024',
  portrait_16_9: 'Portrait · 576×1024',
  landscape_4_3: 'Landscape · 1024×768',
  landscape_16_9: 'Landscape · 1024×576',
}

const STYLE_LABELS: Record<string, string> = {
  realistic_image: 'Realistic photo',
  digital_illustration: 'Illustration',
  vector_illustration: 'Vector art',
}

export function humanizeParamValue(key: string, value: string): string {
  if (key === 'image_size') return IMAGE_SIZE_LABELS[value] ?? value.replaceAll('_', ' ')
  if (key === 'style') return STYLE_LABELS[value] ?? value.replaceAll('_', ' ')
  return value.replaceAll('_', ' ')
}

/** Client-generated seeds stay well inside Number.MAX_SAFE_INTEGER so
 *  "re-roll same seed" is always exact (fal can return uint64 seeds that JS mangles). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647)
}
