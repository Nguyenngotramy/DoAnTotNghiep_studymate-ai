import { useState, useRef, useEffect } from 'react'
import {
  StickyNote, Download, Trash2, Plus, X, ChevronRight,
  Bold, Italic, List, Clock, Save, FileText
} from 'lucide-react'
import {
  loadNotes,
  NOTE_COLORS,
  NOTES_STORAGE_KEY,
  NOTES_UPDATED_EVENT,
  persistNotes,
  type Note,
} from '@/utils/notesStorage'

const THEME = {
  dark: {
    panel: '#16161d',
    card: '#1f1f2a',
    card2: 'rgba(255,255,255,.04)',
    border: 'rgba(255,255,255,.08)',
    borderSoft: 'rgba(255,255,255,.05)',
    text: '#f0f0f5',
    text2: '#8b8b9e',
    text3: '#5a5a6e',
    placeholder: '#3a3a4e',
    shadow: '-8px 0 40px rgba(0,0,0,.5)',
    overlay: 'rgba(0,0,0,.4)',
    header: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.08))',
    hover: 'rgba(255,255,255,.06)',
  },
  light: {
    panel: '#ffffff',
    card: '#f8fafc',
    card2: '#f1f5f9',
    border: 'rgba(15,23,42,.12)',
    borderSoft: 'rgba(15,23,42,.08)',
    text: '#0f172a',
    text2: '#64748b',
    text3: '#94a3b8',
    placeholder: '#cbd5e1',
    shadow: '-8px 0 34px rgba(15,23,42,.14)',
    overlay: 'rgba(15,23,42,.18)',
    header: 'linear-gradient(135deg,rgba(99,102,241,.10),rgba(139,92,246,.05))',
    hover: 'rgba(15,23,42,.06)',
  },
}

function getInitialDarkMode() {
  if (typeof window === 'undefined') return false

  try {
    const ui = JSON.parse(localStorage.getItem('studymate-ui-v2') || '{}')

    if (typeof ui?.state?.darkMode === 'boolean') {
      return ui.state.darkMode
    }

    if (typeof ui?.darkMode === 'boolean') {
      return ui.darkMode
    }
  } catch {
    // ignore localStorage parse error
  }

  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') return true
  if (savedTheme === 'light') return false

  return (
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    document.documentElement.dataset.theme === 'dark' ||
    document.body.dataset.theme === 'dark'
  )
}

