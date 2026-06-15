interface Env {
  AI_AGENT_ORIGIN: string
  AI_AGENT_SERVICE_KEY: string
  JWT_SECRET: string
}

const decodeBase64Url = (value: string): ArrayBuffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0)).buffer
}

const verifyAccessToken = async (request: Request, secret: string): Promise<boolean> => {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const parts = token.split('.')
  if (parts.length !== 3 || !secret) return false

  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])))
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])))
    const hash = {
      HS256: 'SHA-256',
      HS384: 'SHA-384',
      HS512: 'SHA-512',
    }[header.alg as string]
    if (!hash || payload.type !== 'access' || Number(payload.exp || 0) <= Date.now() / 1000) {
      return false
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash },
      false,
      ['verify'],
    )
    return crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
  } catch {
    return false
  }
}

export const onRequest = async (context: {
  request: Request
  env: Env
  params: { path?: string | string[] }
}): Promise<Response> => {
  const origin = context.env.AI_AGENT_ORIGIN?.replace(/\/+$/, '')
  const serviceKey = context.env.AI_AGENT_SERVICE_KEY
  if (!origin?.startsWith('https://') || !serviceKey) {
    return new Response('AI Agent gateway is not configured', { status: 503 })
  }
  if (!(await verifyAccessToken(context.request, context.env.JWT_SECRET))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path || ''
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(`${origin}/${path}`)
  targetUrl.search = incomingUrl.search

  const headers = new Headers(context.request.headers)
  headers.set('X-AI-Service-Key', serviceKey)
  headers.set('X-Forwarded-Host', incomingUrl.host)
  headers.set('X-Forwarded-Proto', 'https')

  return fetch(targetUrl, new Request(context.request, { headers, redirect: 'manual' }))
}
