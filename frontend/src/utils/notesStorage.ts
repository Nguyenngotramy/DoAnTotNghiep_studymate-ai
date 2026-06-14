export interface Note {
  id: string
  title: string
  content: string
  color: string
  updatedAt: string
}

export const NOTES_STORAGE_KEY = 'studymate_notes'
export const NOTES_UPDATED_EVENT = 'studymate-notes-updated'
export const NOTE_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#f97316']

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false

  const note = value as Partial<Note>
  return (
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.color === 'string' &&
    typeof note.updatedAt === 'string'
  )
}

export function loadNotes(): Note[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isNote) : []
  } catch {
    return []
  }
}

export function persistNotes(notes: Note[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
}

export function addNote(input: Pick<Note, 'title' | 'content'> & { color?: string }): Note {
  const notes = loadNotes()
  const now = new Date().toISOString()
  const note: Note = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    content: input.content,
    color: input.color ?? NOTE_COLORS[notes.length % NOTE_COLORS.length],
    updatedAt: now,
  }

  persistNotes([note, ...notes])
  window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT))
  return note
}
