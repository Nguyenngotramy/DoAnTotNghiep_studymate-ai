export type ParsedQuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

function resolveCorrectIndex(item: Record<string, unknown>, optionCount: number): number {
  const raw = item.correctIndex ?? item.correct_index ?? item.answer ?? item.correct
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(Math.max(raw, 0), Math.max(optionCount - 1, 0))
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (/^[A-Da-d]$/.test(trimmed)) {
      return Math.min(ordLetter(trimmed), Math.max(optionCount - 1, 0))
    }
    const asNum = Number(trimmed)
    if (Number.isFinite(asNum)) {
      return Math.min(Math.max(asNum, 0), Math.max(optionCount - 1, 0))
    }
  }
  return 0
}

function ordLetter(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
}

function normalizeItem(item: Record<string, unknown>): ParsedQuizQuestion | null {
  const question = String(item.question ?? item.text ?? '').trim()
  const rawOptions = item.options ?? item.choices ?? item.answers
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map(o => String(o ?? '').trim()).filter(Boolean)
    : []

  if (!question || options.length < 2) return null

  return {
    question,
    options,
    correctIndex: resolveCorrectIndex(item, options.length),
    explanation: String(item.explanation ?? item.explain ?? '').trim(),
  }
}

/** Parse quiz từ JSON — hỗ trợ { questions: [...] }, mảng trực tiếp, correct_index / correctIndex */
export function parseQuizJson(raw: string): ParsedQuizQuestion[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('JSON trống')
  }

  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch {
    throw new Error('JSON không hợp lệ')
  }

  let items: unknown[] = []
  if (Array.isArray(data)) {
    items = data
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.questions)) items = obj.questions
    else if (Array.isArray(obj.items)) items = obj.items
    else throw new Error('JSON phải có mảng "questions" hoặc là mảng câu hỏi')
  } else {
    throw new Error('Định dạng JSON không được hỗ trợ')
  }

  const questions = items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(normalizeItem)
    .filter((q): q is ParsedQuizQuestion => q !== null)

  if (questions.length === 0) {
    throw new Error('Không tìm thấy câu hỏi hợp lệ (cần question + ít nhất 2 options)')
  }

  return questions
}

export const QUIZ_JSON_EXAMPLE = `{
  "questions": [
    {
      "question": "Thủ đô của Việt Nam là?",
      "options": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Huế"],
      "correct_index": 0,
      "explanation": "Hà Nội là thủ đô."
    }
  ]
}`
