import { useEffect, type ReactNode } from 'react'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Dropdown } from '@heroui/react'
import { Languages, Check, ChevronDown } from 'lucide-react'
import i18n, { languageStorageKey, locale, translate } from './index'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n: current } = useTranslation()
  const language = current.resolvedLanguage === 'es' ? 'es' : 'en'
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = 'ltr'
    document.title = translate('Remote Patient Monitoring')
    try {
      localStorage.setItem(languageStorageKey, language)
    } catch {
      /* Session-only preference when storage is blocked. */
    }
  }, [language])
  return <I18nProvider locale={locale()}>{children}</I18nProvider>
}

export function LanguagePicker() {
  const { i18n: current, t } = useTranslation()
  const language = current.resolvedLanguage === 'es' ? 'es' : 'en'
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={t('Choose language')}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-foreground hover:bg-surface-muted"
      >
        <Languages size={16} aria-hidden="true" />
        <span lang={language}>{language === 'es' ? 'Español' : 'English'}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={t('Language')}>
          {(
            [
              { id: 'en', label: 'English' },
              { id: 'es', label: 'Español' },
            ] as const
          ).map((item) => (
            <Dropdown.Item
              key={item.id}
              id={item.id}
              textValue={item.label}
              onAction={() => {
                void i18n.changeLanguage(item.id)
              }}
            >
              <span lang={item.id}>{item.label}</span>
              {language === item.id && <Check size={14} aria-label={t('Selected')} />}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
