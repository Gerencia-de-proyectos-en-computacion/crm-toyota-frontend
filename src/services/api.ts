import axios from 'axios'
import type { AuthSession } from '@/types/crm'
import { useAuthStore } from '@/stores/auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL,
  timeout: 15000,
})

let refreshInFlight: Promise<void> | null = null

api.interceptors.request.use(async (config) => {
  const auth = useAuthStore()
  if (auth.session?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.session.accessToken}`

    // Renovación silenciosa automática si restan < 2h de sesión activa (E3)
    const isAuthEndpoint = config.url?.includes('/api/v1/auth/')
    if (!isAuthEndpoint && auth.shouldSilentRefresh() && !refreshInFlight) {
      refreshInFlight = axios
        .post<AuthSession>(
          `${baseURL}/api/v1/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${auth.session.accessToken}` } },
        )
        .then((res) => {
          auth.setSession(res.data)
          config.headers.Authorization = `Bearer ${res.data.accessToken}`
        })
        .catch(() => {
          // Si falla el refresh silencioso, mantener sesión actual hasta expiración real
        })
        .finally(() => {
          refreshInFlight = null
        })
      await refreshInFlight
    }
  }
  return config
})

export function extractErrorMessage(err: unknown, fallback = 'Error en la operación'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: string; title?: string } | undefined
    if (data?.detail) return data.detail
    if (data?.title) return data.title
  }
  return fallback
}
