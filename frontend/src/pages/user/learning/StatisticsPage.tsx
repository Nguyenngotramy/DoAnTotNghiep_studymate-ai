import { useMemo, useEffect, useRef, type CSSProperties, type ReactNode, type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  BookOpen,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  FolderKanban,
  Zap,
  UserCheck,
} from 'lucide-react'
import { groupApi, taskApi, studyApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type { Group, Task } from '@/types'

const round2 = (n: number) => Math.round(n * 100) / 100

function AnimatedRing({
  pct,
  size = 120,
  stroke = 10,
  color = 'var(--ring-gradient)',
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-alt)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color === 'var(--ring-gradient)' ? 'url(#ringGrad)' : color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
      />
    </svg>
  )
}

function GpaSparkline({ data, target }: { data: number[]; target: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const accentColor =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1'

    ctx.clearRect(0, 0, w, h)

    if (!data.length) return

    const min = Math.min(...data, target) - 0.5
    const max = Math.max(...data, target) + 0.3
    const safeRange = Math.max(max - min, 0.5)

    const toX = (i: number) => (i / Math.max(data.length - 1, 1)) * (w - 24) + 12
    const toY = (v: number) => h - 16 - ((v - min) / safeRange) * (h - 28)

    ctx.setLineDash([5, 4])
    ctx.strokeStyle = 'rgba(99,102,241,0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, toY(target))
    ctx.lineTo(w, toY(target))
    ctx.stroke()
    ctx.setLineDash([])

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, accentColor + '3a')
    grad.addColorStop(1, accentColor + '00')

    ctx.beginPath()
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(v))
      else {
        const px = toX(i - 1)
        const py = toY(data[i - 1])
        const cx = toX(i)
        const cy = toY(v)
        ctx.bezierCurveTo((px + cx) / 2, py, (px + cx) / 2, cy, cx, cy)
      }
    })
    ctx.lineTo(toX(data.length - 1), h)
    ctx.lineTo(toX(0), h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(v))
      else {
        const px = toX(i - 1)
        const py = toY(data[i - 1])
        const cx = toX(i)
        const cy = toY(v)
        ctx.bezierCurveTo((px + cx) / 2, py, (px + cx) / 2, cy, cx, cy)
      }
    })
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 2
    ctx.stroke()

    data.forEach((v, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toY(v), 4, 0, Math.PI * 2)
      ctx.fillStyle = accentColor
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    const labels = ['HK1', 'HK2', 'HK3', 'HK4', 'HK5', 'HK6']
    ctx.fillStyle =
      getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() || '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    data.forEach((_, i) => {
      if (i < labels.length) ctx.fillText(labels[i], toX(i), h - 2)
    })
  }, [data, target])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accentVar,
}: {
  label: string
  value: string | number
  sub: string
  icon: ElementType
  accentVar: string
}) {
  return (
    <div
      style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: -28,
          right: -28,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `var(${accentVar})`,
          opacity: 0.1,
          filter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 500 }}>
          {label}
        </span>
        <Icon size={16} style={{ color: `var(${accentVar})`, opacity: 0.75 }} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, color: `var(${accentVar})`, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>{sub}</div>
    </div>
  )
}

function ProgressBar({
  label,
  value,
  pct,
  color,
}: {
  label: string
  value: string | number
  pct: number
  color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, overflow: 'hidden', background: 'var(--ring-track)' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, pct))}%`,
            borderRadius: 99,
            background: color,
            transition: 'width 1.2s cubic-bezier(.16,1,.3,1)',
          }}
        />
      </div>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DONE: { label: 'Hoàn thành', color: 'var(--c-green)' },
    IN_PROGRESS: { label: 'Đang làm', color: 'var(--c-amber)' },
    TODO: { label: 'Chờ làm', color: 'var(--text3)' },
    OVERDUE: { label: 'Quá hạn', color: 'var(--c-red)' },
  }
  const s = map[status] ?? { label: status, color: 'var(--text3)' }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 99,
        border: `1px solid ${s.color}33`,
        background: `${s.color}14`,
        color: s.color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {s.label}
    </span>
  )
}

function AlertCard({
  type,
  title,
  text,
}: {
  type: 'warn' | 'success' | 'info'
  title: string
  text: string
}) {
  const colorMap = {
    warn: 'var(--c-red)',
    success: 'var(--c-green)',
    info: 'var(--accent-alt)',
  }
  const c = colorMap[type]
  return (
    <div
      style={{
        background: 'var(--bg3)',
        borderRadius: 16,
        padding: '14px 16px',
        borderLeft: `3px solid ${c}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, color: c, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{text}</div>
    </div>
  )
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function CardTitle({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <Icon size={16} style={{ color: 'var(--accent)' }} />
      <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{children}</span>
    </div>
  )
}

type TaskWithGroup = Task & {
  groupName?: string
}

