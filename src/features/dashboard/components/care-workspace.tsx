import { useRef, type CSSProperties } from 'react'
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  MonitorSmartphone,
  Search,
} from 'lucide-react'
import { translate as t } from '@/i18n'
import { careQueue, type CarePatient } from '../data/concepts.mock-data'
import { useDashboardDemo } from '../dashboard-demo'
import { Avatar, DirectoryLink, PanelHeading, Pill, Sparkline } from './dashboard-shared'
export function CareFollowUp({ view = 'rows' }: { view?: 'rows' | 'cards' | 'table' }) {
  const preview = useRef<HTMLElement>(null)
  const { state, dispatch } = useDashboardDemo()
  const { careFilter: filter, careQuery: query, reviewed } = state
  const selected = careQueue.find((patient) => patient.id === state.patientId) ?? careQueue[0]
  const filtered = careQueue.filter(
    (p) =>
      (filter === 'all' || p.kind === filter) &&
      `${p.name} ${t(p.issue)}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  function selectPatient(patient: CarePatient) {
    dispatch({ type: 'patch', values: { patientId: patient.id } })
    if (window.matchMedia('(max-width: 900px)').matches)
      preview.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
  }
  return (
    <div className={`dash-care-grid dash-care-view-${view}`}>
      <section className="dash-panel dash-queue">
        <PanelHeading title="Patient follow-up" description="A focused queue for the care team">
          <Pill tone="rose">
            {t('{{count}} pending', { count: careQueue.length - reviewed.length })}
          </Pill>
        </PanelHeading>
        <div className="dash-queue-tools">
          <div className="dash-segment" role="group" aria-label={t('Filter follow-up queue')}>
            {[
              { value: 'all', text: 'All patients' },
              { value: 'clinical', text: 'Reading alerts' },
              { value: 'missed', text: 'Missed readings' },
            ].map((f) => (
              <button
                type="button"
                key={f.value}
                aria-pressed={filter === f.value}
                onClick={() =>
                  dispatch({ type: 'patch', values: { careFilter: f.value as typeof filter } })
                }
              >
                {t(f.text)}
              </button>
            ))}
          </div>
          <label className="dash-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => dispatch({ type: 'patch', values: { careQuery: e.target.value } })}
              placeholder={t('Find a patient…')}
              aria-label={t('Search patients')}
            />
          </label>
        </div>
        {view === 'table' ? (
          <div className="dash-table-scroll">
            <table className="dash-clinical-table" aria-label={t('Patient follow-up')}>
              <thead>
                <tr>
                  <th>{t('Patient')}</th>
                  <th>{t('Latest reading')}</th>
                  <th>{t('Reading alerts')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.id} className={selected.id === patient.id ? 'is-selected' : ''}>
                    <td>
                      <button
                        type="button"
                        aria-pressed={selected.id === patient.id}
                        onClick={() => selectPatient(patient)}
                      >
                        <Avatar initials={patient.initials} tone="blue" />
                        <span>
                          <strong>{patient.name}</strong>
                          <small>{t(patient.condition)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <strong>{patient.reading}</strong>
                      <small>
                        {patient.unit} · {t(patient.last)}
                      </small>
                    </td>
                    <td>{t(patient.issue)}</td>
                    <td>
                      <Pill
                        tone={
                          reviewed.includes(patient.id)
                            ? 'teal'
                            : patient.kind === 'clinical'
                              ? 'rose'
                              : 'amber'
                        }
                      >
                        {t(reviewed.includes(patient.id) ? 'Reviewed' : patient.severity)}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="dash-empty">{t('No patients match your search.')}</div>
            )}
          </div>
        ) : (
          <div className="dash-patient-list">
            {filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`dash-patient-row ${selected.id === p.id ? 'is-selected' : ''}`}
                aria-pressed={selected.id === p.id}
                onClick={() => selectPatient(p)}
              >
                <Avatar initials={p.initials} tone={p.kind === 'clinical' ? 'rose' : 'amber'} />
                <span className="dash-patient-main">
                  <strong>{p.name}</strong>
                  <small>{t(p.issue)}</small>
                </span>
                <span className="dash-queue-reading">
                  <strong>
                    {p.reading} <small>{p.unit}</small>
                  </strong>
                  <small>{t(p.last)}</small>
                </span>
                <span className="dash-queue-status">
                  <Pill
                    tone={
                      reviewed.includes(p.id) ? 'teal' : p.kind === 'clinical' ? 'rose' : 'amber'
                    }
                  >
                    {reviewed.includes(p.id) ? (
                      <>
                        <Check size={11} />
                        {t('Reviewed')}
                      </>
                    ) : (
                      t(p.severity)
                    )}
                  </Pill>
                </span>
                {view === 'cards' && (
                  <span className="dash-patient-card-trend" aria-hidden="true">
                    <Sparkline values={p.history} label="Last seven readings" />
                  </span>
                )}
                <ChevronRight size={15} className="dash-muted" />
              </button>
            ))}
            {!filtered.length && (
              <div className="dash-empty">{t('No patients match your search.')}</div>
            )}
          </div>
        )}
        <div className="dash-panel-footer">
          <span>{t('Select a patient to preview their readings.')}</span>
          <DirectoryLink to="/patients">{t('Patient directory')}</DirectoryLink>
        </div>
      </section>
      <aside
        ref={preview}
        className="dash-patient-preview dash-panel"
        aria-label={t('Patient reading preview')}
      >
        <div className="dash-preview-top">
          <span>{t('Patient snapshot')}</span>
          <Pill tone={reviewed.includes(selected.id) ? 'teal' : 'rose'}>
            {t(reviewed.includes(selected.id) ? 'Reviewed' : 'Needs review')}
          </Pill>
        </div>
        <div className="dash-preview-name">
          <Avatar initials={selected.initials} tone="violet" />
          <div>
            <h2>{selected.name}</h2>
            <p>
              {t(selected.condition)}
              <span>{selected.id}</span>
            </p>
          </div>
        </div>
        <div className="dash-reading-focus">
          <span>{t('Latest reading')}</span>
          <strong>
            {selected.reading}
            <small>{selected.unit}</small>
          </strong>
          <Sparkline values={selected.history} label="Last seven readings" />
          <span className="dash-reading-time">
            <Clock3 size={13} />
            {t(selected.last)}
          </span>
        </div>
        <p className="dash-preview-note">{t(selected.note)}</p>
        <dl className="dash-preview-meta">
          <div>
            <dt>{t('Device')}</dt>
            <dd>{selected.device}</dd>
          </div>
          <div>
            <dt>{t('Care team')}</dt>
            <dd>{t(selected.team)}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="dash-primary-button"
          disabled={reviewed.includes(selected.id)}
          onClick={() => dispatch({ type: 'review', id: selected.id })}
        >
          <CheckCheck size={16} />
          {t(reviewed.includes(selected.id) ? 'Reviewed' : 'Mark reviewed')}
        </button>
      </aside>
    </div>
  )
}

export function MonitoringCoverage() {
  return (
    <div className="dash-care-bottom">
      <section className="dash-panel dash-coverage">
        <div className="dash-coverage-ring" style={{ '--ring-value': '91%' } as CSSProperties}>
          <span>
            <strong>
              91<span>%</span>
            </strong>
            <small>{t('Reporting')}</small>
          </span>
        </div>
        <div>
          <h2>{t('Today’s monitoring coverage')}</h2>
          <p>{t('1,168 patients have sent a reading. 116 are still expected.')}</p>
          <div className="dash-legend">
            <span>
              <i className="dash-dot teal" />
              {t('Reading received')}
            </span>
            <span>
              <i className="dash-dot muted" />
              {t('Awaiting reading')}
            </span>
          </div>
        </div>
      </section>
      <section className="dash-panel dash-next-step">
        <span className="dash-step-icon">
          <MonitorSmartphone size={23} />
        </span>
        <div>
          <h2>{t('Close the onboarding gap')}</h2>
          <p>{t('12 patients have a delivered device but no first reading.')}</p>
          <DirectoryLink to="/devices">
            {t('Open device inventory')}
            <ArrowRight size={13} />
          </DirectoryLink>
        </div>
      </section>
    </div>
  )
}
