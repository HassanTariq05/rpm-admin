import { useEffect, useState } from 'react'
import {
  matchesReportInput,
  reportAiOutputSchema,
  reportAiSummaryPath,
  type ReportAiInput,
  type ReportAiOutput,
} from './report-ai-summary-contract'

type Result =
  | { status: 'ready'; output: ReportAiOutput }
  | { status: 'unavailable' | 'unconfigured' | 'credit_balance_exhausted'; output?: undefined }

export function useReportAiSummary(input: ReportAiInput | undefined, key: string, token?: string) {
  const body = input && JSON.stringify(input)
  const [result, setResult] = useState<{
    body: string
    key: string
    token: string
    value: Result
  }>()

  useEffect(() => {
    if (!body || !token) return
    const controller = new AbortController()
    async function load(payload: string, accessToken: string) {
      let value: Result = { status: 'unavailable' }
      try {
        const response = await fetch(reportAiSummaryPath, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        })
        if (response.status === 503) {
          value = { status: 'unconfigured' }
        } else if (response.status === 429) {
          const failure = await response.json()
          if (failure?.error === 'credit_balance_exhausted') {
            value = { status: 'credit_balance_exhausted' }
          }
        } else if (response.ok) {
          const parsed = reportAiOutputSchema.safeParse(await response.json())
          if (
            parsed.success &&
            matchesReportInput(parsed.data, JSON.parse(payload) as ReportAiInput)
          ) {
            value = { status: 'ready', output: parsed.data }
          }
        }
      } catch {
        // The reading charts and export remain available when summary generation fails.
      }
      if (!controller.signal.aborted) setResult({ body: payload, key, token: accessToken, value })
    }
    const timer = window.setTimeout(() => void load(body, token), 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [body, key, token])

  if (!body || !token) return { status: 'idle', output: undefined } as const
  if (!result || result.body !== body || result.key !== key || result.token !== token) {
    return { status: 'loading', output: undefined } as const
  }
  return result.value
}
