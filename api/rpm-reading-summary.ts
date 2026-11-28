import { handleReportAiSummary } from '../server/report-ai-summary.ts'

export function POST(request: Request) {
  return handleReportAiSummary(request, {
    key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_RPM_MODEL,
    authBase: process.env.VITE_API_BASE_URL,
  })
}
