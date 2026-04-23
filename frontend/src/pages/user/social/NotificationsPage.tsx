import { useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  KanbanSquare,
  BrainCircuit,
  FileText,
  MessageSquare,
  AlertCircle,
  UserPlus,
  Users,
  Heart,
  Check,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationApi } from '@/api/services'

function timeAgo(input?: string) {
  if (!input) return ''
  const diff = Date.now() - new Date(input).getTime()
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)

  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  if (hour < 24) return `${hour} giờ trước`
  return `${day} ngày trước`
}

function iconForType(type?: string) {
  switch (type) {
    case 'GROUP_JOIN_REQUEST':
      return { icon: Users, color: '#f59e0b' }
    case 'GROUP_REQUEST_APPROVED':
      return { icon: Check, color: '#22c55e' }
    case 'GROUP_REQUEST_REJECTED':
      return { icon: X, color: '#ef4444' }
    case 'GROUP_JOINED':
      return { icon: Users, color: '#14b8a6' }
    case 'FRIEND_REQUEST':
      return { icon: UserPlus, color: '#6366f1' }
    case 'FRIEND_ACCEPTED':
      return { icon: CheckCircle2, color: '#22c55e' }
    case 'FRIEND_REJECTED':
      return { icon: AlertCircle, color: '#ef4444' }
    case 'CHAT':
    case 'DM':
      return { icon: MessageSquare, color: '#14b8a6' }
    case 'TASK':
      return { icon: KanbanSquare, color: '#22c55e' }
    case 'POST_LIKED':
      return { icon: Heart, color: '#ec4899' }
    case 'PREDICT':
      return { icon: BrainCircuit, color: '#6366f1' }
    case 'DOC':
      return { icon: FileText, color: '#f59e0b' }
    default:
      return { icon: Bell, color: '#6366f1' }
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 0],
    queryFn: () => notificationApi.list(0),
  })

  const notifs = useMemo(() => data?.content ?? data?.items ?? [], [data])

  const markOneMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const markAllMut = useMutation({
    mutationFn: () => notificationApi.markAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const filtered = filter === 'unread' ? notifs.filter((n: any) => !n.read) : notifs
  const unreadCount = notifs.filter((n: any) => !n.read).length

  const handleOpen = async (n: any) => {
    if (!n.read) {
      await markOneMut.mutateAsync(n.id)
    }
    if (n.link) {
      navigate(n.link)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1
          className="text-[18px] font-semibold flex items-center gap-2"
          style={{ color: 'var(--text)' }}
        >
          <Bell size={18} className="text-indigo-400" />
          Thông báo
          {unreadCount > 0 && (
            <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          <div
            className="rounded-lg p-0.5 flex"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx('px-3 py-1.5 rounded-md text-[11px] font-medium transition-all')}
                style={
                  filter === f
                    ? {
                        background: 'var(--bg2)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }
                    : {
                        color: 'var(--text3)',
                      }
                }
              >
                {f === 'all' ? 'Tất cả' : 'Chưa đọc'}
              </button>
            ))}
          </div>

          <button
            onClick={() => markAllMut.mutate()}
            className="text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
          >
            Đánh dấu tất cả
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--text3)' }}>
            Đang tải thông báo...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--text3)' }}>
            Không có thông báo nào
          </div>
        ) : (
          filtered.map((n: any) => {
            const { icon: Icon, color } = iconForType(n.type)

            return (
              <div
                key={n.id}
                onClick={() => handleOpen(n)}
                className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/[.02]"
                style={{
                  background: n.read ? 'var(--bg2)' : 'color-mix(in srgb, var(--bg2) 88%, #6366f1 12%)',
                  borderColor: 'var(--border)',
                  borderLeftWidth: !n.read ? '2px' : '1px',
                  borderLeftColor: !n.read ? color : 'var(--border)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: n.read ? 'var(--text2)' : 'var(--text)' }}
                    >
                      {n.title}
                    </p>
                    {!n.read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: color }}
                      />
                    )}
                  </div>

                  <p
                    className="text-[12px] mt-0.5 leading-relaxed"
                    style={{ color: 'var(--text3)' }}
                  >
                    {n.body}
                  </p>

                  <p
                    className="text-[10px] mt-1.5 font-mono"
                    style={{ color: 'var(--bg4)' }}
                  >
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}