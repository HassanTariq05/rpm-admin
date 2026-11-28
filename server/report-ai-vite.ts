import { Readable } from 'node:stream'
import type { Plugin } from 'vite'
import { reportAiSummaryPath } from '../src/features/patients/report-ai-summary-contract.ts'
import { handleReportAiSummary } from './report-ai-summary.ts'

export function reportAiVite(env: Record<string, string>): Plugin {
  return {
    name: 'rpm-reading-summary',
    configureServer(server) {
      server.middlewares.use(reportAiSummaryPath, (incoming, outgoing) => {
        const method = incoming.method || 'GET'
        const headers = new Headers()
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
        }

        const abort = new AbortController()
        outgoing.once('close', () => abort.abort())
        const init: RequestInit & { duplex?: 'half' } = { method, headers, signal: abort.signal }
        if (method === 'POST') {
          init.body = Readable.toWeb(incoming) as RequestInit['body']
          init.duplex = 'half'
        }
        const request = new Request(`http://localhost${reportAiSummaryPath}`, init)
        void handleReportAiSummary(request, {
          key: env.OPENAI_API_KEY,
          model: env.OPENAI_RPM_MODEL,
          authBase: env.VITE_API_BASE_URL,
        })
          .then(async (response) => {
            const body = await response.text()
            if (outgoing.destroyed) return
            outgoing.writeHead(response.status, Object.fromEntries(response.headers))
            outgoing.end(body)
          })
          .catch(() => {
            if (outgoing.destroyed) return
            outgoing.writeHead(502)
            outgoing.end()
          })
      })
    },
  }
}
