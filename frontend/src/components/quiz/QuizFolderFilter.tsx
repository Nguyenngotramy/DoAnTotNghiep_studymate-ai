import { Folder, FolderOpen, Inbox, MoveRight } from 'lucide-react'
import type { QuizFolder } from '@/types'

interface QuizFolderFilterProps {
  folders: QuizFolder[]
  folderId: 'ALL' | 'NO_FOLDER' | string
  onFolderChange: (value: 'ALL' | 'NO_FOLDER' | string) => void
  dropFolderId: string | null
  onDropFolderIdChange: (value: string | null) => void
  onDropQuiz: (quizId: string, folderId: string) => void
  onDropNoFolder: (quizId: string) => void
}

export default function QuizFolderFilter({
  folders,
  folderId,
  onFolderChange,
  dropFolderId,
  onDropFolderIdChange,
  onDropQuiz,
  onDropNoFolder,
}: QuizFolderFilterProps) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen size={15} style={{ color: 'var(--text3)' }} />
        <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
          Kéo thả bộ quiz vào folder để phân loại
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onFolderChange('ALL')}
          className="px-4 h-10 rounded-2xl text-[12px] font-medium border"
          style={{
            background: folderId === 'ALL' ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
            borderColor: folderId === 'ALL' ? 'rgba(99,102,241,.24)' : 'var(--border)',
            color: folderId === 'ALL' ? '#818cf8' : 'var(--text2)',
          }}
        >
          Tất cả folder
        </button>

        <button
          onClick={() => onFolderChange('NO_FOLDER')}
          className="px-4 h-10 rounded-2xl text-[12px] font-medium border"
          style={{
            background: folderId === 'NO_FOLDER' ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
            borderColor: folderId === 'NO_FOLDER' ? 'rgba(99,102,241,.24)' : 'var(--border)',
            color: folderId === 'NO_FOLDER' ? '#818cf8' : 'var(--text2)',
          }}
          onDragOver={e => {
            e.preventDefault()
            onDropFolderIdChange('NO_FOLDER')
          }}
          onDragLeave={() => onDropFolderIdChange(null)}
          onDrop={e => {
            e.preventDefault()
            const quizId = e.dataTransfer.getData('quizId')
            if (quizId) onDropNoFolder(quizId)
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Inbox size={13} />
            Chưa vào folder
          </span>
        </button>

        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            className="px-4 h-10 rounded-2xl text-[12px] font-medium border flex items-center gap-1.5 transition-all"
            style={{
              background:
                dropFolderId === folder.id
                  ? 'rgba(99,102,241,.14)'
                  : folderId === folder.id
                    ? 'rgba(99,102,241,.12)'
                    : 'var(--bg3)',
              borderColor:
                dropFolderId === folder.id
                  ? '#818cf8'
                  : folderId === folder.id
                    ? 'rgba(99,102,241,.24)'
                    : 'var(--border)',
              color: folderId === folder.id || dropFolderId === folder.id ? '#818cf8' : 'var(--text2)',
            }}
            onDragOver={e => {
              e.preventDefault()
              onDropFolderIdChange(folder.id)
            }}
            onDragLeave={() => onDropFolderIdChange(null)}
            onDrop={e => {
              e.preventDefault()
              const quizId = e.dataTransfer.getData('quizId')
              if (quizId) onDropQuiz(quizId, folder.id)
            }}
          >
            <Folder size={13} style={{ color: folder.color || '#6366f1' }} />
            {folder.name}
            {dropFolderId === folder.id && <MoveRight size={13} />}
          </button>
        ))}
      </div>
    </div>
  )
}
