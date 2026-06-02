import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi, groupApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import {
  Users,
  CheckSquare,
  FileText,
  Brain,
  ArrowRight,
  TrendingUp,
  Clock,
  FolderKanban,
  MessageCircle,
  Upload,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: any
  color: string
  sub?: string
}) => (
  <div
    className="border rounded-xl p-4 relative overflow-hidden"
    style={{
      background: 'var(--bg2)',
      borderColor: 'var(--border)',
    }}
  >
    <div
      className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[.07] translate-x-5 -translate-y-5"
      style={{ background: color }}
    />
    <div className="flex items-start justify-between mb-3">
      <span
        className="text-[11px] font-medium uppercase tracking-[.05em]"
        style={{ color: 'var(--text3)' }}
      >
        {label}
      </span>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon size={14} style={{ color }} />
      </div>
    </div>

    <div
      className="text-[28px] font-semibold tracking-tight font-['DM_Mono']"
      style={{ color }}
    >
      {value}
    </div>

    {sub && (
      <div className="text-[11px] mt-1.5" style={{ color: 'var(--text3)' }}>
        {sub}
      </div>
    )}
  </div>
)

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildActivityContent(a: any) {
  // Hỗ trợ backend cũ: đã có html sẵn
  if (a?.html) {
    return {
      html: a.html,
      icon: a.icon ?? '•',
      color: a.color ?? '#22c55e',
    }
  }

  const type = String(a?.type || a?.action || '').toUpperCase()
  const actor = a?.actorName || a?.userName || 'Bạn'
  const groupName = a?.groupName || a?.groupTitle || ''
  const taskTitle = a?.taskTitle || a?.taskName || a?.entityName || ''
  const documentName = a?.documentName || ''
  const quizTitle = a?.quizTitle || ''
  const extraText = a?.message || a?.description || ''

  if (type.includes('TASK') && type.includes('CREATE')) {
    return {
      icon: '✓',
      color: '#22c55e',
      html: `<b>${escapeHtml(actor)}</b> đã tạo task <b>${escapeHtml(taskTitle || 'mới')}</b>${groupName ? ` trong nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('TASK') && (type.includes('DONE') || type.includes('COMPLETE'))) {
    return {
      icon: '✓',
      color: '#22c55e',
      html: `<b>${escapeHtml(actor)}</b> đã hoàn thành task <b>${escapeHtml(taskTitle || 'nhiệm vụ')}</b>${groupName ? ` ở nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('TASK') && type.includes('UPDATE')) {
    return {
      icon: '✎',
      color: '#6366f1',
      html: `<b>${escapeHtml(actor)}</b> đã cập nhật task <b>${escapeHtml(taskTitle || 'nhiệm vụ')}</b>${groupName ? ` ở nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('CHAT') || type.includes('MESSAGE')) {
    return {
      icon: '💬',
      color: '#06b6d4',
      html: `<b>${escapeHtml(actor)}</b> vừa gửi tin nhắn${groupName ? ` trong nhóm <b>${escapeHtml(groupName)}</b>` : ''}${extraText ? `: ${escapeHtml(extraText)}` : '.'}`,
    }
  }

  if (type.includes('DOC') || type.includes('DOCUMENT') || type.includes('UPLOAD')) {
    return {
      icon: '↑',
      color: '#f59e0b',
      html: `<b>${escapeHtml(actor)}</b> đã tải lên tài liệu <b>${escapeHtml(documentName || 'mới')}</b>${groupName ? ` vào nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('QUIZ')) {
    return {
      icon: '🧠',
      color: '#8b5cf6',
      html: `<b>${escapeHtml(actor)}</b> đã làm quiz <b>${escapeHtml(quizTitle || 'mới')}</b>${extraText ? ` — ${escapeHtml(extraText)}` : '.'}`,
    }
  }

  if (type.includes('GROUP') && type.includes('JOIN')) {
    return {
      icon: '👥',
      color: '#6366f1',
      html: `<b>${escapeHtml(actor)}</b> đã tham gia nhóm <b>${escapeHtml(groupName || 'mới')}</b>.`,
    }
  }

  return {
    icon: a?.icon ?? '•',
    color: a?.color ?? '#6366f1',
    html: extraText
      ? escapeHtml(extraText)
      : `<b>${escapeHtml(actor)}</b> vừa có một hoạt động mới.`,
  }
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardApi.getActivity,
  })

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupApi.list,
  })

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  const mappedActivity = useMemo(() => {
    return (activity || []).map((a: any) => ({
      ...a,
      ...buildActivityContent(a),
    }))
  }, [activity])

  const activeTaskCount = stats?.activeTaskCount ?? 0
  const upcomingDeadlineCount = stats?.upcomingDeadlineCount ?? stats?.nearDeadlineTaskCount ?? null
  const documentCount = stats?.documentCount ?? 0
  const quizAccuracy =
    typeof stats?.quizAccuracy === 'number' ? `${stats.quizAccuracy}%` : '—'

  return (
    <div className="page-enter space-y-6 max-w-6xl">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          {greeting}, {user?.fullName?.split(' ').pop()} 👋
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text3)' }}>
          Đây là tổng quan hoạt động học tập của bạn hôm nay.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Nhóm tham gia"
          value={stats?.groupCount ?? groups.length}
          icon={Users}
          color="#6366f1"
          sub="nhóm đang hoạt động"
        />
        <StatCard
          label="Task đang làm"
          value={activeTaskCount}
          icon={CheckSquare}
          color="#14b8a6"
          sub={
            upcomingDeadlineCount != null
              ? `${upcomingDeadlineCount} task gần deadline`
              : 'đang thực hiện'
          }
        />
        <StatCard
          label="Tài liệu"
          value={documentCount}
          icon={FileText}
          color="#f59e0b"
          sub="đã upload lên nhóm"
        />
        <StatCard
          label="Quiz accuracy"
          value={quizAccuracy}
          icon={Brain}
          color="#22c55e"
          sub={
            typeof stats?.quizAccuracy === 'number'
              ? 'trung bình tất cả bài'
              : 'chưa có dữ liệu quiz'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
              Nhóm học của tôi
            </h2>
            <Link
              to="/groups"
              className="flex items-center gap-1 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>

          {groupsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-24 rounded-xl border animate-pulse"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--border)',
                  }}
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div
              className="border rounded-xl p-8 text-center"
              style={{
                background: 'var(--bg2)',
                borderColor: 'var(--border)',
              }}
            >
              <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
              <p className="text-[13px] mb-3" style={{ color: 'var(--text2)' }}>
                Bạn chưa tham gia nhóm nào
              </p>
              <Link
                to="/groups"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-[12px] font-medium text-white transition-colors"
              >
                Tạo hoặc tham gia nhóm
              </Link>
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g.id}
                className="border rounded-xl p-4 transition-all hover:bg-white/[.02]"
                style={{
                  background: 'var(--bg2)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: g.coverColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {g.name}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg3)',
                          color: 'var(--text2)',
                        }}
                      >
                        {g.subject}
                      </span>
                    </div>

                    <p className="text-[11px] mb-3" style={{ color: 'var(--text3)' }}>
                      {g.description} · {g.memberCount} thành viên
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--bg4)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${g.progress}%`, background: g.coverColor }}
                        />
                      </div>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text2)' }}>
                        {g.progress}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <Link
                      to={`/groups/${g.id}/kanban`}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                      style={{
                        background: 'var(--bg3)',
                        color: 'var(--text2)',
                      }}
                    >
                      Task
                    </Link>
                    <Link
                      to={`/groups/${g.id}/chat`}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                      style={{
                        background: 'var(--bg3)',
                        color: 'var(--text2)',
                      }}
                    >
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            Hoạt động gần đây
          </h2>

          <div className="space-y-2">
            {mappedActivity.length === 0 ? (
              <div
                className="border rounded-xl p-6 text-center"
                style={{
                  background: 'var(--bg2)',
                  borderColor: 'var(--border)',
                }}
              >
                <Clock size={24} className="mx-auto mb-2" style={{ color: 'var(--text3)' }} />
                <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Chưa có hoạt động nào
                </p>
              </div>
            ) : (
              mappedActivity.map((a: any, i: number) => (
                <div
                  key={a.id ?? i}
                  className="flex items-start gap-2.5 border rounded-xl p-3"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}18` }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: a.color }}>
                      {a.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: 'var(--text2)' }}
                      dangerouslySetInnerHTML={{ __html: a.html }}
                    />
                    <p
                      className="text-[10px] mt-1 font-mono"
                      style={{ color: 'var(--text3)' }}
                    >
                      {a.createdAt
                        ? formatDistanceToNow(new Date(a.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })
                        : 'vừa xong'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{
              background: 'linear-gradient(to bottom right, rgba(99,102,241,.08), rgba(168,85,247,.05))',
              borderColor: 'rgba(99,102,241,.25)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-indigo-400" />
              <span className="text-[12px] font-medium text-indigo-300">Dự đoán học lực</span>
            </div>

            <p className="text-[11px] mb-3" style={{ color: 'var(--text2)' }}>
              Nhập điểm các môn học để AI dự đoán học lực và gợi ý trường ĐH phù hợp.
            </p>

            <Link
              to="/predict"
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-[12px] font-medium text-white transition-colors"
            >
              Dự đoán ngay <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}