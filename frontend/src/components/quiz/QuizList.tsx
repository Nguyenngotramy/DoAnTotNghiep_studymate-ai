import type { QuizSet, QuizFolder } from '@/types'
import QuizCard from './QuizCard'

interface QuizListProps {
  quizSets: QuizSet[]
  folders: QuizFolder[]
  folderMap: Map<string, QuizFolder>
  draggingQuizId: string | null
  dropFolderId: string | null
  openMenuId: string | null
  onStart: (set: QuizSet, mode: 'ALL' | 'WEAK') => void
  onEdit: (set: QuizSet) => void
  onDelete: (set: QuizSet) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onMenuToggle: (id: string) => void
  onMenuClose: () => void
}

export default function QuizList({
  quizSets,
  folders,
  folderMap,
  draggingQuizId,
  dropFolderId,
  openMenuId,
  onStart,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onMenuToggle,
  onMenuClose,
}: QuizListProps) {
  if (quizSets.length === 0) {
    return (
      <div
        className="rounded-[30px] border p-12 text-center"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="text-5xl mb-3">📝</div>
        <p className="text-[15px]" style={{ color: 'var(--text2)' }}>
          Chưa có bộ quiz nào
        </p>
        <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
          Bạn có thể tự tạo bộ quiz hoặc lưu từ tài liệu nhóm sau khi AI generate
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {quizSets.map(set => {
        const folder = set.folderId ? folderMap.get(set.folderId) : null
        const isDragging = draggingQuizId === set.id

        return (
          <QuizCard
            key={set.id}
            quizSet={set}
            folder={folder}
            isDragging={isDragging}
            onStart={onStart}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            openMenuId={openMenuId}
            onMenuToggle={onMenuToggle}
            onMenuClose={onMenuClose}
          />
        )
      })}
    </div>
  )
}
