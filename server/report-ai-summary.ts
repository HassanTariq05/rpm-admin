import { z } from 'zod'
import {
  matchesReportInput,
  maxSummaryRequestBytes,
  reportAiInputSchema,
  reportAiOutputSchema,
} from '../src/features/patients/report-ai-summary-contract.js'

interface SummaryConfig {
  key?: string
  model?: string
  authBase?: string
}

const defaultAuthBase = 'https://rl9otvtzf6.execute-api.eu-north-1.amazonaws.com/api'
const instructions = [
  'Draft a short remote patient monitoring summary for a licensed clinician to review.',
  'Use only the supplied structured observations. Do not infer a diagnosis, cause, prognosis, treatment, urgency or patient characteristics.',
  'Describe measured trends, counts, and exceptions. Report categories are chart labels, not individualized targets.',
  'Statistics and counts cover all usable readings; points may be a subset. Acknowledge important missing or unusable readings.',
  'Return one device entry for each group, using its zero-based group index. Event indices must come from that group’s supplied points.',
  'Use at most three noteworthy events per group, and include the measured value and unit in each description.',
  'Do not guess or mention actual dates, relative days, indices, identities, or device brands in prose. The app supplies event dates.',
  'Units: systolic/diastolic mmHg, pulse bpm, glucose mg/dL, spo2 %, weightKg kg, celsius °C.',
  'Write concise plain text in Spanish if language is es and in English otherwise.',
].join(' ')

const providerResponse = z.object({
  status: z.literal('completed'),
  output: z.array(
    z.object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
})

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function readInput(request: Request) {
  if (Number(request.headers.get('content-length')) > maxSummaryRequestBytes) return null
  const reader = request.body?.getReader()
  if (!reader) return null

  const decoder = new TextDecoder()
  let bytes = 0
  let body = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxSummaryRequestBytes) {
        await reader.cancel()
        return null
      }
      body += decoder.decode(value, { stream: true })
    }
    const result = reportAiInputSchema.safeParse(JSON.parse(body + decoder.decode()))
    return result.success ? result.data : null
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

export async function handleReportAiSummary(request: Request, config: SummaryConfig) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  }
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
  if (!config.key?.trim()) return json({ error: 'unconfigured' }, 503)

  const input = await readInput(request)
  if (!input) return json({ error: 'invalid_readings' }, 400)

  try {
    const authBase = (config.authBase || defaultAuthBase).replace(/\/+$/, '')
    const session = await fetch(`${authBase}/auth/me`, {
      headers: { Authorization: authorization },
      redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8_000)]),
    })
    if (session.status === 401 || session.status === 403) {
      return json({ error: 'unauthorized' }, session.status)
    }
    if (!session.ok) return json({ error: 'auth_unavailable' }, 502)
    const identity = z
      .object({ user: z.object({ id: z.string().min(1) }) })
      .safeParse(await session.json())
    if (!identity.success) return json({ error: 'unauthorized' }, 401)

    const provider = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key.trim()}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(40_000)]),
      body: JSON.stringify({
        model: config.model?.trim() || 'gpt-5-mini',
        store: false,
        instructions,
        input: JSON.stringify(input),
        max_output_tokens: 4800,
        text: {
          format: {
            type: 'json_schema',
            name: 'rpm_reading_summary',
            strict: true,
            schema: z.toJSONSchema(reportAiOutputSchema, { io: 'input', target: 'openapi-3.0' }),
          },
        },
      }),
    })
    if (!provider.ok) {
      if (provider.status === 429) {
        const details: unknown = await provider.json().catch(() => null)
        const failure = z.object({ error: z.object({ code: z.string() }) }).safeParse(details)
        if (failure.success && failure.data.error.code === 'credit_balance_exhausted') {
          return json({ error: 'credit_balance_exhausted' }, 429)
        }
      }
      return json({ error: 'summary_unavailable' }, 502)
    }
    const response = providerResponse.safeParse(await provider.json())
    if (!response.success) return json({ error: 'summary_unavailable' }, 502)
    const outputText = response.data.output
      .flatMap(({ content }) => content ?? [])
      .filter(({ type }) => type === 'output_text')
      .map(({ text }) => text ?? '')
      .join('')
    const output = reportAiOutputSchema.safeParse(JSON.parse(outputText))
    if (!output.success || !matchesReportInput(output.data, input)) {
      return json({ error: 'summary_unavailable' }, 502)
    }
    return json(output.data)
  } catch {
    return json({ error: 'summary_unavailable' }, 502)
  }
}
