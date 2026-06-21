interface Env {
  AI_AGENT_ORIGIN: string
  AI_AGENT_SERVICE_KEY: string
  BACKEND_ORIGIN: string
  JWT_SECRET: string
}

const AI_CREDIT_ACTIONS: Record<string, string> = {
  chat: 'aiChat',
  summary: 'summary',
  flashcard: 'flashcard',
  quiz: 'quiz',
  'vocabulary/to-flashcards': 'flashcard',
  'vocabulary/to-quiz': 'quiz',
}

const jsonError = (status: number, code: string, message: string): Response =>
  Response.json(
    {
      detail: {
        code,
        message,
        retryable: false,
        actions: ['buy_tokens', 'add_personal_api_key'],
      },
    },
    { status },
  )

const decodeBase64Url = (value: string): ArrayBuffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0)).buffer
}

const verifyAccessToken = async (
  request: Request,
  secret: string,
): Promise<Record<string, unknown> | null> => {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const parts = token.split('.')
  if (parts.length !== 3 || !secret) return null

  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])))
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])))
    const hash = {
      HS256: 'SHA-256',
      HS384: 'SHA-384',
      HS512: 'SHA-512',
    }[header.alg as string]
    if (!hash || payload.type !== 'access' || Number(payload.exp || 0) <= Date.now() / 1000) {
      return null
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    return valid ? payload : null
  } catch {
    return null
  }
}

const readJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  if (request.method === 'GET' || request.method === 'HEAD') return {}
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return {}
  return request.clone().json().catch(() => ({}))
}

const callCreditEndpoint = async (
  backendOrigin: string,
  endpoint: 'check' | 'consume',
  authorization: string,
  action: string,
  personalApiKey: boolean,
): Promise<Response> => fetch(
  `${backendOrigin.replace(/\/+$/, '')}/api/membership/ai-credits/${endpoint}`,
  {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, personalApiKey }),
  },
)

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
  const accessToken = await verifyAccessToken(context.request, context.env.JWT_SECRET)
  if (!accessToken?.sub) {
    return new Response('Unauthorized', { status: 401 })
  }
  const accountId = String(accessToken.sub)
  const accountTenant = `user:${accountId}`

  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path || ''
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(`${origin}/${path}`)
  targetUrl.search = incomingUrl.search
  if (path === 'sessions' || path === 'history' || path.startsWith('history/')) {
    targetUrl.searchParams.set('tenant_id', accountTenant)
  }

  const action = context.request.method === 'POST' ? AI_CREDIT_ACTIONS[path] : undefined
  const authorization = context.request.headers.get('Authorization') || ''
  const requestBody = action ? await readJsonBody(context.request) : {}
  const personalApiKey = Boolean(
    typeof requestBody.api_key === 'string' && requestBody.api_key.trim(),
  )
  const backendOrigin = context.env.BACKEND_ORIGIN?.replace(/\/+$/, '')

  if (action) {
    if (!backendOrigin?.startsWith('https://')) {
      return jsonError(503, 'AI_WALLET_UNAVAILABLE', 'Chưa kết nối được ví AI. Vui lòng thử lại sau.')
    }
    const creditCheck = await callCreditEndpoint(
      backendOrigin,
      'check',
      authorization,
      action,
      personalApiKey,
    )
    if (!creditCheck.ok) {
      return new Response(creditCheck.body, {
        status: creditCheck.status,
        headers: creditCheck.headers,
      })
    }
  }

  const headers = new Headers(context.request.headers)
  headers.set('X-AI-Service-Key', serviceKey)
  headers.set('X-Forwarded-Host', incomingUrl.host)
  headers.set('X-Forwarded-Proto', 'https')

  let forwardedRequest = new Request(context.request, { headers, redirect: 'manual' })
  if (path === 'chat') {
    headers.set('Content-Type', 'application/json')
    headers.delete('Content-Length')
    forwardedRequest = new Request(context.request, {
      headers,
      redirect: 'manual',
      body: JSON.stringify({
        ...requestBody,
        account_id: accountId,
        tenant_id: accountTenant,
      }),
    })
  }

  const aiResponse = await fetch(targetUrl, forwardedRequest)

  if (action && aiResponse.ok) {
    const responsePayload = await aiResponse.clone().json().catch(() => null) as {
      error?: unknown
    } | null
    if (!responsePayload?.error) {
      const consumed = await callCreditEndpoint(
        backendOrigin,
        'consume',
        authorization,
        action,
        personalApiKey,
      )
      if (!consumed.ok) {
        return jsonError(
          409,
          'AI_TOKEN_CONSUME_FAILED',
          'AI đã phản hồi nhưng hệ thống chưa ghi nhận được token. Vui lòng tải lại ví trước khi thử tiếp.',
        )
      }
    }
  }

  return aiResponse
}