function noteBg(color: string, isDark: boolean) {
  return isDark ? `${color}18` : `${color}10`
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export default function SideToolbar() {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDark, setIsDark] = useState(getInitialDarkMode)

  const textRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = notes.find(n => n.id === activeId) ?? null
  const theme = isDark ? THEME.dark : THEME.light

  // Theo dõi khi app đổi dark/light mode
  useEffect(() => {
    const syncTheme = () => setIsDark(getInitialDarkMode())

    syncTheme()

    const observer = new MutationObserver(syncTheme)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    window.addEventListener('storage', syncTheme)

    // Dùng thêm interval vì một số Zustand persist update cùng tab
    // sẽ không trigger storage event.
    const timer = window.setInterval(syncTheme, 600)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', syncTheme)
      window.clearInterval(timer)
    }
  }, [])

  // Persist notes on change
  useEffect(() => {
    persistNotes(notes)
  }, [notes])

  useEffect(() => {
    const syncNotes = () => setNotes(loadNotes())
    const syncNotesFromStorage = (event: StorageEvent) => {
      if (event.key === NOTES_STORAGE_KEY) syncNotes()
    }

    window.addEventListener(NOTES_UPDATED_EVENT, syncNotes)
    window.addEventListener('storage', syncNotesFromStorage)

    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, syncNotes)
      window.removeEventListener('storage', syncNotesFromStorage)
    }
  }, [])

  // Auto-focus textarea khi mở note
  useEffect(() => {
    if (activeNote) setTimeout(() => textRef.current?.focus(), 50)
  }, [activeId, activeNote])

  const createNote = () => {
    const blankNote = notes.find(note => !note.content.trim() && (!note.title.trim() || note.title.trim() === 'Ghi chú mới'))
    if (blankNote) {
      setActiveId(blankNote.id)
      return
    }

    const note: Note = {
      id: Date.now().toString(),
      title: 'Ghi chú mới',
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      updatedAt: new Date().toISOString(),
    }

    const updated = [note, ...notes]
    setNotes(updated)
    setActiveId(note.id)
  }

  const updateNote = (id: string, patch: Partial<Note>) => {
    setNotes(prev =>
      prev.map(n =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n
      )
    )
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const downloadNote = (note: Note) => {
    const content =
      `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.content}\n\n` +
      `Cập nhật: ${new Date(note.updatedAt).toLocaleString('vi-VN')}`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `${note.title.replace(/[^a-zA-Z0-9À-ỹ ]/g, '_')}.txt`
    a.click()

    URL.revokeObjectURL(url)
  }

  const downloadAll = () => {
    const content = notes
      .map(n =>
        `## ${n.title}\n${n.content}\n\n` +
        `Cập nhật: ${new Date(n.updatedAt).toLocaleString('vi-VN')}\n\n` +
        `${'─'.repeat(40)}\n`
      )
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `StudyMate_GhiChu_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.txt`
    a.click()

    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const insertMD = (before: string, after = '') => {
    const ta = textRef.current
    if (!ta || !activeNote) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = ta.value.substring(start, end)

    const newVal =
      ta.value.substring(0, start) +
      before +
      sel +
      after +
      ta.value.substring(end)

    updateNote(activeNote.id, { content: newVal })

    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }, 10)
  }

  return (
    <>
      {/* Pull tab */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed right-0 top-1/2 z-[10002] flex h-24 w-8 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-l-xl transition-all duration-300"
        style={{
          background: 'linear-gradient(180deg,#6366f1,#8b5cf6)',
          boxShadow: '-4px 0 20px rgba(99,102,241,.4)',
        }}
        title="Ghi chú (StudyMate Notes)"
      >
        <StickyNote size={14} className="text-white/90" />

        <ChevronRight
          size={10}
          className="text-white/70 transition-transform duration-300"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>

      {/* Panel */}
      <div
        className="fixed bottom-[76px] right-3 top-16 z-[10000] flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ease-in-out lg:bottom-0 lg:right-0 lg:top-0 lg:h-full lg:rounded-none lg:border-y-0 lg:border-r-0"
        style={{
          width: 'min(340px, calc(100vw - 24px))',
          background: theme.panel,
          borderLeft: `1px solid ${theme.border}`,
          boxShadow: open ? theme.shadow : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3.5 flex-shrink-0"
          style={{
            background: theme.header,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <StickyNote size={13} className="text-white" />
          </div>

          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: theme.text }}>
              Ghi chú
            </p>
            <p className="text-[10px]" style={{ color: theme.text3 }}>
              {notes.length} ghi chú · lưu tự động
            </p>
          </div>

          <div className="flex items-center gap-1">
            {notes.length > 0 && (
              <button
                onClick={downloadAll}
                title="Tải tất cả về máy"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: theme.text3 }}
              >
                <Download size={13} />
              </button>
            )}

            <button
              onClick={createNote}
              title="Tạo ghi chú mới"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-indigo-500 hover:bg-indigo-400 transition-colors"
            >
              <Plus size={13} />
            </button>

            <button
              onClick={() => {
                setOpen(false)
                setActiveId(null)
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: theme.text3 }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeNote ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Editor toolbar */}
              <div
                className="flex items-center gap-1 px-3 py-2 flex-shrink-0"
                style={{
                  background: noteBg(activeNote.color, isDark),
                  borderBottom: `1px solid ${theme.borderSoft}`,
                }}
              >
                <button
                  onClick={() => setActiveId(null)}
                  className="transition-colors p-1 rounded"
                  style={{ color: theme.text3 }}
                >
                  <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
                </button>

                <div className="flex-1 min-w-0">
                  <input
                    value={activeNote.title}
                    onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                    className="w-full bg-transparent text-[13px] font-semibold outline-none"
                    placeholder="Tiêu đề..."
                    style={{ color: theme.text }}
                  />
                </div>

                <button
                  onClick={() => {
                    handleSave()
                    downloadNote(activeNote)
                  }}
                  title="Tải về .txt"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:scale-105"
                  style={{
                    background: activeNote.color + '20',
                    color: activeNote.color,
                  }}
                >
                  {saved ? (
                    <>
                      <Save size={11} />
                      Đã lưu
                    </>
                  ) : (
                    <>
                      <Download size={11} />
                      Lưu
                    </>
                  )}
                </button>
              </div>

              {/* Format buttons */}
              <div
                className="flex items-center gap-0.5 overflow-x-auto px-3 py-1.5 flex-shrink-0"
                style={{ borderBottom: `1px solid ${theme.borderSoft}` }}
              >
                {[
                  { icon: <Bold size={11} />, action: () => insertMD('**', '**'), tip: 'Bold' },
                  { icon: <Italic size={11} />, action: () => insertMD('_', '_'), tip: 'Italic' },
                  { icon: <List size={11} />, action: () => insertMD('\n- '), tip: 'Danh sách' },
                  { icon: <span className="text-[10px] font-bold">#</span>, action: () => insertMD('## '), tip: 'Tiêu đề' },
                  { icon: <span className="text-[10px]">[ ]</span>, action: () => insertMD('\n- [ ] '), tip: 'Checkbox' },
                  {
                    icon: <Clock size={11} />,
                    action: () =>
                      insertMD(
                        `\n⏰ ${new Date().toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} `
                      ),
                    tip: 'Thêm giờ',
                  },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.action}
                    title={btn.tip}
                    className="w-6 h-6 rounded flex items-center justify-center transition-all"
                    style={{ color: theme.text3 }}
                  >
                    {btn.icon}
                  </button>
                ))}

                <div className="ml-auto flex shrink-0 gap-1">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateNote(activeNote.id, { color: c })}
                      className="w-3.5 h-3.5 rounded-full transition-all hover:scale-125"
                      style={{
                        background: c,
                        boxShadow:
                          activeNote.color === c
                            ? `0 0 0 2px ${isDark ? 'rgba(255,255,255,.35)' : 'rgba(15,23,42,.25)'}`
                            : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textRef}
                value={activeNote.content}
                onChange={e => updateNote(activeNote.id, { content: e.target.value })}
                placeholder={
                  'Bắt đầu ghi chú...\n\n' +
                  'Hỗ trợ Markdown:\n' +
                  '**in đậm** _in nghiêng_\n' +
                  '- danh sách\n' +
                  '## tiêu đề'
                }
                className="flex-1 p-4 bg-transparent text-[13px] leading-relaxed resize-none outline-none font-mono"
                style={{
                  lineHeight: '1.7',
                  color: theme.text,
                }}
              />

              {/* Footer */}
              <div
                className="px-4 py-2 flex items-center justify-between flex-shrink-0"
                style={{ borderTop: `1px solid ${theme.borderSoft}` }}
              >
                <span className="text-[10px]" style={{ color: theme.text3 }}>
                  {activeNote.content.length} ký tự ·{' '}
                  {activeNote.content.split(/\s+/).filter(Boolean).length} từ
                </span>

                <span className="text-[10px]" style={{ color: theme.text3 }}>
                  {timeAgo(activeNote.updatedAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(99,102,241,.1)' }}
                  >
                    <FileText size={24} className="text-indigo-400" />
                  </div>

                  <p className="text-[13px] font-medium mb-1" style={{ color: theme.text2 }}>
                    Chưa có ghi chú nào
                  </p>

                  <p
                    className="text-[11px] mb-4 leading-relaxed"
                    style={{ color: theme.text3 }}
                  >
                    Ghi lại ý tưởng, bài học, công thức — lưu về máy bất kỳ lúc nào
                  </p>

                  <button
                    onClick={createNote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[12px] font-medium text-white transition-colors"
                  >
                    <Plus size={13} />
                    Tạo ghi chú đầu tiên
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {notes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => setActiveId(note.id)}
                      className="w-full text-left p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg group cursor-pointer"
                      style={{
                        background: noteBg(note.color, isDark),
                        borderColor: note.color + '35',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: note.color }}
                          />

                          <p
                            className="text-[12px] font-semibold truncate"
                            style={{ color: theme.text }}
                          >
                            {note.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              downloadNote(note)
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center transition-all"
                            style={{ color: theme.text3 }}
                          >
                            <Download size={11} />
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation()
                              deleteNote(note.id)
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center transition-all"
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <p
                        className="text-[11px] line-clamp-2 leading-relaxed"
                        style={{ color: theme.text2 }}
                      >
                        {note.content || 'Ghi chú trống...'}
                      </p>

                      <p className="text-[10px] mt-1.5" style={{ color: theme.text3 }}>
                        {timeAgo(note.updatedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay khi open trên mobile */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-[9999] lg:hidden"
          onClick={() => setOpen(false)}
          style={{ background: theme.overlay }}
        />
      )}
    </>
  )
}
