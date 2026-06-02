import { useState } from 'react'
import UserAvatar from './UserAvatar'

interface MemberProgressRowProps {
  fullName: string
  avatar?: string
  role?: string
  totalTasks: number
  doneTasks: number
  inProgressTasks: number
  todoTasks: number
  overdueTasks: number
  completionPercent: number
  statusLabel?: string
}

export default function MemberProgressRow({
  fullName,
  avatar,
  role,
  totalTasks,
  doneTasks,
  inProgressTasks,
  todoTasks,
  overdueTasks,
  completionPercent,
  statusLabel,
}: MemberProgressRowProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const safePercent = Math.max(0, Math.min(100, completionPercent))
  const avatarLeft = `calc(${safePercent}% - 18px)`

  const getStatusColor = () => {
    switch (statusLabel) {
      case 'Chậm tiến độ':
        return 'rgba(239, 68, 68, 0.14)'
      case 'Hoàn thành':
        return 'rgba(34, 197, 94, 0.14)'
      case 'Chưa bắt đầu':
        return 'rgba(156, 163, 175, 0.14)'
      default:
        return 'rgba(99, 102, 241, 0.14)'
    }
  }

  const getStatusTextColor = () => {
    switch (statusLabel) {
      case 'Chậm tiến độ':
        return '#ef4444'
      case 'Hoàn thành':
        return '#22c55e'
      case 'Chưa bắt đầu':
        return '#9ca3af'
      default:
        return '#6366f1'
    }
  }

  const getRoleBadge = () => {
    if (role === 'LEADER') {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ background: 'rgba(99, 102, 241, 0.14)', color: '#818cf8' }}
        >
          Nhóm trưởng
        </span>
      )
    }
    return null
  }

  return (
    <div className="p-4 rounded-2xl border mb-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={fullName} avatar={avatar} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                {fullName}
              </span>
              {getRoleBadge()}
            </div>
            <div className="text-xs" style={{ color: 'var(--text2)' }}>
              {doneTasks} hoàn thành • {inProgressTasks} đang làm • {todoTasks} chưa làm
              {overdueTasks > 0 && ` • ${overdueTasks} quá hạn`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {safePercent.toFixed(0)}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text2)' }}>
            {doneTasks}/{totalTasks} task
          </div>
        </div>
      </div>

      {/* Progress Bar with Avatar */}
      <div className="relative h-8 mb-3">
        {/* Progress Track */}
        <div
          className="absolute top-1/2 left-0 right-0 h-2 rounded-full -translate-y-1/2"
          style={{ background: 'var(--bg3)' }}
        />

        {/* Progress Fill */}
        <div
          className="absolute top-1/2 left-0 h-2 rounded-full -translate-y-1/2 transition-all duration-500"
          style={{
            width: `${safePercent}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />

        {/* Avatar Marker */}
        <div
          className="absolute top-0 -translate-x-1/2 cursor-pointer transition-all duration-500"
          style={{ left: avatarLeft }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            className="w-9 h-9 rounded-full border-2 shadow-lg transition-transform hover:scale-110"
            style={{ background: 'var(--bg2)', borderColor: 'var(--bg1)' }}
          >
            <UserAvatar name={fullName} avatar={avatar} size={36} />
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-10"
              style={{ background: 'var(--bg1)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {fullName}
              </div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>
                {safePercent.toFixed(0)}% hoàn thành
              </div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>
                {doneTasks}/{totalTasks} task
              </div>
              {overdueTasks > 0 && (
                <div className="text-xs" style={{ color: '#ef4444' }}>
                  {overdueTasks} quá hạn
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: getStatusColor(), color: getStatusTextColor() }}
        >
          {statusLabel}
        </div>
        {totalTasks === 0 && (
          <span className="text-xs" style={{ color: 'var(--text3)' }}>
            Chưa có task
          </span>
        )}
      </div>
    </div>
  )
}
