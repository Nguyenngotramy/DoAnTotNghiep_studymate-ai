import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import SideToolbar from '@/components/SideToolbar'
import { useAuthStore } from '@/store/authStore'
import { authApi, notificationApi, dmApi } from '@/api/services'
import toast from 'react-hot-toast'
import { initials } from '@/utils/helpers'
import {
  LayoutDashboard, BookOpen, Compass, Users, MessageCircle,
  UsersRound, KanbanSquare, Layers, HelpCircle, BarChart2,
  BrainCircuit, User, Settings, LogOut, Search, Bell,
  Zap, Flame, X, ChevronRight, CheckCircle2, AlertCircle,
  FileText, Heart, Check, FolderOpen
} from 'lucide-react'
import clsx from 'clsx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type NavItemProps = { to: string; icon: React.ElementType; label: string; badge?: number }

const BACKEND = 'http://localhost:8080/api'

function NavItem({ to, icon: Icon, label, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium transition-all mb-[1px] relative group',
          isActive
            ? 'bg-indigo-500/15 text-indigo-400 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2.5px] before:bg-indigo-500 before:rounded-r-full'
            : 'hover:bg-white/[.04]',
        )
      }
      style={({ isActive }) =>
        isActive ? {} : { color: 'var(--text2)' }
      }
    >
      <Icon size={14} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

function NavSection({ title }: { title: string }) {
  return (
    <div
      className="text-[9px] font-semibold uppercase tracking-[.08em] px-2.5 pt-4 pb-1"
      style={{ color: 'var(--text3)' }}
    >
      {title}
    </div>
  )
}

const QUICK_LINKS = [
  { label: 'Blog học tập', to: '/blog', icon: BookOpen, color: '#6366f1' },
  { label: 'Nhóm của tôi', to: '/groups', icon: UsersRound, color: '#14b8a6' },
  { label: 'Flashcard', to: '/flashcard', icon: Layers, color: '#f59e0b' },
  { label: 'Học tập cá nhân', to: '/study-drive', icon: FolderOpen, color: '#22c55e' },
  { label: 'Dự đoán học lực', to: '/predict', icon: BrainCircuit, color: '#8b5cf6' },
]

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[560px] mx-4 rounded-2xl shadow-2xl overflow-hidden border"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tìm kiếm bài viết, nhóm, người dùng..."
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--text)' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && q.trim()) {
                navigate(`/search?q=${encodeURIComponent(q.trim())}`)
                onClose()
              }
            }}
          />
          <button onClick={onClose} className="transition-colors p-1" style={{ color: 'var(--text3)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wide px-2 mb-2"
            style={{ color: 'var(--text3)' }}
          >
            Truy cập nhanh
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_LINKS.map(l => (
              <button
                key={l.to}
                onClick={() => {
                  navigate(l.to)
                  onClose()
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[.05] transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: l.color + '20' }}
                >
                  <l.icon size={13} style={{ color: l.color }} />
                </div>
                <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                  {l.label}
                </span>
                <ChevronRight size={12} className="ml-auto" style={{ color: 'var(--text3)' }} />
              </button>
            ))}
          </div>

          {q && (
            <button
              onClick={() => {
                navigate(`/search?q=${encodeURIComponent(q.trim())}`)
                onClose()
              }}
              className="w-full mt-2 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[12px] text-indigo-400 flex items-center gap-2 hover:bg-indigo-500/15 transition-colors"
            >
              <Search size={13} />
              Tìm kiếm "{q}"
              <ChevronRight size={12} className="ml-auto" />
            </button>
          )}
        </div>

        <div
          className="px-4 py-2 border-t flex gap-4 text-[10px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <span>↵ Tìm kiếm</span>
          <span>ESC Đóng</span>
        </div>
      </div>
    </div>
  )
}

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

