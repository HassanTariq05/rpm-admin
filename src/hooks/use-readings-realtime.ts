import { useEffect } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from '@/hooks/use-administration'

const ticketSchema = z.object({
  success: z.literal(true),
  ticket: z.string().min(1),
  expiresIn: z.number().positive(),
})

export function useReadingsRealtime() {
  const client = useQueryClient()
  const token = useAuthStore((state) => state.auth.accessToken)
  const { user, orgId } = useAdminScope()
  const userId = user?.id

  useEffect(() => {
    if (!token || !userId || typeof WebSocket === 'undefined') return

    let disposed = false
    let socket: WebSocket | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let reconnectAttempts = 0
    let refreshInProgress = false
    let refreshPending = false
    const controller = new AbortController()

    const refreshReadings = async () => {
      if (disposed) return
      refreshPending = true
      if (refreshInProgress) return
      refreshInProgress = true
      try {
        while (refreshPending && !disposed) {
          refreshPending = false
          // Keep the same keys, but replace any older in-flight refetch.
          // Events during this request trigger one follow-up instead of being lost.
          await client.invalidateQueries(
            { queryKey: ['readings', userId, orgId ?? ''], refetchType: 'active' },
            { cancelRefetch: true },
          )
        }
      } finally {
        refreshInProgress = false
      }
    }

    const scheduleReconnect = () => {
      if (disposed || retryTimer !== undefined) return
      const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempts++, 5), 30_000)
      retryTimer = setTimeout(() => {
        retryTimer = undefined
        void connect()
      }, delay)
    }

    const connect = async () => {
      try {
        // Tickets expire after 60 seconds; never reuse one on reconnection.
        const response = await axios.post<unknown>(env.realtimeTicketUrl, undefined, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: false,
          signal: controller.signal,
          timeout: 20_000,
        })
        if (disposed) return
        const { ticket } = ticketSchema.parse(response.data)
        const url = new URL(env.readingsWebsocketUrl)
        url.searchParams.set('ticket', ticket)
        const connection = new WebSocket(url.toString())
        socket = connection
        connection.addEventListener('open', () => {
          if (disposed || socket !== connection) return
          reconnectAttempts = 0
          // Catch readings received while connecting or disconnected.
          void refreshReadings()
        })
        connection.addEventListener('message', (message) => {
          if (disposed || socket !== connection) return
          let event: unknown
          try {
            event = JSON.parse(message.data)
          } catch {
            return
          }
          if (
            typeof event === 'object' &&
            event !== null &&
            'type' in event &&
            event.type === 'vitals.refresh'
          ) {
            void refreshReadings()
          }
        })
        connection.addEventListener('close', () => {
          if (socket === connection) scheduleReconnect()
        })
        connection.addEventListener('error', () => {
          // Closing also ensures the close handler schedules exactly one retry.
          connection.close()
        })
      } catch (error) {
        if (disposed) return
        // Authentication/permission failures need a changed session, not repeated tickets.
        if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) return
        scheduleReconnect()
      }
    }

    void connect()
    return () => {
      disposed = true
      controller.abort()
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [client, token, userId, orgId])
}
