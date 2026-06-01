import type { VocabularyItem } from '@/types'

const COL = { tu_vung: 0, nghia: 1, vi_du: 2, phat_am: 3 }

const HEADER_WORDS = new Set([
  'tu_vung', 'tu', 'từ', 'word', 'term', 'từ vựng', 'vocabulary',
  'nghia', 'nghĩa', 'meaning', 'definition', 'dịch',
])

function normalizeItem(raw: Partial<VocabularyItem>): VocabularyItem | null {
  let tu = (raw.tu_vung || '').trim()
  let nghia = (raw.nghia || '').trim()
  if (!tu && !nghia) return null
  if (!tu) tu = nghia
  if (!nghia) nghia = tu
  return {
    tu_vung: tu,
    nghia,
    vi_du: (raw.vi_du || '').trim(),
    phat_am: (raw.phat_am || '').trim(),
  }
}

function rowToVocab(parts: string[]): VocabularyItem | null {
  const cells = [...parts]
  while (cells.length < 4) cells.push('')
  return normalizeItem({
    tu_vung: cells[COL.tu_vung],
    nghia: cells[COL.nghia],
    vi_du: cells[COL.vi_du],
    phat_am: cells[COL.phat_am],
  })
}

function isHeaderRow(parts: string[]): boolean {
  const joined = parts.join(' ').toLowerCase()
  return HEADER_WORDS.has(parts[0]?.toLowerCase()) || joined.includes('nghĩa') && joined.includes('từ')
}

/** Dán từ Excel (Tab), Word, JSON, CSV — giống backend parse_paste_text */
export function parseVocabularyPaste(text: string): VocabularyItem[] {
  const raw = text.trim()
  if (!raw) return []

  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const data = JSON.parse(raw)
      const list = Array.isArray(data) ? data : data?.vocabulary
      if (Array.isArray(list)) {
        return dedupe(list.map(normalizeItem).filter(Boolean) as VocabularyItem[])
      }
    } catch {
      /* fall through */
    }
  }

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : null
  if (delim) {
    const rows = lines.map(l => l.split(delim).map(c => c.trim()))
    const start = isHeaderRow(rows[0]) ? 1 : 0
    const parsed = rows.slice(start).map(rowToVocab).filter(Boolean) as VocabularyItem[]
    if (parsed.length) return dedupe(parsed)
  }

  const result: VocabularyItem[] = []
  for (const line of lines) {
    if (isHeaderRow([line])) continue
    let item: VocabularyItem | null = null
    for (const sep of [' - ', ' – ', ' — ', ':', ';', '|', '\t']) {
      if (line.includes(sep)) {
        item = rowToVocab(line.split(sep).map(s => s.trim()))
        break
      }
    }
    if (!item) {
      const parts = line.split(/\s{2,}/)
      if (parts.length >= 2) item = rowToVocab(parts)
    }
    if (item) result.push(item)
  }
  return dedupe(result)
}

function dedupe(items: VocabularyItem[]): VocabularyItem[] {
  const seen = new Set<string>()
  return items.filter(i => {
    const k = i.tu_vung.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function vocabularyToFlashcards(items: VocabularyItem[]) {
  return items.map(v => {
    let front = v.tu_vung
    if (v.phat_am) front += `\n(${v.phat_am})`
    const back = [v.nghia, v.vi_du ? `Ví dụ: ${v.vi_du}` : ''].filter(Boolean).join('\n')
    return { question: front, answer: back }
  })
}

export function vocabularyToQuiz(items: VocabularyItem[]) {
  if (items.length < 2) return []
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.map(correct => {
    const others = items.filter(x => x.tu_vung !== correct.tu_vung)
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3).map(o => o.nghia)
    while (distractors.length < 3) distractors.push(`Nghĩa khác ${distractors.length + 1}`)
    const options = [correct.nghia, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5)
    const correctIndex = options.indexOf(correct.nghia)
    let q = `Từ "${correct.tu_vung}" có nghĩa là gì?`
    if (correct.phat_am) q = `Từ "${correct.tu_vung}" (${correct.phat_am}) có nghĩa là gì?`
    return {
      question: q,
      options,
      correctIndex,
      explanation: `Đáp án: ${correct.nghia}${correct.vi_du ? `\nVí dụ: ${correct.vi_du}` : ''}`,
    }
  })
}

export const PASTE_FORMAT_HINT = `Dán từ Excel / Word (mỗi dòng 1 từ, cột cách nhau bằng Tab):

안녕하세요	xin chào	안녕하세요, 만나서 반갑습니다.	annyeonghaseyo
감사합니다	cảm ơn	감사합니다!	gamsahamnida

Hoặc: từ | nghĩa | ví dụ | phát âm
Hoặc JSON: {"vocabulary":[{"tu_vung":"...","nghia":"..."}]}`
