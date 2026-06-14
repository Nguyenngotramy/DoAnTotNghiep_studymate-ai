export type AiProvider = 'openrouter' | 'anthropic'

export type AiModel = {
  id: string
  name: string
  tier: 'free' | 'paid'
}

export type AiProviderInfo = {
  id: AiProvider
  name: string
  default_model: string
  models: AiModel[]
}

export type AiConfig = {
  provider: AiProvider
  model: string
  api_key: string
  validated: boolean
}

const STORAGE_KEY = 'studymind_ai_config'

const DEFAULT_CONFIG: AiConfig = {
  provider: 'openrouter',
  model: 'openrouter/free',
  api_key: '',
  validated: false,
}

export function getAiConfig(): AiConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveAiConfig(config: AiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent('studymind-ai-config-changed', { detail: config }))
}

export function clearAiConfig() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('studymind-ai-config-changed', { detail: DEFAULT_CONFIG }))
}

export function withAiConfig<T extends Record<string, unknown>>(body: T): T & Partial<AiConfig> {
  const config = getAiConfig()
  if (!config.api_key || !config.validated) return body
  return {
    ...body,
    provider: config.provider,
    model: config.model,
    api_key: config.api_key,
  }
}

export async function loadAiProviders(): Promise<AiProviderInfo[]> {
  const response = await fetch('/ai-agent/providers')
  if (!response.ok) throw new Error(await response.text())
  const payload = await response.json()
  return payload.providers || []
}

export async function validateAiConfig(config: AiConfig): Promise<AiConfig> {
  const response = await fetch('/ai-agent/providers/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || 'API key hoặc model không hợp lệ')
  }
  const payload = await response.json()
  return { ...config, model: payload.model, validated: true }
}
