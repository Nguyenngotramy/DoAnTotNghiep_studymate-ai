import { useQuery } from '@tanstack/react-query'
import { projectApi } from '@/api/services'
import { X, BarChart3, Calendar, Clock as ClockIcon, Info } from 'lucide-react'
import MemberProgressRow from './MemberProgressRow'

interface ProgressViewProps {
  groupId: string
  projectId: string
  onClose: () => void
}

export default function ProgressView({ groupId, projectId, onClose }: ProgressViewProps) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectApi.getProjectProgress(groupId, projectId),
    enabled: !!projectId,
  })

  if (!progress?.data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-2xl rounded-2xl p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
          <div className="text-center py-8" style={{ color: 'var(--text2)' }}>
            Đang tải...
          </div>
        </div>
      </div>
    )
  }

  const { project, summary, timeline, members } = progress.data

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
    return 'var(--text3)'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg2)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              Tiến độ dự án
            </h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text2)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Timeline Info */}
        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Timeline</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {timeline.totalDays} ngày tổng
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text3)' }}>
            <Calendar size={14} />
            <span>
              {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: getCountdownColor() }}>
            <ClockIcon size={14} />
            <span>{getCountdownText()}</span>
          </div>
          {/* Timeline Progress Bar */}
          <div className="mt-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(timeline.elapsedPercent, 100)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text3)' }}>
              <span>Đã qua: {timeline.elapsedPercent.toFixed(0)}%</span>
              <span>Còn lại: {(100 - timeline.elapsedPercent).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tổng quan
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text2)' }}>
              Tổng số task hoàn thành
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {summary.doneTasks} / {summary.totalTasks}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(summary.completionPercent, 100)}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text3)' }}>
            <span>{summary.todoTasks} chờ làm</span>
            <span>{summary.inProgressTasks} đang làm</span>
            <span>{summary.doneTasks} hoàn thành</span>
          </div>
          {summary.totalTasks === 0 && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-start gap-2">
                <Info size={14} style={{ color: 'var(--text3)', marginTop: '1px' }} />
                <p className="text-xs" style={{ color: 'var(--text2)' }}>
                  Chưa có task nào. Vào "Bảng công việc" để tạo task và giao cho thành viên.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress vs Timeline Comparison */}
        {summary.totalTasks > 0 && (
          <div className="p-4 rounded-2xl border mb-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              So sánh tiến độ
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text2)' }}>Thời gian đã trôi qua</span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{timeline.elapsedPercent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text2)' }}>Công việc hoàn thành</span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{summary.completionPercent.toFixed(0)}%</span>
              </div>
              <div className="mt-2 p-2 rounded-lg text-xs" style={{
                background: summary.completionPercent >= timeline.elapsedPercent ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                color: summary.completionPercent >= timeline.elapsedPercent ? '#86efac' : '#fca5a5'
              }}>
                {summary.completionPercent >= timeline.elapsedPercent ? '✓ Đúng tiến độ' : '⚠ Chậm tiến độ'}
              </div>
            </div>
          </div>
        )}

        {/* Member Progress */}
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Tiến độ thành viên
          </h4>
          <div className="space-y-3">
            {members && members.length > 0 ? (
              members.map((member: any) => (
                <MemberProgressRow
                  key={member.userId}
                  fullName={member.fullName}
                  role={member.role}
                  totalTasks={member.totalTasks}
                  doneTasks={member.doneTasks}
                  inProgressTasks={member.inProgressTasks}
                  todoTasks={member.todoTasks}
                  overdueTasks={member.overdueTasks}
                  completionPercent={member.completionPercent}
                  statusLabel={member.statusLabel}
                />
              ))
            ) : (
              <div className="text-sm text-center py-4" style={{ color: 'var(--text2)' }}>
                Chưa có thành viên nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