function notifMeta(type?: string) {
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
      return { icon: Users, color: '#6366f1' }
    case 'FRIEND_ACCEPTED':
      return { icon: CheckCircle2, color: '#22c55e' }
    case 'FRIEND_REJECTED':
      return { icon: AlertCircle, color: '#ef4444' }
    case 'CHAT':
    case 'DM':
    case 'GROUP_CHAT':
    case 'CHAT_MESSAGE':
      return { icon: MessageCircle, color: '#14b8a6' }
    case 'POST_LIKED':
      return { icon: Heart, color: '#ec4899' }
    case 'DOC':
      return { icon: FileText, color: '#f59e0b' }
    default:
      return { icon: Bell, color: '#818cf8' }
  }
}

function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
  return `${BACKEND}${avatar.startsWith('/') ? avatar : `/${avatar}`}`
}

function Avatar({
  name,
  avatar,
  size = 28,
}: {
  name?: string
  avatar?: string | null
  size?: number
}) {
  const text = name ? initials(name) : '?'
  const [imgError, setImgError] = useState(false)
  const url = resolveAvatarUrl(avatar)

  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      }}
    >
      {url && !imgError ? (
        <img
          src={url}
          alt={name ?? 'avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="text-white font-semibold"
          style={{
            fontSize: size <= 28 ? '10px' : '11px',
          }}
        >
          {text}
        </span>
      )}
    </div>
  )
}

function NotifDropdown({
  unread,
  notifications,
  onClose,
  onOpenNotif,
  onMarkAll,
}: {
  unread: number
  notifications: any[]
  onClose: () => void
  onOpenNotif: (n: any) => void
  onMarkAll: () => void
}) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('notif-dropdown')
      if (el && !el.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      id="notif-dropdown"
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
          Thông báo
        </span>
        <div className="flex items-center gap-3">
          {unread > 0 && <span className="text-[10px] text-indigo-400 font-medium">{unread} chưa đọc</span>}
          <button
            onClick={onMarkAll}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Đọc hết
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px]" style={{ color: 'var(--text3)' }}>
            Chưa có thông báo nào
          </div>
        ) : (
          notifications.slice(0, 5).map(n => {
            const { icon: Icon, color } = notifMeta(n.type)

            return (
              <button
                key={n.id}
                onClick={() => onOpenNotif(n)}
                className={clsx(
                  'w-full text-left flex gap-3 px-4 py-3 hover:bg-white/[.03] transition-colors border-b last:border-0',
                  !n.read && 'bg-indigo-500/[.04]',
                )}
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--text)' }}>
                      {n.title}
                    </p>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text2)' }}>
                    {n.body}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => {
            navigate('/notifications')
            onClose()
          }}
          className="w-full text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors text-center"
        >
          Xem tất cả thông báo →
        </button>
      </div>
    </div>
  )
}

