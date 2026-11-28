import { Button } from '@heroui/react'
import { Tags } from 'lucide-react'
import type { usePatientIcd10 } from '@/hooks/use-patient-icd10'
import { translate as t, useAppTranslation } from '@/i18n'

export function PatientIcd10Tags({ query }: { query: ReturnType<typeof usePatientIcd10> }) {
  useAppTranslation()
  return (
    <section aria-label={t('ICD-10')} className="min-w-0 space-y-2">
      <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Tags size={16} className="admin-icon-violet" aria-hidden="true" />
        {t('ICD-10')}
      </h4>
      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('Loading ICD-10 codes…')}
        </p>
      )}
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
          <p>{t('Could not load patient ICD-10 codes.')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            isPending={query.isFetching}
            onPress={() => void query.refetch()}
          >
            {t('Try again')}
          </Button>
        </div>
      )}
      {query.isSuccess && !query.data.length && (
        <p className="text-sm text-muted">{t('No ICD-10 codes assigned.')}</p>
      )}
      {!!query.data?.length && (
        <ul className="flex flex-wrap gap-2">
          {query.data.map(({ code, description, category }) => (
            <li
              key={code}
              className="max-w-full rounded-lg border border-border bg-surface px-2.5 py-1 text-xs wrap-anywhere"
            >
              <strong className="admin-icon-violet">{code}</strong>
              {description && <span className="ms-2 text-foreground">{description}</span>}
              {category && <span className="ms-2 text-muted">· {category}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
