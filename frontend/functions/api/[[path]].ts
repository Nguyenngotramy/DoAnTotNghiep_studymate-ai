interface Env {
  BACKEND_ORIGIN: string
}

export const onRequest = async (context: {
  request: Request
  env: Env
  params: { path?: string | string[] }
}): Promise<Response> => {
  const origin = context.env.BACKEND_ORIGIN?.replace(/\/+$/, '')
  if (!origin?.startsWith('https://')) {
    return new Response('BACKEND_ORIGIN is not configured', { status: 503 })
  }

  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path || ''
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(`${origin}/api/${path}`)
  targetUrl.search = incomingUrl.search

  const headers = new Headers(context.request.headers)
  headers.set('X-Forwarded-Host', incomingUrl.host)
  headers.set('X-Forwarded-Proto', 'https')

  return fetch(targetUrl, new Request(context.request, { headers, redirect: 'manual' }))
}
