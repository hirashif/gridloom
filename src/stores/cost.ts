import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CostState {
  totalUsd: number
  byModel: Record<string, number>
  startedAt: number
  addCost: (modelId: string, usd: number) => void
  reset: () => void
}

export const useSessionCost = create<CostState>()(
  persist(
    (set) => ({
      totalUsd: 0,
      byModel: {},
      startedAt: Date.now(),
      addCost: (modelId, usd) =>
        set((s) => ({
          totalUsd: s.totalUsd + usd,
          byModel: { ...s.byModel, [modelId]: (s.byModel[modelId] ?? 0) + usd },
        })),
      reset: () => set({ totalUsd: 0, byModel: {}, startedAt: Date.now() }),
    }),
    { name: 'gridloom-session-cost' },
  ),
)

export function formatUsd(usd: number): string {
  if (usd > 0 && usd < 0.05) return `$${usd.toFixed(3).replace(/0$/, '')}` // $0.003, $0.025, but $0.01 not $0.010
  return `$${usd.toFixed(2)}`
}
