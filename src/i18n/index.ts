import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'

export type AppLanguage = 'en' | 'es'
export const languageStorageKey = 'rpm-language'
export function savedLanguage(): AppLanguage {
  try {
    return localStorage.getItem(languageStorageKey) === 'es' ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: savedLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
})

export function locale() {
  return i18n.resolvedLanguage === 'es' ? 'es' : 'en-US'
}

// Translate display text only. Unknown text and non-string React children stay intact.
// English source keys make API enum labels reusable without changing stored values.
export function translate<T>(value: T, options?: Record<string, unknown>): T {
  if (typeof value !== 'string' || !value.trim()) return value
  const key = value.trim()
  const translated = i18n.t(key, { defaultValue: key, ...options })
  return value.replace(key, () => String(translated)) as T
}
export function useAppTranslation() {
  return useTranslation()
}
export function dateFormatter(options: Intl.DateTimeFormatOptions) {
  return {
    format: (date: Date | number) => new Intl.DateTimeFormat(locale(), options).format(date),
  }
}
export function numberFormatter(options?: Intl.NumberFormatOptions) {
  return { format: (number: number) => new Intl.NumberFormat(locale(), options).format(number) }
}
export default i18n
