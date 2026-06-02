/** Chuẩn hóa chuỗi để so sánh chép chính tả (hỗ trợ học ngoại ngữ). */
export function normalizeSpelling(text: string, ignoreCase: boolean): string {
  let t = text.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (ignoreCase) t = t.toLocaleLowerCase('vi-VN')
  return t
}

export function spellingMatches(typed: string, expected: string, ignoreCase: boolean): boolean {
  const a = normalizeSpelling(typed, ignoreCase)
  const b = normalizeSpelling(expected, ignoreCase)
  if (!a || !b) return false
  return a === b
}

export type StudyFace = 'question' | 'answer'
export type StudyActivity = 'flip' | 'dictation'

export function loadStudyPrefs(deckId: string): { face: StudyFace; activity: StudyActivity } {
  try {
    const face = localStorage.getItem(`flashcard-face-${deckId}`)
    const activity = localStorage.getItem(`flashcard-activity-${deckId}`)
    return {
      face: face === 'answer' ? 'answer' : 'question',
      activity: activity === 'dictation' ? 'dictation' : 'flip',
    }
  } catch {
    return { face: 'question', activity: 'flip' }
  }
}

export function saveStudyFace(deckId: string, face: StudyFace) {
  try {
    localStorage.setItem(`flashcard-face-${deckId}`, face)
  } catch {
    /* ignore */
  }
}

export function saveStudyActivity(deckId: string, activity: StudyActivity) {
  try {
    localStorage.setItem(`flashcard-activity-${deckId}`, activity)
  } catch {
    /* ignore */
  }
}

export function cardSides(card: { question: string; answer: string }, face: StudyFace) {
  const prompt = face === 'question' ? card.question : card.answer
  const hidden = face === 'question' ? card.answer : card.question
  const promptLabel = face === 'question' ? 'Mặt hỏi' : 'Mặt đáp án (đang học)'
  const hiddenLabel = face === 'question' ? 'Đáp án' : 'Mặt hỏi'
  return { prompt, hidden, promptLabel, hiddenLabel }
}
