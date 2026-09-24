import { createContext, useContext, useMemo, useState } from 'react'
import en, { type Dictionary } from './locales/en'
import sw from './locales/sw'
import type { Language } from '@/types'

const dictionaries: Record<Language, Dictionary> = { en, sw }

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: Dictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('lambert_language') as Language) || 'en'
  )

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('lambert_language', lang)
  }

  const value = useMemo(
    () => ({ language, setLanguage, t: dictionaries[language] }),
    [language]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
