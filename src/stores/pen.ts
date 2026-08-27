import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PenVariant } from '../components/WinnerMark'

interface PenState {
  pen: PenVariant
  setPen: (p: PenVariant) => void
}

export const usePen = create<PenState>()(
  persist(
    (set) => ({
      pen: 'grease-pencil',
      setPen: (pen) => set({ pen }),
    }),
    { name: 'gridloom-pen' },
  ),
)
