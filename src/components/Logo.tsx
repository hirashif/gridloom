/** The loom mark: four frames on a contact sheet with a wax-red loop circling
 *  the keeper. Ink parts follow currentColor; the loop is constant accent red.
 *  Transcribed from design/Gridloom Studio.dc.html (32–38). */
export default function Logo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="overflow-visible text-ink"
    >
      <rect x="2" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="15.5" y="2" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="15.5" width="10.5" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="15.5" y="15.5" width="10.5" height="10.5" rx="2.5" fill="currentColor" />
      <path
        d="M21.2 15.2 C 27.5 16.5, 28.5 24.5, 21.5 26.2 C 14.5 27.8, 12.5 21, 16 17.5 C 18 15.5, 20 14.8, 22.5 15.6"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
