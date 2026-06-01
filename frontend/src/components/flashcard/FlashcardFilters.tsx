import { Search } from 'lucide-react'

interface FlashcardFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  sourceType: 'ALL' | 'PERSONAL' | 'DOCUMENT_AI'
  onSourceTypeChange: (value: 'ALL' | 'PERSONAL' | 'DOCUMENT_AI') => void
}

export default function FlashcardFilters({
  search,
  onSearchChange,
  sourceType,
  onSourceTypeChange,
}: FlashcardFiltersProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4 mt-5">
      <div
        className="h-12 rounded-2xl border flex items-center px-4 gap-2"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
      >
        <Search size={16} style={{ color: 'var(--text3)' }} />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên bộ thẻ, tài liệu hoặc nhóm..."
          className="bg-transparent outline-none w-full text-[13px]"
          style={{ color: 'var(--text)' }}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'PERSONAL', label: 'Cá nhân ' },
          { key: 'DOCUMENT_AI', label: 'AI từ tài liệu' },
        ].map(type => (
          <button
            key={type.key}
            onClick={() => onSourceTypeChange(type.key as any)}
            className="px-4 h-11 rounded-2xl text-[12px] font-medium border"
            style={{
              background: sourceType === type.key ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
              borderColor: sourceType === type.key ? 'rgba(99,102,241,.24)' : 'var(--border)',
              color: sourceType === type.key ? '#818cf8' : 'var(--text2)',
            }}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
