import { z } from 'zod'

const envSchema = z.object({
  appName: z.string().default('Remote Patient Monitoring'),
  apiBaseUrl: z
    .string()
    .url()
    .default('https://rl9otvtzf6.execute-api.eu-north-1.amazonaws.com/api')
    .transform((url) => url.replace(/\/+$/, '')),
  readingsWebsocketUrl: z
    .string()
    .url()
    .default('wss://tggrlk6xmd.execute-api.eu-north-1.amazonaws.com/production'),
})
export const env = envSchema.parse({
  appName: import.meta.env.VITE_APP_NAME,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  readingsWebsocketUrl: import.meta.env.VITE_READINGS_WEBSOCKET_URL,
})
