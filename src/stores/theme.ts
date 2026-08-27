import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

function apply(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-gl-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-gl-theme')
  }
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggle: () =>
        set((s) => {
          const next: Theme = s.theme === 'light' ? 'dark' : 'light'
          apply(next)
          return { theme: next }
        }),
    }),
    {
      name: 'gridloom-theme',
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.theme)
      },
    },
  ),
)
