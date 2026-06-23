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


const normalizeVietnamese = (value: string): string => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/\s+/g, ' ')
  .trim()

const isVagueFlashcardChat = (body: Record<string, unknown>): boolean => {
  const text = typeof body.text === 'string' ? normalizeVietnamese(body.text) : ''
  if (!text || !/\b(flashcards?|flash cards?|the ghi nho|the hoc|on tu)\b/.test(text)) return false
  if (/\b(toan|vat ly|hoa hoc|sinh hoc|ngu van|lich su|dia ly|tieng anh|tieng han|tieng nhat|tieng trung|lap trinh|python|java|javascript|sql|dao ham|tich phan|ham so|phuong trinh|hinh hoc|xac suat|kinh te|marketing|phap luat|triet hoc|tam ly hoc|mang may tinh|co so du lieu|ai|machine learning)\b/.test(text)) return false
  const meaningful = text
    .replace(/\b(toi|minh|em|anh|chi|muon|can|hay|giup|tao|lam|cho|xin|flashcards?|flash|cards?|the|ghi|nho|hoc|on|tap|tong|hop|kien|thuc|noi|dung|chu|de|ve|cac|nhung|mot|vai|bo|bai|mon)\b/g, ' ')
    .replace(/\b\d{1,2}\b/g, ' ')
    .trim()
  return meaningful.split(/\s+/).filter(token => token.length > 1).length === 0
}

const vagueFlashcardResponse = (accountId: string): Response => Response.json({
  session_id: crypto.randomUUID(),
  response: 'Nếu bạn không nhập số lượng, mình sẽ mặc định tạo 5 flashcard. Nhưng mình cần thêm chủ đề/môn học để tạo đúng nội dung, ví dụ: Tạo flashcard tổng hợp kiến thức về đạo hàm, lịch sử Việt Nam, hoặc từ vựng tiếng Anh A2.',
  agent: 'FlashcardAgent',
  route: 'flashcard',
  structured: null,
  sources: [],
  classification: null,
  error: null,
  scope_blocked: false,
  ai_config: { mode: 'not_used' },
  account_id: accountId,
})
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

  if (path === 'chat' && isVagueFlashcardChat(requestBody)) {
    return vagueFlashcardResponse(accountId)
  }

  if (action) {
    if (!backendOrigin?.startsWith('https://')) {
      return jsonError(503, 'AI_WALLET_UNAVAILABLE', 'Chưa kết nối được ví AI. Vui lòng thử lại sau.')
    }
    let creditCheck: Response
    try {
      creditCheck = await callCreditEndpoint(
        backendOrigin,
        'check',
        authorization,
        action,
        personalApiKey,
      )
    } catch {
      return jsonError(503, 'AI_WALLET_UNAVAILABLE', 'Ví AI tạm thời không phản hồi. Vui lòng thử lại sau.')
    }
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

  let aiResponse: Response
  try {
    aiResponse = await fetch(targetUrl, forwardedRequest)
  } catch {
    return jsonError(502, 'AI_AGENT_UNAVAILABLE', 'AI service tạm thời không phản hồi. Vui lòng thử lại sau.')
  }

  if (action && aiResponse.ok) {
    const responsePayload = await aiResponse.clone().json().catch(() => null) as {
      error?: unknown
    } | null
    const shouldConsume = !responsePayload?.error
      && !responsePayload?.scope_blocked
      && responsePayload?.ai_config?.mode !== 'not_used'
    if (shouldConsume) {
      let consumed: Response
      try {
        consumed = await callCreditEndpoint(
          backendOrigin,
          'consume',
          authorization,
          action,
          personalApiKey,
        )
      } catch {
        return jsonError(503, 'AI_WALLET_UNAVAILABLE', 'AI đã phản hồi nhưng ví AI tạm thời không ghi nhận được token. Vui lòng thử lại sau.')
      }
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
