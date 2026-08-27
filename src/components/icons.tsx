// Custom inline icons — no emoji, consistent stroke weight, currentColor.

export function StarIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="1em"
      height="1em"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.76 5.6 6.18.9-4.47 4.36 1.05 6.15L12 17.9l-5.52 2.9 1.05-6.15L3.06 9.1l6.18-.9L12 2.6z" />
    </svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