export default function StatisticsPage() {
  const user = useAuthStore(s => s.user)

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['statistics-groups'],
    queryFn: () => groupApi.list(),
    enabled: !!user,
  })

  const { data: myTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['statistics-my-tasks', user?.id, groups.map((g: Group) => g.id).join(',')],
    enabled: !!user && groups.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        groups.map(async (g: Group) => {
          try {
            const tasks = await taskApi.list(g.id)
            return tasks
              .filter((task: any) => {
                const isAssignee = String(task.assigneeId || '') === String(user?.id || '')
                const isCreator = String(task.createdById || '') === String(user?.id || '')
                return isAssignee || isCreator
              })
              .map((task: Task) => ({ ...task, groupName: g.name }))
          } catch {
            return []
          }
        }),
      )

      return results.flat() as TaskWithGroup[]
    },
  })

  const { data: terms = [], isLoading: loadingTerms } = useQuery({
    queryKey: ['statistics-study-terms'],
    queryFn: () => studyApi.listTerms(),
    enabled: !!user?.id,
  })

  const taskSummary = useMemo(() => {
    const total = myTasks.length
    const done = myTasks.filter(t => t.status === 'DONE').length
    const inProgress = myTasks.filter(t => t.status === 'IN_PROGRESS').length
    const todo = myTasks.filter(t => t.status === 'TODO').length
    const overdue = myTasks.filter(t => {
      if (!t.deadline || t.status === 'DONE') return false
      return new Date(t.deadline).getTime() < Date.now()
    }).length
    const progressPct = total ? round2((done / total) * 100) : 0
    return { total, done, inProgress, todo, overdue, progressPct }
  }, [myTasks])

  const recentTasks = useMemo(
    () =>
      [...myTasks]
        .sort((a, b) => {
          const ta = a.updatedAt || a.createdAt || ''
          const tb = b.updatedAt || b.createdAt || ''
          return new Date(tb).getTime() - new Date(ta).getTime()
        })
        .slice(0, 5),
    [myTasks],
  )

  const studySummary = useMemo(() => {
    const latest = terms[0]
    const previous = terms[1]
    const latestAvg = latest?.averageScore ?? 0
    const prevAvg = previous?.averageScore ?? 0
    const delta = latest && previous ? round2(latestAvg - prevAvg) : 0
    const totalTerms = terms.length
    const bestTerm = [...terms].sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0]
    const hasStudyData = terms.some(t => (t.averageScore ?? 0) > 0)

    return {
      latestAvg,
      prevAvg,
      delta,
      totalTerms,
      bestTerm,
      hasStudyData,
      latestClassification: latest?.classification || 'Chưa có',
    }
  }, [terms])

  const gpaHistory = useMemo(
    () =>
      terms
        .map((t: any) => round2(t.averageScore ?? 0))
        .reverse()
        .filter((n: number) => n > 0),
    [terms],
  )

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-[28px] border p-10 text-center"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <p style={{ color: 'var(--text2)' }}>Bạn cần đăng nhập để xem thống kê.</p>
        </div>
      </div>
    )
  }

  const isLoading = loadingGroups || loadingTasks || loadingTerms

  const accentStyle: CSSProperties = {
    ['--accent' as any]: 'var(--accent, #6366f1)',
    ['--accent-alt' as any]: 'var(--accent-alt, #10d9a0)',
    ['--ring-track' as any]: 'var(--ring-track, color-mix(in srgb, var(--border) 60%, transparent))',
    ['--c-green' as any]: 'var(--c-green, #22c55e)',
    ['--c-amber' as any]: 'var(--c-amber, #f59e0b)',
    ['--c-red' as any]: 'var(--c-red, #ef4444)',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={accentStyle}>
      <div
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg2) 92%, #6366f1 8%), var(--bg2))',
          border: '1px solid color-mix(in srgb, var(--border) 80%, #6366f1 20%)',
          borderRadius: 28,
          padding: '28px 32px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -70,
            right: -70,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: 48,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,217,160,.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 13px',
            borderRadius: 99,
            background: 'rgba(99,102,241,.1)',
            border: '1px solid rgba(99,102,241,.2)',
            color: '#818cf8',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.5px',
            marginBottom: 14,
          }}
        >
          <BarChart3 size={13} />
          Learning Analytics
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 6,
            letterSpacing: '-0.3px',
          }}
        >
          Thống kê học tập &amp; công việc
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65, maxWidth: 520 }}>
          Theo dõi task được giao cho bạn hoặc do bạn tạo, cùng với tiến độ học tập theo các học kỳ đã lưu.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 22,
          }}
        >
          <KpiCard
            label="Task của tôi"
            value={taskSummary.total}
            sub={`${groups.length} nhóm đã tham gia`}
            icon={UserCheck}
            accentVar="--accent"
          />
          <KpiCard
            label="Hoàn thành"
            value={taskSummary.done}
            sub={`${taskSummary.progressPct}% tổng số`}
            icon={CheckCircle2}
            accentVar="--c-green"
          />
          <KpiCard
            label="Đang làm"
            value={taskSummary.inProgress}
            sub={`${taskSummary.todo} chờ làm`}
            icon={Clock3}
            accentVar="--c-amber"
          />
          <KpiCard
            label="Điểm gần nhất"
            value={studySummary.hasStudyData ? studySummary.latestAvg.toFixed(2) : '—'}
            sub={studySummary.hasStudyData ? studySummary.latestClassification : 'Chưa có dữ liệu'}
            icon={BookOpen}
            accentVar="--accent-alt"
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                height: 220,
                borderRadius: 24,
                background: 'var(--bg2)',
                animation: 'pulse 1.5s ease infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <CardTitle icon={FolderKanban}>Tổng quan task của tôi</CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <AnimatedRing pct={taskSummary.progressPct} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {taskSummary.progressPct}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      done
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ProgressBar
                    label="Hoàn thành"
                    value={taskSummary.done}
                    pct={taskSummary.total ? (taskSummary.done / taskSummary.total) * 100 : 0}
                    color="var(--c-green)"
                  />
                  <ProgressBar
                    label="Đang làm"
                    value={taskSummary.inProgress}
                    pct={taskSummary.total ? (taskSummary.inProgress / taskSummary.total) * 100 : 0}
                    color="var(--c-amber)"
                  />
                  <ProgressBar
                    label="Chờ làm"
                    value={taskSummary.todo}
                    pct={taskSummary.total ? (taskSummary.todo / taskSummary.total) * 100 : 0}
                    color="var(--text3)"
                  />
                  <ProgressBar
                    label="Quá hạn"
                    value={taskSummary.overdue}
                    pct={taskSummary.total ? (taskSummary.overdue / taskSummary.total) * 100 : 0}
                    color="var(--c-red)"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle icon={TrendingUp}>GPA theo học kỳ</CardTitle>
              {gpaHistory.length >= 2 ? (
                <>
                  <div style={{ height: 180, position: 'relative' }}>
                    <GpaSparkline data={gpaHistory} target={7.5} />
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 2, display: 'block' }} />
                      GPA
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 20, height: 0, borderTop: '2px dashed rgba(99,102,241,.4)', display: 'block' }} />
                      Mục tiêu 7.5
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                    Chưa có đủ dữ liệu học tập thật để vẽ biểu đồ.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr 1fr', gap: 16 }}>
            <Card>
              <CardTitle icon={CalendarDays}>Task gần đây của tôi</CardTitle>
              {recentTasks.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>Bạn chưa có task nào được giao hoặc tự tạo.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {recentTasks.map(task => {
                    const isOverdue =
                      task.status !== 'DONE' &&
                      task.deadline &&
                      new Date(task.deadline).getTime() < Date.now()

                    return (
                      <div
                        key={task.id}
                        style={{
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: 16,
                          padding: '13px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span>{(task as any).groupName || 'Nhóm'}</span>
                            {task.deadline && <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>}
                            {String((task as any).assigneeId || '') === String(user.id) && <span>Được giao cho bạn</span>}
                            {String((task as any).createdById || '') === String(user.id) && <span>Bạn tạo</span>}
                          </div>
                        </div>
                        <StatusPill status={isOverdue ? 'OVERDUE' : task.status} />
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle icon={Zap}>Tổng quan học tập</CardTitle>
              <div style={{ display: 'grid', gap: 10 }}>
                <StatChip label="Học kỳ đã lưu" value={studySummary.totalTerms} color="var(--accent)" />
                <StatChip
                  label="Xếp loại gần nhất"
                  value={studySummary.hasStudyData ? studySummary.latestClassification : 'Chưa có'}
                  color="var(--accent-alt)"
                />
                <StatChip
                  label="Kỳ tốt nhất"
                  value={studySummary.bestTerm?.semesterLabel || '—'}
                  color="var(--c-green)"
                />
                <StatChip
                  label="Biến động"
                  value={
                    studySummary.hasStudyData && terms.length >= 2
                      ? `${studySummary.delta > 0 ? '+' : ''}${studySummary.delta.toFixed(2)}`
                      : '—'
                  }
                  color={studySummary.delta >= 0 ? 'var(--c-green)' : 'var(--c-red)'}
                />
              </div>
            </Card>

            <Card>
              <CardTitle icon={AlertTriangle}>Cảnh báo</CardTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AlertCard
                  type={taskSummary.overdue > 0 ? 'warn' : 'success'}
                  title="Task của bạn"
                  text={
                    taskSummary.overdue > 0
                      ? `Bạn có ${taskSummary.overdue} task của mình đang quá hạn, nên ưu tiên xử lý sớm.`
                      : 'Không có task cá nhân nào quá hạn, tiến độ hiện tại khá ổn.'
                  }
                />
                <AlertCard
                  type={!studySummary.hasStudyData || studySummary.latestAvg < 6.5 ? 'warn' : 'info'}
                  title="Học tập"
                  text={
                    !studySummary.hasStudyData
                      ? 'Bạn đã lưu học kỳ nhưng chưa có điểm thật đủ để thống kê rõ. Hãy nhập điểm và lưu lại ở trang Dự đoán học lực.'
                      : studySummary.latestAvg < 6.5
                        ? 'Điểm gần nhất còn thấp, bạn nên xem tiếp trang Dự đoán học lực để nhận gợi ý cải thiện.'
                        : 'Kết quả học tập hiện tại khá tốt, nên duy trì đều đặn.'
                  }
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}