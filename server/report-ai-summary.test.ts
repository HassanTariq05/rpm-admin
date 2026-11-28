// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { handleReportAiSummary } from './report-ai-summary'

const input = {
  language: 'en',
  selectedDays: 7,
  groups: [
    {
      type: 'pulse_ox',
      recorded: 1,
      usable: 1,
      stats: { spo2: { min: 94, max: 94, mean: 94 } },
      counts: { low: 1 },
      points: [{ index: 1, day: 0, values: { spo2: 94 }, band: 'low' }],
    },
  ],
}
const request = (body: unknown = input) =>
  new Request('https://app.example/api/rpm-reading-summary', {
    method: 'POST',
    headers: { Authorization: 'Bearer app-session', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

afterEach(() => vi.unstubAllGlobals())

it('keeps the summary disabled without a key and rejects patient fields before contacting providers', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect((await handleReportAiSummary(request(), {})).status).toBe(503)
  expect(
    (await handleReportAiSummary(request({ ...input, mrn: 'MRN-123' }), { key: 'test-key' }))
      .status,
  ).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
})

it('validates the app session and sends only the reading payload to OpenAI', async () => {
  const output = {
    devices: [
      {
        group: 0,
        overview: 'One saturation reading was below the report range.',
        events: [{ index: 1, description: 'Recorded 94% saturation.' }],
      },
    ],
  }
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ user: { id: 'private-user', name: 'Private Name' } }))
    .mockResolvedValueOnce(
      Response.json({
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
      }),
    )
  vi.stubGlobal('fetch', fetch)
  const result = await handleReportAiSummary(request(), {
    key: 'test-key',
    authBase: 'https://auth.example/api',
  })
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual(output)
  expect(fetch.mock.calls[0]?.[0]).toBe('https://auth.example/api/auth/me')
  expect(fetch.mock.calls[0]?.[1].headers.Authorization).toBe('Bearer app-session')
  expect(fetch.mock.calls[1]?.[0]).toBe('https://api.openai.com/v1/responses')
  expect(fetch.mock.calls[1]?.[1].headers.Authorization).toBe('Bearer test-key')
  const providerBody = JSON.parse(fetch.mock.calls[1]?.[1].body)
  expect(providerBody.store).toBe(false)
  expect(JSON.parse(providerBody.input)).toEqual(input)
  expect(JSON.stringify(providerBody)).not.toMatch(/app-session|private-user|Private Name/)
})

it('stops before calling OpenAI when the app session is invalid', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetch)
  expect((await handleReportAiSummary(request(), { key: 'test-key' })).status).toBe(401)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('reports exhausted OpenAI credits without returning provider error details', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user: { id: 'test-user' } }))
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: 'credit_balance_exhausted',
              type: 'insufficient_quota',
              message: 'Internal billing details',
            },
          },
          { status: 429 },
        ),
      ),
  )
  const response = await handleReportAiSummary(request(), { key: 'test-key' })
  expect(response.status).toBe(429)
  expect(await response.json()).toEqual({ error: 'credit_balance_exhausted' })
})
