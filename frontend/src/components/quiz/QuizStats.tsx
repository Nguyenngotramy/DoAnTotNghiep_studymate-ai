interface QuizStatsProps {
  totalQuizSets: number
  totalQuestions: number
  aiQuizCount: number
  personalQuizCount: number
}

export default function QuizStats({
  totalQuizSets,
  totalQuestions,
  aiQuizCount,
  personalQuizCount,
}: QuizStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
      {[
        { label: 'Tổng bộ quiz', value: totalQuizSets, color: '#818cf8' },
        { label: 'Tổng câu hỏi', value: totalQuestions, color: '#10b981' },
        { label: 'AI / Cá nhân', value: `${aiQuizCount} / ${personalQuizCount}`, color: '#f59e0b' },
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
