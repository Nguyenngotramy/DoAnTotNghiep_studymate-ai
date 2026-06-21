import { BarChart3, CheckCircle, Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react'

interface ProjectKpiCardsProps {
  summary: any
  timeline: any
}

export default function ProjectKpiCards({ summary, timeline }: ProjectKpiCardsProps) {
  const kpis = [
    {
      label: 'Tổng task',
      value: summary.totalTasks,
      icon: BarChart3,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.14)',
    },
    {
      label: 'Hoàn thành',
      value: summary.doneTasks,
      icon: CheckCircle,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.14)',
    },
    {
      label: 'Đang làm',
      value: summary.inProgressTasks,
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.14)',
    },
    {
      label: 'Chưa làm',
      value: summary.todoTasks,
      icon: BarChart3,
      color: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.14)',
    },
    {
      label: 'Quá hạn',
      value: summary.overdueTasks,
      icon: AlertTriangle,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.14)',
    },
    {
      label: 'Hoàn thành',
      value: `${summary.completionPercent.toFixed(0)}%`,
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.14)',
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <div
            key={index}
            className="min-h-[120px] rounded-3xl border p-4"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="p-2 rounded-lg"
                style={{ background: kpi.bg }}
              >
                <Icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {kpi.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>
              {kpi.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
