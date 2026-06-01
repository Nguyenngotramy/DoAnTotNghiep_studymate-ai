import { Download, Upload, Layers, FolderPlus, Plus, BookMarked } from 'lucide-react'

interface FlashcardHeaderProps {
  onCreateFolder: () => void
  onShowVocabToolkit: () => void
  onCreateDeck: () => void
  onImport?: () => void
  onExport?: () => void
}

export default function FlashcardHeader({
  onCreateFolder,
  onShowVocabToolkit,
  onCreateDeck,
  onImport,
  onExport,
}: FlashcardHeaderProps) {
  return (
    <div
      className="rounded-[32px] border p-6"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 94%, #6366f1 6%), var(--bg2))',
        borderColor: 'color-mix(in srgb, var(--border) 84%, #6366f1 16%)',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border"
            style={{
              background: 'rgba(99,102,241,.10)',
              borderColor: 'rgba(99,102,241,.16)',
              color: '#818cf8',
            }}>
            <Layers size={15} />
            Flashcard Workspace
          </div>

          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
            Học thông minh bằng flashcard
          </h1>
          <p className="text-[13px] mt-2 max-w-2xl leading-6" style={{ color: 'var(--text3)' }}>
            Ôn lặp ngắt quãng (SRS): thẻ đến hạn mỗi ngày · đảo chiều từ/nghĩa · gõ đáp án · streak khi hoàn thành phiên.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onCreateFolder}
            className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <FolderPlus size={15} />
            Tạo folder
          </button>

          <button
            onClick={onShowVocabToolkit}
            className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <BookMarked size={15} />
            Dán từ vựng
          </button>

          {onImport && (
            <button
              onClick={onImport}
              className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <Upload size={15} />
              Import
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <Download size={15} />
              Export
            </button>
          )}

          <button
            onClick={onCreateDeck}
            className="h-11 px-5 rounded-2xl text-[13px] font-medium flex items-center gap-2 shadow-sm"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <Plus size={15} />
            Tạo bộ thẻ
          </button>
        </div>
      </div>
    </div>
  )
}
