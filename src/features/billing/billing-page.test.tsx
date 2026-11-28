import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { BillingPage } from './billing-page'

const patientId = '123e4567-e89b-42d3-a456-426614174000'
const organisationId = '523e4567-e89b-42d3-a456-426614174000'
const periodId = '623e4567-e89b-42d3-a456-426614174000'
const dateTime = '2026-11-03T15:00:00.000Z'
const owner = { patientId, organisationId }
const originalAdapter = axios.defaults.adapter

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 3, 10))
})

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  scope: typeof screen | ReturnType<typeof within>,
  label: string,
  option: string | RegExp,
) {
  const field = scope
    .getByText(label, { selector: '[data-slot=label]' })
    .closest('.billing-field') as HTMLElement
  await user.click(within(field).getByRole('button'))
  await user.click(await screen.findByRole('option', { name: option }))
}

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  axios.defaults.adapter = originalAdapter
  useAuthStore.getState().auth.reset()
})

it('completes the billing workflow through the authenticated UI and documented HTTP routes', async () => {
  let period: Record<string, unknown> | undefined
  let time: (Record<string, unknown> & { id: string; approvalStatus: string })[] = []
  const communications: Record<string, unknown>[] = []
  let monitoring: Record<string, unknown>[] = []
  const setup: Record<string, unknown>[] = []
  let complexity = false
  let eligibility: Record<string, unknown>[] = []
  let failCommunication = true
  const requests: {
    method?: string
    path?: string
    params?: unknown
    body?: Record<string, unknown>
  }[] = []

  function adapter(config: InternalAxiosRequestConfig) {
    expect(config.headers.Authorization).toBe('Bearer billing-test-token')
    const path = config.url
    const body = config.data ? (JSON.parse(config.data) as Record<string, unknown>) : undefined
    requests.push({ method: config.method, path, params: config.params, body })
    const ok = (data: unknown, status = 200) =>
      Promise.resolve({ status, statusText: 'OK', data, headers: {}, config })
    const patientPath = `/billing/patients/${patientId}`
    const totals = () => ({
      qualifyingMonitoringDays: monitoring.filter((day) => day.isQualifying).length,
      rpmApprovedMinutes: time.filter((entry) => entry.approvalStatus === 'approved').length * 20,
      ccmClinicalStaffMinutes: 0,
      ccmPhysicianQhpMinutes: 0,
      hasInteractiveCommunication: communications.some((entry) => entry.isInteractive),
      hasCompletedSetup: setup.some((entry) => entry.educationCompleted),
    })
    switch (`${config.method} ${path}`) {
      case `get /patients/org/${organisationId}`:
        return ok({
          patients: [
            {
              id: patientId,
              organisationId,
              firstName: 'Alex',
              lastName: 'Rivera',
              mrn: 'DEMO-42',
              isActive: true,
            },
          ],
        })
      case 'get /billing/cpt-codes':
        return ok({
          cptCodes: [{ code: '99457', category: 'RPM', description: 'RPM treatment management' }],
        })
      case 'get /billing/periods':
        return ok({ periods: period ? [period] : [] })
      case 'post /billing/periods':
        period = {
          ...owner,
          id: periodId,
          periodType: 'CALENDAR_MONTH',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          status: 'open',
          timezone: 'America/New_York',
        }
        return ok(period, 201)
      case `get /billing/periods/${periodId}`:
        return ok(period)
      case `patch /billing/periods/${periodId}/status`:
        period = { ...period, ...body }
        return ok(period)
      case `get ${patientPath}/summary`:
        return ok({ patientId, period, totals: totals(), eligibility })
      case `get ${patientPath}/eligibility`:
        return ok({
          eligibility: eligibility.filter(
            (entry) => !config.params.status || entry.status === config.params.status,
          ),
        })
      case `get ${patientPath}/time-entries`:
        return ok({
          timeEntries: time.filter(
            (entry) =>
              (!config.params.approvalStatus ||
                entry.approvalStatus === config.params.approvalStatus) &&
              (!config.params.serviceCategory ||
                entry.serviceCategory === config.params.serviceCategory),
          ),
        })
      case 'post /billing/time-entries': {
        const entry = {
          ...body,
          ...owner,
          id: `time-${time.length + 1}`,
          durationMinutes: 20,
          approvalStatus: 'pending',
        }
        time.push(entry)
        return ok(entry, 201)
      }
      case 'patch /billing/time-entries/time-1/review':
      case 'patch /billing/time-entries/time-2/review': {
        const id = path!.split('/')[3]
        time = time.map((entry) =>
          entry.id === id ? { ...entry, approvalStatus: String(body?.approvalStatus) } : entry,
        )
        return ok(time.find((entry) => entry.id === id))
      }
      case `get ${patientPath}/communications`:
        return ok({ communications })
      case 'post /billing/communications': {
        if (failCommunication) {
          failCommunication = false
          return Promise.reject(
            new AxiosError('unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 503,
              statusText: 'Unavailable',
              data: {},
              headers: {},
              config,
            }),
          )
        }
        const entry = { ...owner, ...body, id: 'communication-1' }
        communications.push(entry)
        return ok(entry, 201)
      }
      case `get ${patientPath}/monitoring-days`:
        return ok({ monitoringDays: monitoring })
      case 'post /billing/monitoring-days': {
        const entry = { ...owner, ...body, id: 'manual-day' }
        monitoring = [entry]
        return ok(entry, 201)
      }
      case `post ${patientPath}/monitoring-days/sync`: {
        const entry = {
          ...owner,
          id: 'synced-day',
          monitoringDate: '2026-11-05',
          isQualifying: true,
          qualifyingReadingsCount: 3,
          transmissionSource: 'smart_meter',
        }
        monitoring = [...monitoring, entry]
        return ok({ period, syncedDays: 1, days: [entry] })
      }
      case `get ${patientPath}/setup-records`:
        return ok({ setupRecords: setup })
      case 'post /billing/setup-records': {
        const entry = { ...owner, ...body, id: 'setup-1' }
        setup.push(entry)
        return ok(entry, 201)
      }
      case 'post /billing/complexity-records':
        complexity = Boolean(body?.documented)
        return ok({ ...body, id: 'complexity-1' }, 201)
      case `post ${patientPath}/evaluate`:
        eligibility = [
          {
            ...owner,
            billingPeriodId: periodId,
            id: 'result-1',
            cptCode: '99457',
            status: 'ELIGIBLE',
            calculatedValue: 20,
            reason: 'Criteria confirmed by service',
            requirements: {},
            missingRequirements: [],
            ruleVersion: '2026.1',
            evaluatedAt: dateTime,
          },
        ]
        return ok({
          ...owner,
          period,
          ruleVersion: '2026.1',
          inputs: { ...totals(), complexityDocumented: complexity, setupAlreadyBilled: false },
          results: eligibility,
        })
      case 'get /billing/reports/eligibility': {
        const rows = eligibility.filter(
          (entry) =>
            (!config.params.status || entry.status === config.params.status) &&
            (!config.params.cptCode || entry.cptCode === config.params.cptCode),
        )
        return ok({
          total: rows.length ? 26 : 0,
          page: config.params.page,
          pageSize: config.params.pageSize,
          rows: rows.map((entry) => ({
            ...entry,
            periodStart: period?.startDate,
            periodEnd: period?.endDate,
            periodType: period?.periodType,
          })),
        })
      }
      default:
        throw new Error(`Unexpected billing request: ${config.method} ${path}`)
    }
  }

  axios.defaults.adapter = adapter
  const auth = useAuthStore.getState().auth
  const billingUser = {
    id: 'billing-user',
    name: 'Billing user',
    email: 'billing@example.test',
    permissions: ['patients.read', 'billing.read', 'billing.create', 'billing.update'],
    role: { id: 'role', name: 'Administrator' },
    organisation: { id: organisationId, name: 'Test organization', status: 'active' },
  }
  auth.setUser(billingUser)
  auth.setAccessToken('billing-test-token')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <BillingPage />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  const tab = async (name: string) => user.click(await screen.findByRole('tab', { name }))
  const button = async (name: string) => user.click(await screen.findByRole('button', { name }))
  const modal = async (name: string) => within(await screen.findByRole('dialog', { name }))
  const submit = async (name: string) => {
    const dialog = await modal(name)
    await user.click(dialog.getByRole('button', { name }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name })).not.toBeInTheDocument())
  }

  await user.click(await screen.findByRole('button', { name: /Choose a patient/ }))
  await user.type(screen.getByRole('searchbox'), 'DEMO-42')
  await user.click(await screen.findByRole('option', { name: /Alex Rivera/ }))
  expect(
    await screen.findByText('Create a billing period to start recording evidence.'),
  ).toBeInTheDocument()
  await button('New period')
  const createPeriod = await modal('Create billing period')
  expect(createPeriod.getByRole('textbox', { name: 'Year' })).toHaveValue('2026')
  fireEvent.change(createPeriod.getByLabelText('Billing time zone'), {
    target: { value: 'America/New_York' },
  })
  await submit('Create billing period')
  expect(await screen.findByText('No eligibility results for this period yet.')).toBeInTheDocument()

  await tab('Clinical time')
  for (let index = 0; index < 2; index++) {
    await button('Log clinical time')
    const form = await modal('Log clinical time')
    await user.click(form.getByRole('button', { name: /Choose end time/i }))
    await user.click(await screen.findByRole('button', { name: /November 3, 2026/ }))
    const endHour = form.getByRole('spinbutton', { name: /hour.*end time/i })
    await user.click(endHour)
    await user.keyboard('10')
    const endMinute = form.getByRole('spinbutton', { name: /minute.*end time/i })
    await user.click(endMinute)
    await user.keyboard('20')
    if (index) {
      await choose(user, form, 'Service category', 'CCM')
      await choose(user, form, 'Care pathway', /Physician or qualified/)
    }
    await submit('Log clinical time')
  }
  const log = within(await screen.findByRole('grid', { name: 'Clinical time' }))
  await user.click(log.getAllByRole('button', { name: 'Approve' })[0]!)
  expect(await log.findByText('Approved')).toBeInTheDocument()
  await user.click(log.getByRole('button', { name: 'Reject' }))
  expect(await log.findByText('Rejected')).toBeInTheDocument()
  await choose(user, screen, 'Approval status', 'Approved')
  await waitFor(() =>
    expect(screen.getByRole('grid', { name: 'Clinical time' })).not.toHaveTextContent('Rejected'),
  )

  await tab('Communications')
  await button('Record communication')
  const communication = await modal('Record communication')
  await user.click(communication.getByLabelText('Interactive communication'))
  await user.type(communication.getByLabelText('Outcome'), 'Reached patient')
  await user.click(communication.getByRole('button', { name: 'Record communication' }))
  expect(await communication.findByRole('alert')).toHaveTextContent(
    'Billing is temporarily unavailable.',
  )
  expect(communication.getByLabelText('Outcome')).toHaveValue('Reached patient')
  await submit('Record communication')
  expect(await screen.findByText('Reached patient')).toBeInTheDocument()

  await tab('Monitoring days')
  await button('Record monitoring day')
  const day = await modal('Record monitoring day')
  await user.click(day.getByRole('button', { name: /Choose monitoring date/i }))
  await user.click(await screen.findByRole('button', { name: /November 4, 2026/ }))
  fireEvent.change(day.getByLabelText('Qualifying readings'), { target: { value: '2' } })
  await user.type(day.getByLabelText('Transmission source'), 'pylo')
  await user.click(day.getByLabelText('Qualifying monitoring day'))
  await submit('Record monitoring day')
  await button('Sync from readings')
  const monitoringTable = within(await screen.findByRole('grid', { name: 'Monitoring days' }))
  expect(await monitoringTable.findByRole('img', { name: 'SmartMeter' })).toHaveAttribute(
    'src',
    '/brands/smart-meter.png',
  )
  expect(monitoringTable.getByRole('img', { name: 'Pylo' })).toHaveAttribute(
    'src',
    '/brands/pylo.png',
  )

  await tab('Setup and complexity')
  await button('Record setup and education')
  const education = await modal('Record setup and education')
  await user.click(education.getByLabelText('Patient education completed'))
  await submit('Record setup and education')
  expect(
    await screen.findByRole('grid', { name: 'Setup and education records' }),
  ).toHaveTextContent('Yes')
  await button('Document complexity')
  const complexityForm = await modal('Save complexity documentation')
  await user.click(complexityForm.getByLabelText('Complexity documented'))
  await submit('Save complexity documentation')

  await button('Evaluate eligibility')
  const evaluation = await modal('Run eligibility check')
  await choose(user, evaluation, 'Evaluation scope', 'RPM')
  await submit('Run eligibility check')
  expect(await screen.findByText('Criteria confirmed by service')).toBeInTheDocument()
  const eligibilityTable = within(screen.getByRole('grid', { name: 'Patient eligibility' }))
  expect(
    eligibilityTable.getAllByRole('columnheader').map((heading) => heading.textContent),
  ).toEqual(['Code', 'Findings', 'Calculated value', 'Status', 'Evaluated'])
  expect(eligibilityTable.getByText('99457').closest('.billing-code')).toHaveTextContent('RPM')
  await button('Close period')
  expect(await screen.findByRole('button', { name: 'Reopen period' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Evaluate eligibility' })).toBeEnabled()
  await button('Reopen period')
  expect(await screen.findByRole('button', { name: 'Close period' })).toBeEnabled()

  for (const permissions of [
    ['billing.read', 'billing.create'],
    ['billing.read', 'billing.update'],
    ['billing.read', 'billing.delete'],
  ]) {
    act(() => auth.setUser({ ...billingUser, permissions: ['patients.read', ...permissions] }))
    const expectAction = (name: string, allowed: boolean) => {
      const action = screen.queryByRole('button', { name })
      if (allowed) expect(action).toBeEnabled()
      else expect(action).not.toBeInTheDocument()
    }
    expectAction('New period', permissions.includes('billing.create'))
    expectAction('Close period', permissions.includes('billing.update'))
    expectAction('Evaluate eligibility', false)
    await tab('Clinical time')
    expectAction('Log clinical time', permissions.includes('billing.create'))
    const timeTable = within(await screen.findByRole('grid', { name: 'Clinical time' }))
    const actionsColumn = timeTable.queryByRole('columnheader', { name: 'Actions' })
    if (permissions.includes('billing.update')) expect(actionsColumn).toBeInTheDocument()
    else expect(actionsColumn).not.toBeInTheDocument()
    await tab('Communications')
    expectAction('Record communication', permissions.includes('billing.create'))
    await tab('Monitoring days')
    expectAction('Sync from readings', false)
    expectAction('Record monitoring day', false)
    await tab('Setup and complexity')
    expectAction('Record setup and education', permissions.includes('billing.create'))
    expectAction('Document complexity', false)
  }

  await tab('Eligibility report')
  const report = within(await screen.findByRole('grid', { name: 'Eligibility report' }))
  expect(report.getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
    'Code',
    'Patient',
    'Finding',
    'Billing period',
    'Status',
    'Evaluated',
    'Actions',
  ])
  expect(report.getByTitle('Alex Rivera · DEMO-42')).toHaveClass('billing-report-text')
  expect(screen.getByRole('button', { name: /Eligibility status/ })).toBeInTheDocument()
  expect(screen.getByText('Eligibility status', { selector: '[data-slot=label]' })).toHaveClass(
    'sr-only',
  )
  await choose(user, screen, 'Eligibility status', 'Eligible')
  await screen.findByRole('grid', { name: 'Eligibility report' })
  await choose(user, screen, 'CPT code', /99457/)
  await button('Next page')
  expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
  await button('Open period')
  expect(await screen.findByRole('grid', { name: 'Patient eligibility' })).toHaveTextContent(
    '99457',
  )
  await tab('CPT catalog')
  const catalog = within(await screen.findByRole('grid', { name: 'CPT catalog' }))
  expect(catalog.getByText('RPM treatment management')).toBeInTheDocument()
  expect(catalog.getByRole('rowheader')).toHaveAccessibleName('99457 RPM')
  expect(catalog.queryByRole('columnheader', { name: 'Service category' })).not.toBeInTheDocument()

  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'post',
        path: '/billing/periods',
        body: {
          ...owner,
          periodType: 'CALENDAR_MONTH',
          yearMonth: '2026-11',
          timezone: 'America/New_York',
        },
      }),
      expect.objectContaining({
        path: `/billing/patients/${patientId}/time-entries`,
        params: expect.objectContaining({
          from: '2026-11-01T04:00:00.000Z',
          to: '2026-12-01T04:59:59.999Z',
          approvalStatus: 'approved',
          organisationId,
        }),
      }),
      expect.objectContaining({
        method: 'post',
        path: '/billing/time-entries',
        body: expect.objectContaining({ pathway: 'PHYSICIAN_QHP' }),
      }),
      expect.objectContaining({
        method: 'post',
        path: `/billing/patients/${patientId}/monitoring-days/sync`,
        body: { billingPeriodId: periodId, organisationId },
      }),
      expect.objectContaining({
        method: 'post',
        path: `/billing/patients/${patientId}/evaluate`,
        body: { billingPeriodId: periodId, organisationId, scope: 'rpm', syncMonitoring: true },
      }),
      expect.objectContaining({
        path: '/billing/reports/eligibility',
        params: { organisationId, status: 'ELIGIBLE', cptCode: '99457', page: 2, pageSize: 25 },
      }),
    ]),
  )
  expect(complexity).toBe(true)
  client.clear()
})

