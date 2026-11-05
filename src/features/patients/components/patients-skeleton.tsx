import { translate as t, useAppTranslation } from '@/i18n'

export function PatientSkeletonBlock({ shape = 'line' }: { shape?: string }) {
  return <span className={`readings-skeleton-block patient-skeleton-${shape}`} />
}

export function PatientsSkeleton({ showOrganization }: { showOrganization: boolean }) {
  useAppTranslation()
  const columns = [
    'Patient',
    'MRN',
    'Date of birth',
    'Gender',
    'Contact',
    'Blood group',
    ...(showOrganization ? ['Organization'] : []),
    'Status',
    'Actions',
  ]
  return (
    <div role="status" aria-label={t('Loading patients')} className="readings-skeleton">
      <span className="sr-only">{t('Loading patients…')}</span>
      <div className="patient-table-scroll" aria-hidden="true">
        <table className="readings-table patient-roster-table patient-skeleton-table">
          <thead>
            <tr>
              {columns.map((label) => (
                <th key={label} scope="col">
                  {label === 'Actions' ? <span className="sr-only">{t(label)}</span> : t(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, index) => (
              <tr key={index}>
                <td>
                  <div className="patient-identity">
                    <PatientSkeletonBlock shape="avatar" />
                    <PatientSkeletonBlock shape="name" />
                  </div>
                </td>
                <td>
                  <PatientSkeletonBlock />
                </td>
                <td>
                  <div className="readings-skeleton-group">
                    <PatientSkeletonBlock shape="icon" />
                    <div className="readings-skeleton-stack">
                      <PatientSkeletonBlock />
                      <PatientSkeletonBlock shape="short" />
                    </div>
                  </div>
                </td>
                <td>
                  <PatientSkeletonBlock shape="short" />
                </td>
                <td>
                  <div className="patient-contact-cell">
                    <PatientSkeletonBlock shape="contact" />
                    <PatientSkeletonBlock />
                  </div>
                </td>
                <td>
                  <PatientSkeletonBlock shape="badge" />
                </td>
                {showOrganization && (
                  <td>
                    <PatientSkeletonBlock shape="name" />
                  </td>
                )}
                <td>
                  <PatientSkeletonBlock shape="badge" />
                </td>
                <td>
                  <PatientSkeletonBlock shape="button" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="readings-pagination" aria-hidden="true">
        <PatientSkeletonBlock shape="name" />
        <div className="readings-skeleton-group">
          <PatientSkeletonBlock shape="button" />
          <PatientSkeletonBlock />
          <PatientSkeletonBlock shape="icon" />
          <PatientSkeletonBlock shape="icon" />
        </div>
      </div>
    </div>
  )
}