export default function UserLayout() {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showSearch, setShowSearch] = useState(false)
  const [showNotif, setShowNotif] = useState(false)

  const { data: notificationsPage } = useQuery({
    queryKey: ['notifications', 0],
    queryFn: () => notificationApi.list(0),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })

  const { data: notifCount } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.count(),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const { data: inboxConversations = [] } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: dmApi.conversations,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  })

  const notifications = useMemo(
    () => notificationsPage?.content ?? notificationsPage?.items ?? [],
    [notificationsPage]
  )

  const unread = notifCount?.count ?? notifications.filter((n: any) => !n.read).length

  const messageUnread = useMemo(() => {
    return Array.isArray(inboxConversations)
      ? inboxConversations.reduce((sum: number, c: any) => sum + (c?.unreadCount ?? 0), 0)
      : 0
  }, [inboxConversations])

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
      toast.success('Đã đánh dấu tất cả là đã đọc')
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    logout()
    navigate('/login')
    toast.success('Đã đăng xuất!')
  }

  const handleOpenNotif = async (n: any) => {
    try {
      if (!n.read) {
        await markOneMut.mutateAsync(n.id)
      }
      setShowNotif(false)

      if (n.link) {
        navigate(n.link)
      } else {
        navigate('/notifications')
      }
    } catch {
      toast.error('Không mở được thông báo')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      <SideToolbar />

      <aside
        className="w-[210px] min-w-[210px] flex flex-col"
        style={{ background: 'var(--bg2)', borderRight: '0.5px solid var(--border)' }}
      >
        <div
          className="px-4 h-12 flex items-center gap-2.5 flex-shrink-0"
          style={{ borderBottom: '0.5px solid var(--border)' }}
        >
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
              <path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M9 7v4M7 9h4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            StudyMate AI
          </span>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <NavSection title="Tổng quan" />
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

          <NavSection title="Cộng đồng" />
          <NavItem to="/blog" icon={BookOpen} label="Blog học tập" />
          <NavItem to="/discover" icon={Compass} label="Khám phá" />
          <NavItem to="/friends" icon={Users} label="Kết bạn" />
          <NavItem to="/inbox" icon={MessageCircle} label="Tin nhắn" badge={messageUnread} />

          <NavSection title="Học nhóm" />
          <NavItem to="/groups" icon={UsersRound} label="Nhóm của tôi" />
          <NavItem to="/kanban" icon={KanbanSquare} label="Nhiệm vụ" />

          <NavSection title="Học tập cá nhân" />
          <NavItem to="/study-drive" icon={FolderOpen} label="Học tập cá nhân" />
          <NavItem to="/flashcard" icon={Layers} label="Flashcard" />
          <NavItem to="/quiz" icon={HelpCircle} label="Quiz" />
          <NavItem to="/statistics" icon={BarChart2} label="Thống kê" />
          <NavItem to="/predict" icon={BrainCircuit} label="Dự đoán học lực" />

          <NavSection title="Tài khoản" />
          <NavItem to="/profile" icon={User} label="Hồ sơ cá nhân" />
          <NavItem to="/settings" icon={Settings} label="Cài đặt" />
        </nav>

        <div className="p-2 flex-shrink-0" style={{ borderTop: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/[.04] transition-colors cursor-pointer">
            <Avatar name={user?.fullName} avatar={user?.avatar} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>
                {user?.fullName}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                {(user?.xp ?? 0).toLocaleString()} XP
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="transition-colors p-1 flex-shrink-0"
              style={{ color: 'var(--text3)' }}
              title="Đăng xuất"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-12 flex-shrink-0 flex items-center gap-3 px-5"
          style={{ background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)' }}
        >
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 flex-1 max-w-xs h-8 px-3 rounded-lg text-[12px] transition-colors hover:bg-white/[.05]"
            style={{ background: 'var(--bg3)', border: '0.5px solid var(--border)', color: 'var(--text3)' }}
          >
            <Search size={13} />
            <span>Tìm kiếm...</span>
            <span
              className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
            >
              ⌘K
            </span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(99,102,241,.1)', border: '0.5px solid rgba(99,102,241,.2)' }}
            >
              <Zap size={12} className="text-indigo-400" />
              <span className="text-[11px] font-semibold text-indigo-400">
                {(user?.xp ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text3)' }}>XP</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(249,115,22,.08)', border: '0.5px solid rgba(249,115,22,.2)' }}
            >
              <Flame size={12} className="text-orange-400" />
              <span className="text-[11px] font-semibold text-orange-400">{user?.streak ?? 0}</span>
              <span className="text-[10px]" style={{ color: 'var(--text3)' }}>ngày</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[.06]"
              style={{ color: 'var(--text2)' }}
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotif && (
              <NotifDropdown
                unread={unread}
                notifications={notifications}
                onClose={() => setShowNotif(false)}
                onOpenNotif={handleOpenNotif}
                onMarkAll={() => markAllMut.mutate()}
              />
            )}
          </div>

          <Link to="/profile">
            <div className="cursor-pointer hover:ring-2 hover:ring-indigo-500/50 rounded-full transition-all">
              <Avatar name={user?.fullName} avatar={user?.avatar} size={28} />
            </div>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}