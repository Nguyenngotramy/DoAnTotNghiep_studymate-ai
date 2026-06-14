import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi, groupApi, taskApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import {
  Users,
  FileText,
  Brain,
  ArrowRight,
  TrendingUp,
  Clock,
  BookOpen,
  Sparkles,
  CalendarClock,
  Target,
  Activity,
  TimerReset,
  ChevronRight,
  Plus,
  AlertTriangle,
  Flag,
  CircleCheckBig,
} from 'lucide-react'
import { formatDistanceToNow, differenceInHours, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { TaskPriority, TaskStatus } from '@/types'
import AdvertisementBanner from '@/components/AdvertisementBanner'

type ProgressResponse = {
  summary: {
    total: number
    todo: number
    inProgress: number
    done: number
    overdue: number
  }
  byMonth: Record<string, number>
  roadmap: Array<{
    id: string
    title: string
    groupId?: string
    groupName?: string
    personal: boolean
    status: TaskStatus
    priority: TaskPriority
    deadline?: string
    label?: string
  }>
}

function escapeHtml(text: string) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback)
  return Number.isNaN(n) ? fallback : n
}

function clampProgress(value: unknown) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function buildTaskLink(task: ProgressResponse['roadmap'][number]) {
  if (task.personal) return `/kanban/personal/${task.id}`
  if (task.groupId) return `/groups/${task.groupId}/kanban/${task.id}`
  return '/tasks'
}

function priorityLabel(priority?: TaskPriority) {
  if (priority === 'HIGH') return 'Cao'
  if (priority === 'LOW') return 'Thấp'
  return 'Trung bình'
}

function priorityColor(priority?: TaskPriority) {
  if (priority === 'HIGH') return '#ef4444'
  if (priority === 'LOW') return '#22c55e'
  return '#f59e0b'
}

function deadlineText(deadline?: string) {
  if (!deadline) return 'Chưa có deadline'

  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return 'Deadline không hợp lệ'

  const hours = differenceInHours(date, new Date())

  if (hours < 0) return `Quá hạn ${Math.abs(hours)} giờ`
  if (hours < 24) return `Còn ${Math.max(hours, 1)} giờ`
  return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
}

