import { useState } from 'react'

interface MemberProgressTableProps {
  members: any[]
}

export default function MemberProgressTable({ members }: MemberProgressTableProps) {
  const [sortBy, setSortBy] = useState('completionPercent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedMembers = [...members].sort((a, b) => {
    const aValue = a[sortBy]
    const bValue = b[sortBy]
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    }
    return aValue < bValue ? 1 : -1
  })

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getStatusColor = (statusLabel: string) => {
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

  const getStatusTextColor = (statusLabel: string) => {
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

  return (
    <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Chi tiết công việc theo thành viên
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-3 px-4 text-xs font-medium cursor-pointer" style={{ color: 'var(--text2)' }} onClick={() => handleSort('fullName')}>
                Thành viên {sortBy === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium cursor-pointer" style={{ color: 'var(--text2)' }} onClick={() => handleSort('totalTasks')}>
                Tổng {sortBy === 'totalTasks' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Chờ làm
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Đang làm
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Hoàn thành
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium cursor-pointer" style={{ color: 'var(--text2)' }} onClick={() => handleSort('overdueTasks')}>
                Quá hạn {sortBy === 'overdueTasks' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium cursor-pointer" style={{ color: 'var(--text2)' }} onClick={() => handleSort('completionPercent')}>
                % {sortBy === 'completionPercent' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                      {member.fullName}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>
                      {member.role === 'LEADER' ? 'Nhóm trưởng' : 'Thành viên'}
                    </div>
                  </div>
                </td>
                <td className="text-right py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                  {member.totalTasks}
                </td>
                <td className="text-right py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                  {member.todoTasks}
                </td>
                <td className="text-right py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                  {member.inProgressTasks}
                </td>
                <td className="text-right py-3 px-4 text-sm" style={{ color: 'var(--text)' }}>
                  {member.doneTasks}
                </td>
                <td className="text-right py-3 px-4 text-sm" style={{ color: member.overdueTasks > 0 ? '#ef4444' : 'var(--text)' }}>
                  {member.overdueTasks}
                </td>
                <td className="text-right py-3 px-4 text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {member.completionPercent.toFixed(0)}%
                </td>
                <td className="text-center py-3 px-4">
                  <div
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{ background: getStatusColor(member.statusLabel), color: getStatusTextColor(member.statusLabel) }}
                  >
                    {member.statusLabel}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