it('selects a rolling range and sends the selected patient organization for Super Admin', async () => {
  const auth = useAuthStore.getState().auth
  auth.setUser({
    id: 'admin',
    name: 'Billing admin',
    email: 'admin@example.test',
    permissions: ['patients.read', 'billing.read', 'billing.create'],
    role: { id: 'role', name: 'Super Admin' },
  })
  auth.setAccessToken('billing-test-token')
  let created: Record<string, unknown> | undefined
  axios.defaults.adapter = async (config) => {
    let data: unknown
    if (config.url === '/patients/')
      data = { patients: [{ id: patientId, organisationId, firstName: 'Alex', isActive: true }] }
    else if (config.url === '/billing/cpt-codes') data = { cptCodes: [] }
    else if (config.url === '/billing/periods' && config.method === 'get') {
      expect(config.params).toEqual({ patientId, organisationId })
      data = { periods: [] }
    } else if (config.url === '/billing/periods') {
      created = JSON.parse(config.data)
      data = { ...created, id: periodId, status: 'open' }
    } else if (config.url === `/billing/periods/${periodId}`) {
      data = { ...created, id: periodId, status: 'open' }
    } else if (config.url?.endsWith('/summary')) {
      data = {
        patientId,
        period: { ...created, id: periodId, status: 'open' },
        eligibility: [],
        totals: {
          ccmClinicalStaffMinutes: 0,
          ccmPhysicianQhpMinutes: 0,
          hasCompletedSetup: false,
          hasInteractiveCommunication: false,
          qualifyingMonitoringDays: 0,
          rpmApprovedMinutes: 0,
        },
      }
    } else if (config.url?.endsWith('/eligibility')) data = { eligibility: [] }
    else throw new Error(`Unexpected request ${config.url}`)
    return { data, status: 200, statusText: 'OK', config, headers: {} }
  }
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <BillingPage />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await waitFor(() => expect(screen.getByText('Choose a patient')).toBeInTheDocument())
  await choose(user, screen, 'Patient', 'Alex')
  await user.click(screen.getByRole('button', { name: 'New period' }))
  const modal = within(await screen.findByRole('dialog', { name: 'Create billing period' }))
  await choose(user, modal, 'Period type', 'Rolling 30 days')
  expect(created).toBeUndefined()
  await user.click(modal.getByRole('button', { name: /Choose billing dates/ }))
  await user.click(await screen.findByRole('button', { name: /November 3, 2026/ }))
  await user.click(
    document.querySelector<HTMLButtonElement>('.billing-calendar-popover button[slot=next]')!,
  )
  await user.click(await screen.findByRole('button', { name: /December 2, 2026/ }))
  await user.click(modal.getByRole('button', { name: 'Create billing period' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Create billing period' })).not.toBeInTheDocument(),
  )
  expect(created).toMatchObject({
    patientId,
    organisationId,
    periodType: 'ROLLING_30_DAY',
    startDate: '2026-11-03',
    endDate: '2026-12-02',
  })
  expect(created).not.toHaveProperty('yearMonth')
  client.clear()
})
