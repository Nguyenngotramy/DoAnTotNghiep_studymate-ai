import { HelpCircle, FolderPlus, Plus } from 'lucide-react'

interface QuizHeaderProps {
  onCreateFolder: () => void
  onCreateQuiz: () => void
}

export default function QuizHeader({ onCreateFolder, onCreateQuiz }: QuizHeaderProps) {
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
          <div
            className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border"
            style={{
              background: 'rgba(99,102,241,.10)',
              borderColor: 'rgba(99,102,241,.16)',
              color: '#818cf8',
            }}
          >
            <HelpCircle size={15} />
            Quiz Workspace
          </div>

          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
            Kiểm tra kiến thức bằng quiz
          </h1>
          <p className="text-[13px] mt-2 max-w-2xl leading-6" style={{ color: 'var(--text3)' }}>
            Tạo bộ quiz cá nhân, lưu quiz từ tài liệu nhóm và kéo thả bộ quiz vào folder để quản lý gọn hơn.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreateFolder}
            className="h-11 px-4 rounded-2xl border text-[13px] font-medium flex items-center gap-2"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          >
            <FolderPlus size={15} />
            Tạo folder
          </button>

          <button
            onClick={onCreateQuiz}
            className="h-11 px-5 rounded-2xl text-[13px] font-medium flex items-center gap-2 shadow-sm"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <Plus size={15} />
            Tạo bộ quiz
          </button>
        </div>
      </div>
    </div>
  )
}
