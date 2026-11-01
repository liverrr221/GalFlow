import { useCallback } from 'react'
import { useUiStore } from '../store/useUiStore'
import {
  translate,
  type Language,
  type TranslationKey,
} from './translations'

export type TranslationParams = Record<string, string | number>

export function currentLanguage(): Language {
  return useUiStore.getState().language
}

export function tCurrent(
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  return translate(currentLanguage(), key, params)
}

export function useI18n() {
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)
  const t = useCallback(
    (key: TranslationKey, params: TranslationParams = {}) =>
      translate(language, key, params),
    [language],
  )

  return { language, setLanguage, t }
}

export type { Language, TranslationKey }
