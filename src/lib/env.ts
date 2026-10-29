import { z } from 'zod'

const envSchema = z.object({
  appName: z.string().default('Remote Patient Monitoring'),
  emrApiBaseUrl: z
    .string()
    .url()
    .default('https://rl9otvtzf6.execute-api.eu-north-1.amazonaws.com/api/emr'),
  apiBaseUrl: z.string().optional(),
  realtimeTicketUrl: z
    .string()
    .url()
    .default('https://rl9otvtzf6.execute-api.eu-north-1.amazonaws.com/api/auth/realtime-ticket'),
  readingsWebsocketUrl: z
    .string()
    .url()
    .default('wss://tggrlk6xmd.execute-api.eu-north-1.amazonaws.com/production'),
})

export const env = envSchema.parse({
  appName: import.meta.env.VITE_APP_NAME,
  emrApiBaseUrl: import.meta.env.VITE_EMR_API_BASE_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  realtimeTicketUrl: import.meta.env.VITE_REALTIME_TICKET_URL,
  readingsWebsocketUrl: import.meta.env.VITE_READINGS_WEBSOCKET_URL,
})
