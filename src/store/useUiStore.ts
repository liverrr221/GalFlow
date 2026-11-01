import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '../i18n/translations'

export const UI_STORAGE_KEY = 'galflow:ui:v1'

interface UiState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: 'zh',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ language: state.language }),
    },
  ),
)
