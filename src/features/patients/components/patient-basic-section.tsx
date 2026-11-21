import { useId, type ReactNode } from 'react'
import { translate as t } from '@/i18n'

export function PatientBasicSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section className="patient-basic-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="patient-basic-heading">
        {t(title)}
      </h3>
      {children}
    </section>
  )
}
