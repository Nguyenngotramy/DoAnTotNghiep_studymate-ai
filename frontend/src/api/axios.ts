import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

const getTokenFromStorage = () => {
  const stateToken = useAuthStore.getState().accessToken
  if (stateToken) return stateToken

  const directToken =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token')

  if (directToken) return directToken

  const possibleKeys = [
    'studymate-auth',
    'auth-storage',
    'auth',
    'user-auth',
  ]

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)

      const token =
        parsed?.state?.accessToken ||
        parsed?.state?.token ||
        parsed?.accessToken ||
        parsed?.token

      if (token) return token
    } catch {
      // ignore
    }
  }

  return null
}

// ─── Request: attach access token ───────────────────────
api.interceptors.request.use((config) => {
  const token = getTokenFromStorage()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// ─── Response: auto refresh on 401 ─────────────────────
let isRefreshing = false

let failedQueue: Array<{
  resolve: (v: string) => void
  reject: (e: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })

  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (!original) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken

      if (!refreshToken) {
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })

        const newAccessToken =
          data?.data?.accessToken ||
          data?.accessToken ||
          data?.token

        const newRefreshToken =
          data?.data?.refreshToken ||
          data?.refreshToken ||
          refreshToken

        if (!newAccessToken) {
          throw new Error('Refresh response does not contain access token')
        }

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken)

        processQueue(null, newAccessToken)

        original.headers.Authorization = `Bearer ${newAccessToken}`

        return api(original)
      } catch (err) {
        processQueue(err, null)
        useAuthStore.getState().logout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api