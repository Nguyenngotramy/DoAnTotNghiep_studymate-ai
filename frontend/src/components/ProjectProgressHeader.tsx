import { ArrowLeft, RefreshCw, Download } from 'lucide-react'

interface ProjectProgressHeaderProps {
  project: any
  timeline: any
  summary: any
  onBack: () => void
  onRefresh: () => void
  onExport: () => void
}

export default function ProjectProgressHeader({
  project,
  timeline,
  summary,
  onBack,
  onRefresh,
  onExport,
}: ProjectProgressHeaderProps) {
  const getCountdownText = () => {
    if (!timeline) return ''
    const { daysLeft } = timeline
    if (daysLeft > 0) return `Còn ${daysLeft} ngày`
    if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`
    return 'Hết hạn hôm nay'
  }

  const getCountdownColor = () => {
    if (!timeline) return 'var(--text3)'
    const { daysLeft } = timeline
    if (daysLeft < 0) return '#ef4444'
    if (daysLeft <= 3) return '#f97316'
    return 'var(--text3)'
  }

  const getScheduleStatusLabel = () => {
    switch (summary.scheduleStatus) {
      case 'BEHIND':
        return { text: 'Chậm tiến độ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)' }
      case 'ON_TRACK':
        return { text: 'Đúng tiến độ', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.14)' }
      case 'AHEAD':
        return { text: 'Vượt tiến độ', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.14)' }
      case 'COMPLETED':
        return { text: 'Hoàn thành', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.14)' }
      case 'NO_TASKS':
        return { text: 'Chưa có task', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.14)' }
      default:
        return { text: 'Đang thực hiện', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.14)' }
    }
  }

  const scheduleStatus = getScheduleStatusLabel()

  return (
    <div className="mb-5 flex flex-col gap-4 rounded-3xl border p-4 sm:mb-6 sm:p-5 lg:flex-row lg:items-center lg:justify-between" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <button type="button"
          aria-label="Quay lại bảng dự án" onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="line-clamp-2 text-2xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-xs" style={{ color: 'var(--text2)' }}>
              {project.startDate && new Date(project.startDate).toLocaleDateString('vi-VN')} -{' '}
              {project.endDate && new Date(project.endDate).toLocaleDateString('vi-VN')}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ color: getCountdownColor() }}
            >
              {getCountdownText()}
            </span>
            <div
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: scheduleStatus.bg, color: scheduleStatus.color }}
            >
              {scheduleStatus.text}
            </div>
          </div>
        </div>
      </div>
      <div className="grid w-full grid-cols-[auto_1fr] gap-2 lg:flex lg:w-auto">
        <button type="button"
          aria-label="Làm mới tiến độ" onClick={onRefresh}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-medium transition-colors"
          style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
        <button type="button"
          aria-label="Xuất báo cáo tiến độ" onClick={onExport}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium text-white transition-colors"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <Download size={16} />
          Xuất báo cáo
        </button>
      </div>
    </div>
  )
}
