import type { FlashcardDeck, FlashcardFolder } from '@/types'
import FlashcardCard from './FlashcardCard'


interface FlashcardListProps {
  decks: FlashcardDeck[]
  folders: FlashcardFolder[]
  folderMap: Map<string, FlashcardFolder>
  draggingDeckId: string | null
  dropFolderId: string | null
  openMenuId: string | null
  onStart: (deck: FlashcardDeck, mode: 'DUE' | 'NEW' | 'ALL') => void
  onStartQuiz: (deck: FlashcardDeck) => void
  onEdit: (deck: FlashcardDeck) => void
  onDelete: (deck: FlashcardDeck) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onMenuToggle: (id: string) => void
  onMenuClose: () => void
}

export default function FlashcardList({
  decks,
  folders,
  folderMap,
  draggingDeckId,
  dropFolderId,
  openMenuId,
  onStart,
  onStartQuiz,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onMenuToggle,
  onMenuClose,
}: FlashcardListProps) {
  if (decks.length === 0) {
    return (
      <div
        className="rounded-[30px] border p-12 text-center"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="text-5xl mb-3">📚</div>
        <p className="text-[15px]" style={{ color: 'var(--text2)' }}>
          Chưa có bộ flashcard nào
        </p>
        <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
          Bạn có thể tự tạo bộ thẻ hoặc lưu từ tài liệu nhóm sau khi AI generate
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {decks.map(deck => {
        const folder = deck.folderId ? folderMap.get(deck.folderId) : null
        const isDragging = draggingDeckId === deck.id

        return (
          <FlashcardCard
            key={deck.id}
            deck={deck}
            folder={folder}
            isDragging={isDragging}
            onStart={onStart}
            onStartQuiz={onStartQuiz}
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
