import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  darkMode: boolean
  sidebarOpen: boolean
  toggleDarkMode: () => void
  setDarkMode: (darkMode: boolean) => void
  setSidebar: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: true,
      sidebarOpen: true,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (darkMode) => set({ darkMode }),
      setSidebar: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'studymate-ui' }
  )
)