function buildActivityContent(a: any) {
  if (a?.html) {
    return {
      html: a.html,
      icon: a.icon ?? '•',
      color: a.color ?? '#6366f1',
      bg: `${a.color ?? '#6366f1'}14`,
    }
  }

  const type = String(a?.type || a?.action || '').toUpperCase()
  const actor = a?.actorName || a?.userName || 'Bạn'
  const groupName = a?.groupName || a?.groupTitle || ''
  const taskTitle = a?.taskTitle || a?.taskName || a?.entityName || ''
  const documentName = a?.documentName || ''
  const quizTitle = a?.quizTitle || ''
  const postTitle = a?.postTitle || ''
  const extraText = a?.message || a?.description || ''

  if (type.includes('TASK') && type.includes('CREATE')) {
    return {
      icon: '✓',
      color: '#22c55e',
      bg: 'rgba(34,197,94,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã tạo task <b>${escapeHtml(taskTitle || 'mới')}</b>${groupName ? ` trong nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('TASK') && (type.includes('DONE') || type.includes('COMPLETE'))) {
    return {
      icon: '✓',
      color: '#22c55e',
      bg: 'rgba(34,197,94,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã hoàn thành task <b>${escapeHtml(taskTitle || 'nhiệm vụ')}</b>${groupName ? ` ở nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('TASK') && type.includes('UPDATE')) {
    return {
      icon: '✎',
      color: '#6366f1',
      bg: 'rgba(99,102,241,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã cập nhật task <b>${escapeHtml(taskTitle || 'nhiệm vụ')}</b>${groupName ? ` ở nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('CHAT') || type.includes('MESSAGE')) {
    return {
      icon: '💬',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,.10)',
      html: `<b>${escapeHtml(actor)}</b> vừa gửi tin nhắn${groupName ? ` trong nhóm <b>${escapeHtml(groupName)}</b>` : ''}${extraText ? `: ${escapeHtml(extraText)}` : '.'}`,
    }
  }

  if (type.includes('DOC') || type.includes('DOCUMENT') || type.includes('UPLOAD')) {
    return {
      icon: '↑',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã tải lên tài liệu <b>${escapeHtml(documentName || 'mới')}</b>${groupName ? ` vào nhóm <b>${escapeHtml(groupName)}</b>` : ''}.`,
    }
  }

  if (type.includes('QUIZ')) {
    return {
      icon: '🧠',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã làm quiz <b>${escapeHtml(quizTitle || 'mới')}</b>${extraText ? ` — ${escapeHtml(extraText)}` : '.'}`,
    }
  }

  if (type.includes('POST') || type.includes('BLOG')) {
    return {
      icon: '✦',
      color: '#ec4899',
      bg: 'rgba(236,72,153,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã đăng bài <b>${escapeHtml(postTitle || extraText || 'mới')}</b>.`,
    }
  }

  if (type.includes('GROUP') && type.includes('JOIN')) {
    return {
      icon: '👥',
      color: '#6366f1',
      bg: 'rgba(99,102,241,.10)',
      html: `<b>${escapeHtml(actor)}</b> đã tham gia nhóm <b>${escapeHtml(groupName || 'mới')}</b>.`,
    }
  }

  return {
    icon: a?.icon ?? '•',
    color: a?.color ?? '#6366f1',
    bg: `${a?.color ?? '#6366f1'}14`,
    html: extraText
      ? escapeHtml(extraText)
      : `<b>${escapeHtml(actor)}</b> vừa có một hoạt động mới.`,
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  href,
  danger = false,
}: {
  label: string
  value: string | number
  icon: any
  color: string
  sub: string
  href?: string
  danger?: boolean
}) {
  const body = (
    <div
      className="group relative overflow-hidden rounded-[26px] border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: danger
          ? 'linear-gradient(180deg, rgba(239,68,68,.08), var(--bg2))'
          : 'linear-gradient(180deg, color-mix(in srgb, var(--bg2) 96%, white 4%), var(--bg2))',
        borderColor: danger ? 'rgba(239,68,68,.28)' : 'color-mix(in srgb, var(--border) 84%, transparent 16%)',
      }}
    >
      <div
        className="absolute -right-7 -top-8 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-125"
        style={{ background: color }}
      />
      <div
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ background: `${color}14`, color }}
      >
        <Icon size={19} />
      </div>

      <div className="pr-12">
        <p className="text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--text3)' }}>
          {label}
        </p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-[34px] font-bold leading-none tracking-tight" style={{ color }}>
            {value}
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-5" style={{ color: 'var(--text3)' }}>
          {sub}
        </p>
      </div>
    </div>
  )

  return href ? <Link to={href}>{body}</Link> : body
}

function QuickAction({
  to,
  icon: Icon,
  title,
  desc,
  color,
}: {
  to: string
  icon: any
  title: string
  desc: string
  color: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border p-3 transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${color}14`, color }}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text3)' }}>
          {desc}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
    </Link>
  )
}

function ActivityItem({ a }: { a: any }) {
  return (
    <div className="relative flex gap-3 rounded-2xl border p-3.5 transition-all hover:bg-white/[.03]" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: a.bg || `${a.color}14` }}>
        <span className="text-[13px] font-bold" style={{ color: a.color }}>
          {a.icon}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] leading-6"
          style={{ color: 'var(--text2)' }}
          dangerouslySetInnerHTML={{ __html: a.html }}
        />
        <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text3)' }}>
          <Clock size={12} />
          {a.createdAt
            ? formatDistanceToNow(new Date(a.createdAt), {
                addSuffix: true,
                locale: vi,
              })
            : 'vừa xong'}
        </div>
      </div>
    </div>
  )
}

function DeadlineTaskCard({ task }: { task: ProgressResponse['roadmap'][number] }) {
  const color = priorityColor(task.priority)
  const isLate = task.deadline ? new Date(task.deadline).getTime() < Date.now() : false

  return (
    <Link
      to={buildTaskLink(task)}
      className="group block rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: isLate ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
        borderColor: isLate ? 'rgba(239,68,68,.25)' : 'var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${isLate ? '#ef4444' : color}16`, color: isLate ? '#ef4444' : color }}
        >
          {isLate ? <AlertTriangle size={17} /> : <CalendarClock size={17} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              {task.title}
            </p>
            <ArrowRight
              size={13}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: '#818cf8' }}
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text3)' }}>
            {task.label && (
              <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--bg2)', color: 'var(--text2)' }}>
                {task.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Flag size={11} style={{ color }} />
              {priorityLabel(task.priority)}
            </span>
            <span>{task.personal ? 'Cá nhân' : 'Nhóm'}</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: isLate ? '#ef4444' : '#f59e0b' }}>
            <Clock size={12} />
            {deadlineText(task.deadline)}
          </div>
        </div>
      </div>
    </Link>
  )
}

