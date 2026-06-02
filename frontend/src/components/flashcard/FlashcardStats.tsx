interface FlashcardStatsProps {
  totalDecks: number
  totalCards: number
  aiDeckCount: number
  personalDeckCount: number
}

export default function FlashcardStats({
  totalDecks,
  totalCards,
  aiDeckCount,
  personalDeckCount,
}: FlashcardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
      {[
        { label: 'Tổng bộ thẻ', value: totalDecks, color: '#818cf8' },
        { label: 'Tổng số thẻ', value: totalCards, color: '#10b981' },
        { label: 'AI / Cá nhân', value: `${aiDeckCount} / ${personalDeckCount}`, color: '#f59e0b' },
      ].map(item => (
        <div
          key={item.label}
          className="rounded-2xl border p-4"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <div className="text-[12px]" style={{ color: 'var(--text3)' }}>
            {item.label}
          </div>
          <div className="text-[28px] font-semibold mt-1" style={{ color: item.color }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
