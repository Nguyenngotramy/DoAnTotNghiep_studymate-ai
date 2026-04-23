import { useState, useRef, useEffect } from 'react'
import {
  StickyNote, Download, Trash2, Plus, X, ChevronRight,
  Bold, Italic, List, Clock, Save, FileText
} from 'lucide-react'
import clsx from 'clsx'

// ── Types ─────────────────────────────────────────────────
interface Note {
  id: string
  title: string
  content: string
  color: string
  updatedAt: string
}

const NOTE_COLORS = ['#6366f1','#14b8a6','#f59e0b','#ec4899','#22c55e','#f97316']
const COLOR_BG: Record<string, string> = {
  '#6366f1': 'rgba(99,102,241,.08)',
  '#14b8a6': 'rgba(20,184,166,.08)',
  '#f59e0b': 'rgba(245,158,11,.08)',
  '#ec4899': 'rgba(236,72,153,.08)',
  '#22c55e': 'rgba(34,197,94,.08)',
  '#f97316': 'rgba(249,115,22,.08)',
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s/60)} phút trước`
  if (s < 86400) return `${Math.floor(s/3600)} giờ trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

const STORAGE_KEY = 'studymate_notes'

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export default function SideToolbar() {
  const [open, setOpen]         = useState(false)
  const [notes, setNotes]       = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string|null>(null)
  const [saved, setSaved]       = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const activeNote = notes.find(n => n.id === activeId) ?? null

  // Persist on change
  useEffect(() => { saveNotes(notes) }, [notes])

  // Auto-focus textarea khi mở note
  useEffect(() => {
    if (activeNote) setTimeout(() => textRef.current?.focus(), 50)
  }, [activeId])

  const createNote = () => {
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
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
    ))
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) setActiveId(null)
  }

  // Download ghi chú ra file .txt
  const downloadNote = (note: Note) => {
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.content}\n\nCập nhật: ${new Date(note.updatedAt).toLocaleString('vi-VN')}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title.replace(/[^a-zA-Z0-9À-ỹ ]/g,'_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download tất cả notes
  const downloadAll = () => {
    const content = notes.map(n =>
      `## ${n.title}\n${n.content}\n\nCập nhật: ${new Date(n.updatedAt).toLocaleString('vi-VN')}\n\n${'─'.repeat(40)}\n`
    ).join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `StudyMate_GhiChu_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // Chèn markdown vào textarea
  const insertMD = (before: string, after = '') => {
    const ta = textRef.current
    if (!ta || !activeNote) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const sel   = ta.value.substring(start, end)
    const newVal = ta.value.substring(0, start) + before + sel + after + ta.value.substring(end)
    updateNote(activeNote.id, { content: newVal })
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }, 10)
  }

  return (
    <>
      {/* ── PULL TAB — sát mép phải ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:right-0 group"
        style={{
          width: 28,
          height: 96,
          background: 'linear-gradient(180deg,#6366f1,#8b5cf6)',
          borderRadius: '8px 0 0 8px',
          boxShadow: '-4px 0 20px rgba(99,102,241,.4)',
          transform: `translateY(-50%) ${open ? 'translateX(4px)' : 'translateX(0)'}`,
        }}
        title="Ghi chú (StudyMate Notes)"
      >
        <StickyNote size={14} className="text-white/90" />
        <div className="flex flex-col gap-[3px]">
          {['G','H','I'].map(c => (
            <span key={c} className="text-[8px] font-bold text-white/70 leading-none">{c}</span>
          ))}
        </div>
        <ChevronRight
          size={10}
          className="text-white/60 transition-transform duration-300"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>

      {/* ── PANEL ── */}
      <div
        className="fixed top-0 right-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out"
        style={{
          width: 340,
          background: '#16161d',
          borderLeft: '0.5px solid rgba(255,255,255,.08)',
          boxShadow: open ? '-8px 0 40px rgba(0,0,0,.5)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/[.07] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.08))' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <StickyNote size={13} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#f0f0f5]">Ghi chú</p>
            <p className="text-[10px] text-[#5a5a6e]">{notes.length} ghi chú · lưu tự động</p>
          </div>
          <div className="flex items-center gap-1">
            {notes.length > 0 && (
              <button onClick={downloadAll} title="Tải tất cả về máy"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5a5a6e] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                <Download size={13} />
              </button>
            )}
            <button onClick={createNote} title="Tạo ghi chú mới"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-indigo-500 hover:bg-indigo-400 transition-colors">
              <Plus size={13} />
            </button>
            <button onClick={() => { setOpen(false); setActiveId(null) }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5a5a6e] hover:text-[#f0f0f5] hover:bg-white/[.06] transition-all">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Note editor */}
          {activeNote ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Editor toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[.06] flex-shrink-0"
                style={{ background: COLOR_BG[activeNote.color] ?? 'rgba(99,102,241,.05)' }}>
                <button onClick={() => setActiveId(null)}
                  className="text-[#5a5a6e] hover:text-[#f0f0f5] transition-colors p-1 rounded">
                  <ChevronRight size={13} style={{ transform:'rotate(180deg)' }} />
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    value={activeNote.title}
                    onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                    className="w-full bg-transparent text-[13px] font-semibold text-[#f0f0f5] outline-none placeholder-[#5a5a6e]"
                    placeholder="Tiêu đề..."
                  />
                </div>
                <button onClick={() => { handleSave(); downloadNote(activeNote) }} title="Tải về .txt"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:scale-105"
                  style={{ background: activeNote.color + '20', color: activeNote.color }}>
                  {saved ? <><Save size={11} />Đã lưu</> : <><Download size={11} />Lưu</>}
                </button>
              </div>

              {/* Format buttons */}
              <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-white/[.05] flex-shrink-0">
                {[
                  { icon: <Bold size={11} />,       action: () => insertMD('**','**'),        tip: 'Bold' },
                  { icon: <Italic size={11} />,     action: () => insertMD('_','_'),           tip: 'Italic' },
                  { icon: <List size={11} />,       action: () => insertMD('\n- '),            tip: 'Danh sách' },
                  { icon: <span className="text-[10px] font-bold">#</span>, action: () => insertMD('## '), tip: 'Tiêu đề' },
                  { icon: <span className="text-[10px]">[ ]</span>, action: () => insertMD('\n- [ ] '), tip: 'Checkbox' },
                  { icon: <Clock size={11} />,      action: () => insertMD(`\n⏰ ${new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} `), tip: 'Thêm giờ' },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} title={btn.tip}
                    className="w-6 h-6 rounded flex items-center justify-center text-[#5a5a6e] hover:text-[#f0f0f5] hover:bg-white/[.06] transition-all">
                    {btn.icon}
                  </button>
                ))}
                {/* Color dots */}
                <div className="ml-auto flex gap-1">
                  {NOTE_COLORS.map(c => (
                    <button key={c} onClick={() => updateNote(activeNote.id, { color: c })}
                      className="w-3.5 h-3.5 rounded-full transition-all hover:scale-125"
                      style={{
                        background: c,
                        ring: activeNote.color === c ? `2px solid ${c}` : 'none',
                        boxShadow: activeNote.color === c ? `0 0 0 2px rgba(255,255,255,.3)` : 'none',
                      }} />
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textRef}
                value={activeNote.content}
                onChange={e => updateNote(activeNote.id, { content: e.target.value })}
                placeholder="Bắt đầu ghi chú...&#10;&#10;Hỗ trợ Markdown:&#10;**in đậm** _in nghiêng_&#10;- danh sách&#10;## tiêu đề"
                className="flex-1 p-4 bg-transparent text-[13px] text-[#e0e0ea] placeholder-[#3a3a4e] leading-relaxed resize-none outline-none font-mono"
                style={{ lineHeight: '1.7' }}
              />

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/[.05] flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-[#3a3a4e]">
                  {activeNote.content.length} ký tự · {activeNote.content.split(/\s+/).filter(Boolean).length} từ
                </span>
                <span className="text-[10px] text-[#3a3a4e]">{timeAgo(activeNote.updatedAt)}</span>
              </div>
            </div>

          ) : (
            /* Note list */
            <div className="flex-1 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(99,102,241,.1)' }}>
                    <FileText size={24} className="text-indigo-400" />
                  </div>
                  <p className="text-[13px] font-medium text-[#8b8b9e] mb-1">Chưa có ghi chú nào</p>
                  <p className="text-[11px] text-[#5a5a6e] mb-4 leading-relaxed">
                    Ghi lại ý tưởng, bài học, công thức — lưu về máy bất kỳ lúc nào
                  </p>
                  <button onClick={createNote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[12px] font-medium text-white transition-colors">
                    <Plus size={13} /> Tạo ghi chú đầu tiên
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {notes.map(note => (
                    <div key={note.id} onClick={() => setActiveId(note.id)}
                      className="w-full text-left p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg group cursor-pointer"
                      style={{
                        background: COLOR_BG[note.color] ?? 'rgba(255,255,255,.03)',
                        borderColor: note.color + '25',
                      }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: note.color }} />
                          <p className="text-[12px] font-semibold text-[#f0f0f5] truncate">{note.title}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); downloadNote(note) }}
                            className="w-6 h-6 rounded flex items-center justify-center text-[#5a5a6e] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                            <Download size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                            className="w-6 h-6 rounded flex items-center justify-center text-[#5a5a6e] hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#8b8b9e] line-clamp-2 leading-relaxed">
                        {note.content || 'Ghi chú trống...'}
                      </p>
                      <p className="text-[10px] text-[#5a5a6e] mt-1.5">{timeAgo(note.updatedAt)}</p>
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
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,.4)' }} />
      )}
    </>
  )
}