function GroupCard({ g }: { g: any }) {
  const progress = clampProgress(g.progress)
  const coverColor = g.coverColor || '#6366f1'

  return (
    <div
      className="rounded-[26px] border p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${coverColor}16`, color: coverColor }}
        >
          <Users size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              {g.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
            >
              {g.subject || 'Nhóm học'}
            </span>
          </div>

          <p className="mt-1 line-clamp-1 text-[12px]" style={{ color: 'var(--text3)' }}>
            {g.description || 'Chưa có mô tả'} · {g.memberCount ?? 0} thành viên
          </p>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--text3)' }}>Tiến độ nhóm</span>
              <span className="font-semibold" style={{ color: coverColor }}>
                {progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg4)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${coverColor}aa, ${coverColor})`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            to={`/groups/${g.id}/kanban`}
            className="rounded-xl px-3 py-2 text-center text-[11px] font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
          >
            Task
          </Link>
          <Link
            to={`/groups/${g.id}/chat`}
            className="rounded-xl px-3 py-2 text-center text-[11px] font-medium transition-all hover:opacity-80"
            style={{ background: `${coverColor}14`, color: coverColor }}
          >
            Chat
          </Link>
        </div>
      </div>
    </div>
  )
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

  const { data: progress } = useQuery<ProgressResponse>({
    queryKey: ['dashboard-task-progress'],
    queryFn: () => taskApi.myProgress(),
    retry: 1,
  })

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  const mappedActivity = useMemo(() => {
    return (activity || []).slice(0, 6).map((a: any) => ({
      ...a,
      ...buildActivityContent(a),
    }))
  }, [activity])

  const overdueTasks = useMemo(() => {
    const now = Date.now()

    return (progress?.roadmap || [])
      .filter(task => task.status !== 'DONE' && !!task.deadline)
      .filter(task => {
        const t = new Date(task.deadline!).getTime()
        if (Number.isNaN(t)) return false
        return t < now
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
  }, [progress])

  const urgentTasks = useMemo(() => {
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    return (progress?.roadmap || [])
      .filter(task => task.status !== 'DONE' && !!task.deadline)
      .filter(task => {
        const t = new Date(task.deadline!).getTime()
        if (Number.isNaN(t)) return false
        return t <= now + sevenDays
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5)
  }, [progress])

  const taskTotal = safeNumber(progress?.summary?.total, 0)
  const taskDone = safeNumber(progress?.summary?.done, 0)
  const taskCompletionPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0
  const activeTaskCount = safeNumber(stats?.activeTaskCount ?? progress?.summary?.inProgress, 0)

  const overdueCount = safeNumber(progress?.summary?.overdue ?? overdueTasks.length, overdueTasks.length)
  const upcomingDeadlineCount = urgentTasks.length
  const documentCount = safeNumber(stats?.documentCount, 0)
  const groupCount = safeNumber(stats?.groupCount, groups.length)
  const quizAccuracyValue = typeof stats?.quizAccuracy === 'number' ? stats.quizAccuracy : null
  const reviewAccuracy = quizAccuracyValue != null ? `${quizAccuracyValue}%` : '—'
  const latestGroups = (groups || []).slice(0, 3)
  const displayName = user?.fullName?.split(' ').pop() || user?.fullName || 'bạn'

  return (
    <div className="page-enter max-w-7xl space-y-6">
      <AdvertisementBanner />
      <section
        className="relative overflow-hidden rounded-[34px] border p-6 md:p-7"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(99,102,241,.22), transparent 38%), linear-gradient(135deg, color-mix(in srgb, var(--bg2) 90%, #6366f1 10%), var(--bg2))',
          borderColor: 'color-mix(in srgb, var(--border) 78%, #6366f1 22%)',
        }}
      >
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em]" style={{ color: '#818cf8', borderColor: 'rgba(99,102,241,.22)', background: 'rgba(99,102,241,.10)' }}>
              <Sparkles size={13} />
              StudyMate overview
            </div>
            <h1 className="text-[26px] font-bold tracking-tight md:text-[32px]" style={{ color: 'var(--text)' }}>
              {greeting}, {displayName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-6" style={{ color: 'var(--text2)' }}>
              Tập trung vào task quá hạn, theo dõi tỷ lệ hoàn thành và ôn bài hiệu quả hơn.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <QuickAction
              to="/groups"
              icon={Users}
              title="Nhóm học"
              desc="Vào nhóm của bạn"
              color="#6366f1"
            />
            <QuickAction
              to="/quiz"
              icon={Brain}
              title="Quiz"
              desc="Ôn lại kiến thức"
              color="#22c55e"
            />
            <QuickAction
              to="/flashcards"
              icon={BookOpen}
              title="Flashcard"
              desc="Học thẻ ghi nhớ"
              color="#f59e0b"
            />
            <QuickAction
              to="/predict"
              icon={TrendingUp}
              title="Đề xuất ngành"
              desc="Điểm & RIASEC"
              color="#8b5cf6"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Nhóm tham gia"
          value={groupCount}
          icon={Users}
          color="#6366f1"
          sub={groupCount > 0 ? 'nhóm đang hoạt động' : 'Bạn chưa tham gia nhóm nào'}
          href="/groups"
        />
        <StatCard
          label="Hoàn thành task"
          value={`${taskCompletionPct}%`}
          icon={CircleCheckBig}
          color="#14b8a6"
          sub={taskTotal > 0 ? `${taskDone}/${taskTotal} task đã hoàn thành` : 'Chưa có task để thống kê'}
          href="/tasks"
        />
        <StatCard
          label="Tài liệu"
          value={documentCount}
          icon={FileText}
          color="#f59e0b"
          sub={documentCount > 0 ? 'tài liệu đã upload lên nhóm' : 'Chưa có tài liệu'}
        />
        <StatCard
          label="Ôn bài đúng"
          value={reviewAccuracy}
          icon={Brain}
          color="#22c55e"
          sub={quizAccuracyValue != null ? 'tỷ lệ đúng trung bình khi làm quiz' : 'chưa có dữ liệu ôn bài'}
          href="/quiz"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_.95fr]">
        <div className="space-y-5">
          <div
            className="rounded-[30px] border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Hôm nay cần chú ý
                </h2>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Tóm tắt nhanh để bạn biết nên làm gì trước.
                </p>
              </div>
              <Link to="/tasks" className="hidden items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-indigo-400 hover:bg-indigo-500/10 sm:flex">
                Mở task <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div
                className="rounded-2xl border p-4"
                style={{ background: upcomingDeadlineCount > 0 ? 'rgba(245,158,11,.08)' : 'var(--bg3)', borderColor: upcomingDeadlineCount > 0 ? 'rgba(245,158,11,.24)' : 'var(--border)' }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(245,158,11,.14)', color: '#f59e0b' }}>
                  <CalendarClock size={17} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  Deadline gần
                </p>
                <p className="mt-1 text-[22px] font-bold" style={{ color: upcomingDeadlineCount > 0 ? '#f59e0b' : 'var(--text)' }}>
                  {upcomingDeadlineCount}
                </p>
                <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text3)' }}>
                  {upcomingDeadlineCount > 0 ? 'task sắp tới hạn, nên ưu tiên xử lý.' : 'Không có task gần deadline.'}
                </p>
              </div>

              <div className="rounded-2xl border p-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(20,184,166,.14)', color: '#14b8a6' }}>
                  <TimerReset size={17} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  Task đang làm
                </p>
                <p className="mt-1 text-[22px] font-bold" style={{ color: '#14b8a6' }}>
                  {activeTaskCount}
                </p>
                <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text3)' }}>
                  {activeTaskCount > 0 ? 'tiếp tục hoàn thành để giữ tiến độ nhóm.' : 'Bạn đang khá rảnh, có thể tạo task mới.'}
                </p>
              </div>

              <div
                className="rounded-2xl border p-4"
                style={{
                  background: overdueCount > 0 ? 'rgba(239,68,68,.08)' : 'var(--bg3)',
                  borderColor: overdueCount > 0 ? 'rgba(239,68,68,.28)' : 'var(--border)',
                }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    background: overdueCount > 0 ? 'rgba(239,68,68,.14)' : 'rgba(99,102,241,.14)',
                    color: overdueCount > 0 ? '#ef4444' : '#6366f1',
                  }}
                >
                  <AlertTriangle size={17} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  Task quá hạn
                </p>
                <p className="mt-1 text-[22px] font-bold" style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--text)' }}>
                  {overdueCount}
                </p>
                <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text3)' }}>
                  {overdueCount > 0 ? 'task đã quá hạn, cần xử lý ngay.' : 'Không có task quá hạn.'}
                </p>
                <Link
                  to={overdueTasks[0] ? buildTaskLink(overdueTasks[0]) : '/tasks'}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold"
                  style={{ color: overdueCount > 0 ? '#ef4444' : '#818cf8' }}
                >
                  {overdueCount > 0 ? 'Xử lý ngay' : 'Xem task'} <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border p-4" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                    Task quá hạn & sắp hết hạn
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                    Hiển thị tối đa 5 task cần xử lý nhất. Bấm vào task để mở chi tiết.
                  </p>
                </div>
                <Link to="/tasks" className="text-[12px] font-semibold text-indigo-400">
                  Xem tất cả
                </Link>
              </div>

              {urgentTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-5 text-center" style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}>
                  Không có task quá hạn hoặc sắp hết hạn trong 7 ngày tới.
                </div>
              ) : (
                <div className="grid gap-2">
                  {urgentTasks.map(task => (
                    <DeadlineTaskCard key={`${task.personal ? 'p' : 'g'}-${task.id}`} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Nhóm học của tôi
                </h2>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Các nhóm bạn thường xuyên học cùng.
                </p>
              </div>
              <Link
                to="/groups"
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-indigo-400 hover:bg-indigo-500/10"
              >
                Xem tất cả <ArrowRight size={12} />
              </Link>
            </div>

            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-[26px] border"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                  />
                ))}
              </div>
            ) : latestGroups.length === 0 ? (
              <div
                className="rounded-[28px] border p-8 text-center"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <Users size={34} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
                <p className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>
                  Bạn chưa tham gia nhóm nào
                </p>
                <Link
                  to="/groups"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-[12px] font-medium text-white hover:bg-indigo-400"
                >
                  <Plus size={14} />
                  Tạo hoặc tham gia nhóm
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {latestGroups.map((g: any) => (
                  <GroupCard key={g.id} g={g} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div
            className="rounded-[30px] border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Hoạt động gần đây
                </h2>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Những cập nhật mới nhất trong hệ thống.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Activity size={17} />
              </div>
            </div>

            <div className="space-y-3">
              {mappedActivity.length === 0 ? (
                <div
                  className="rounded-2xl border p-6 text-center"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                >
                  <Clock size={25} className="mx-auto mb-2" style={{ color: 'var(--text3)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                    Chưa có hoạt động nào
                  </p>
                </div>
              ) : (
                mappedActivity.map((a: any, i: number) => (
                  <ActivityItem key={a.id ?? i} a={a} />
                ))
              )}
            </div>
          </div>

          <div
            className="rounded-[30px] border p-5"
            style={{
              background: 'radial-gradient(circle at top right, rgba(99,102,241,.20), transparent 42%), linear-gradient(135deg, rgba(99,102,241,.10), rgba(168,85,247,.06))',
              borderColor: 'rgba(99,102,241,.24)',
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                <TrendingUp size={17} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-indigo-300">Đề xuất ngành học</p>
                <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
                  AI phân tích điểm số
                </p>
              </div>
            </div>

            <p className="text-[12px] leading-6" style={{ color: 'var(--text2)' }}>
              Nhập điểm thi và kết quả RIASEC để tham khảo các ngành học phù hợp.
            </p>

            <Link
              to="/predict"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              Xem gợi ý <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
