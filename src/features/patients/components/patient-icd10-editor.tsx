import { useEffect, useState } from 'react'
import { Button, SearchField } from '@heroui/react'
import { Check, ChevronLeft, ChevronRight, Plus, Tags, X } from 'lucide-react'
import {
  useIcd10Catalog,
  type PatientIcd10Change,
  type usePatientIcd10,
} from '@/hooks/use-patient-icd10'
import { translate as t, useAppTranslation } from '@/i18n'

export function PatientIcd10Editor({
  associations,
  changes,
  onChange,
  busy,
  canRemoveLinked,
}: {
  associations: ReturnType<typeof usePatientIcd10>
  changes: PatientIcd10Change[]
  onChange: (changes: PatientIcd10Change[]) => void
  busy: boolean
  canRemoveLinked: boolean
}) {
  useAppTranslation()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ q: '', page: 1, pageSize: 20 })
  const q = search.trim()
  const waitingForSearch = filters.q !== q
  useEffect(() => {
    if (filters.q === q) return
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, q, page: 1 }))
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [filters.q, q])

  const catalog = useIcd10Catalog(filters)
  const linked = associations.data ?? []
  const linkedCodes = new Set(linked.map(({ code }) => code))
  const selected = [
    ...linked.filter(
      ({ code }) => !changes.some((change) => change.type === 'remove' && change.code === code),
    ),
    ...changes.flatMap((change) =>
      change.type === 'add' && !linkedCodes.has(change.code.code) ? [change.code] : [],
    ),
  ]
  const selectedCodes = new Set(selected.map(({ code }) => code))
  const isLocked = busy || associations.isLoading || (associations.isError && !associations.data)
  const page = catalog.data
  const canShowResults = !waitingForSearch && !!page

  return (
    <div className="grid min-w-0 items-start gap-5 md:grid-cols-2">
      <section className="min-w-0 space-y-3" aria-label={t('ICD-10 catalog')}>
        <SearchField
          value={search}
          onChange={setSearch}
          aria-label={t('Search ICD-10 codes')}
          isDisabled={busy}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault()
          }}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('Search by code, description, or category')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {(waitingForSearch || catalog.isLoading) && (
          <p role="status" className="text-sm text-muted">
            {t('Loading ICD-10 codes…')}
          </p>
        )}
        {!waitingForSearch && catalog.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
            <p>{t('Could not load the ICD-10 catalog.')}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              isPending={catalog.isFetching}
              onPress={() => void catalog.refetch()}
            >
              {t('Try again')}
            </Button>
          </div>
        )}
        {canShowResults && (
          <>
            {page.codes.length ? (
              <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain">
                {page.codes.map((entry) => {
                  const chosen = selectedCodes.has(entry.code)
                  return (
                    <li
                      key={entry.code}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <div className="min-w-0 text-sm wrap-anywhere">
                        <strong className="admin-icon-violet">{entry.code}</strong>
                        <span className="ms-2">{entry.description}</span>
                        {entry.category && (
                          <p className="mt-0.5 text-xs text-muted">{entry.category}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isIconOnly
                        aria-label={t(chosen ? '{{code}} selected' : 'Add {{code}}', {
                          code: entry.code,
                        })}
                        isDisabled={isLocked || chosen}
                        className="shrink-0"
                        onPress={() => {
                          const remaining = changes.filter(
                            (change) => change.type !== 'remove' || change.code !== entry.code,
                          )
                          onChange(
                            linkedCodes.has(entry.code)
                              ? remaining
                              : [...remaining, { type: 'add', code: entry }],
                          )
                        }}
                      >
                        {chosen ? (
                          <Check size={16} aria-hidden="true" />
                        ) : (
                          <Plus size={16} aria-hidden="true" />
                        )}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('No matching ICD-10 codes.')}</p>
            )}
            {page.total > page.pageSize && (
              <div className="flex items-center justify-between gap-2 text-sm text-muted">
                <span>
                  {t('Page {{page}} of {{total}}', {
                    page: page.page,
                    total: Math.ceil(page.total / page.pageSize),
                  })}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isIconOnly
                    aria-label={t('Previous page')}
                    isDisabled={busy || page.page <= 1}
                    onPress={() => setFilters({ ...filters, page: page.page - 1 })}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isIconOnly
                    aria-label={t('Next page')}
                    isDisabled={busy || page.page * page.pageSize >= page.total}
                    onPress={() => setFilters({ ...filters, page: page.page + 1 })}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <section
        aria-label={t('Selected ICD-10 codes')}
        className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-muted p-4"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Tags size={17} className="admin-icon-violet" aria-hidden="true" />
          {t('Selected ICD-10 codes')}
        </h3>
        {associations.isLoading && (
          <p role="status" className="text-sm text-muted">
            {t('Loading ICD-10 codes…')}
          </p>
        )}
        {associations.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
            <p>{t('Could not load patient ICD-10 codes.')}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              isPending={associations.isFetching}
              onPress={() => void associations.refetch()}
            >
              {t('Try again')}
            </Button>
          </div>
        )}
        {!selected.length && !associations.isLoading && !associations.isError && (
          <p className="text-sm text-muted">{t('No ICD-10 codes selected.')}</p>
        )}
        <ul className="space-y-2">
          {selected.map((entry) => (
            <li
              key={entry.code}
              className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0 text-sm wrap-anywhere">
                <strong className="admin-icon-violet">{entry.code}</strong>
                <span className="ms-2">{entry.description}</span>
                <p className="mt-1 text-xs text-muted">
                  {t('Category')}: {entry.category || '—'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label={t('Remove {{code}}', { code: entry.code })}
                isDisabled={isLocked || (linkedCodes.has(entry.code) && !canRemoveLinked)}
                className="shrink-0"
                onPress={() =>
                  onChange(
                    linkedCodes.has(entry.code)
                      ? [...changes, { type: 'remove', code: entry.code }]
                      : changes.filter(
                          (change) => change.type !== 'add' || change.code.code !== entry.code,
                        ),
                  )
                }
              >
                <X size={16} className="text-danger" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
