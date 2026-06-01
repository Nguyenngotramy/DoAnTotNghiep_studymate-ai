/** Ảnh đại diện mặc định (con cáo) khi user chưa upload avatar */
export const DEFAULT_AVATAR_URL = '/default-avatar.png'

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')
}

export function getBackendOrigin(): string {
  return getApiBaseUrl().replace(/\/api$/, '')
}

export function hasCustomAvatar(avatar?: string | null): boolean {
  const v = avatar?.trim()
  return !!v && v !== DEFAULT_AVATAR_URL
}

/**
 * Chuẩn hóa URL avatar — upload local nằm dưới context-path /api (vd. /api/uploads/...).
 */
export function resolveUserAvatar(avatar?: string | null): string {
  if (!hasCustomAvatar(avatar)) {
    return DEFAULT_AVATAR_URL
  }

  const cleanUrl = String(avatar).trim().replaceAll('\\', '/')
  if (!cleanUrl) return DEFAULT_AVATAR_URL

  if (
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl
  }

  const API_BASE_URL = getApiBaseUrl()
  const BACKEND_ORIGIN = getBackendOrigin()

  if (cleanUrl.startsWith('http://localhost:8080/api')) {
    return cleanUrl.replace('http://localhost:8080/api', API_BASE_URL)
  }
  if (cleanUrl.startsWith('http://localhost:8080/uploads/')) {
    return `${API_BASE_URL}${cleanUrl.replace('http://localhost:8080', '')}`
  }
  if (cleanUrl.startsWith('http://localhost:8080')) {
    return cleanUrl.replace('http://localhost:8080', BACKEND_ORIGIN)
  }
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  if (cleanUrl.startsWith('/api/')) {
    return `${BACKEND_ORIGIN}${cleanUrl}`
  }
  if (cleanUrl.startsWith('/uploads/')) {
    return `${API_BASE_URL}${cleanUrl}`
  }
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL}/${cleanUrl}`
  }

  return `${API_BASE_URL}/uploads/${cleanUrl}`
}
