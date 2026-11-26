import { lazy, Suspense } from 'react'
import { translate as t, useAppTranslation } from '@/i18n'

const PatientNotesEditor = lazy(() =>
  import('./patient-notes-editor').then((module) => ({ default: module.PatientNotesEditor })),
)

export function PatientDoctorNotes() {
  useAppTranslation()

  return (
    <section
      aria-label={t("Doctor's Notes")}
      className="patient-report-notes min-w-0 rounded-xl border border-border bg-surface p-4"
    >
      <h3 className="mb-2 text-sm font-semibold text-foreground">{t("Doctor's Notes")}</h3>
      <Suspense
        fallback={
          <p role="status" className="text-sm text-muted">
            {t('Loading editor…')}
          </p>
        }
      >
        <PatientNotesEditor label="Doctor's Notes" showLabel={false} />
      </Suspense>
    </section>
  )
}
