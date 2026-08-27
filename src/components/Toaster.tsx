import { Toaster as SonnerToaster } from 'sonner'

/**
 * The studio toast: a dark ink pill, bottom-center, with a hand-drawn gold check
 * (Caveat) beside the message. Styled to match design/Gridloom Studio.dc.html (~65).
 * The lib/toast.ts API is untouched — this only restyles the surface.
 */
export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      gap={8}
      duration={3000}
      icons={{
        success: <span className="font-hand text-[17px] leading-none text-tape">✓</span>,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'pointer-events-auto flex items-center gap-2.5 rounded-full bg-[#2A241C] px-[22px] py-[11px] text-[13.5px] font-medium text-[#F2ECDE] font-sans shadow-[0_12px_30px_-8px_rgba(0,0,0,.4)]',
          icon: 'flex items-center',
          error: 'text-[#F2ECDE]',
        },
      }}
    />
  )
}
