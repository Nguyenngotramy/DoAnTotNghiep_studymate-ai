import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  darkMode: boolean
  sidebarOpen: boolean
  toggleDarkMode: () => void
  setSidebar: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: true,
      sidebarOpen: true,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setSidebar: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'studymate-ui' }
  )
)