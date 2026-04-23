import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useMemo, useRef, useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, BrainCircuit, Settings, LogOut, Bell, Search,
  ChevronDown, Shield, UserCircle, TrendingUp,
  CheckCircle2, MessageSquare, AlertCircle, UserPlus, Heart, FileText, X, Check
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/services'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupApi, notificationApi } from '@/api/services'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const s = {
  shell: 'flex h-screen overflow-hidden bg-[#0f0f13]',
  sidebar: 'w-[228px] min-w-[228px] bg-[#16161d] border-r border-white/[.07] flex flex-col',
  main: 'flex-1 flex flex-col overflow-hidden',
  topbar: 'h-14 min-h-14 border-b border-white/[.07] flex items-center gap-3 px-5',
  content: 'flex-1 overflow-y-auto p-6',
}

function NavItem({ to, icon: Icon, label, badge }: {
  to: string; icon: React.ElementType; label: string; badge?: number
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all mb-0.5 relative',
          isActive
            ? 'bg-indigo-500/15 text-indigo-400 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-indigo-500 before:rounded-r-full'
            : 'text-[#8b8b9e] hover:bg-white/[.04] hover:text-[#f0f0f5]'
        )
      }
    >
      <Icon size={15} className="flex-shrink-0 opacity-75" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
          {badge}
        </span>
      ) : null}
    </NavLink>
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
      return { icon: UserPlus, color: '#6366f1' }
    case 'FRIEND_ACCEPTED':
      return { icon: CheckCircle2, color: '#22c55e' }
    case 'FRIEND_REJECTED':
      return { icon: AlertCircle, color: '#ef4444' }
    case 'CHAT':
    case 'DM':
      return { icon: MessageSquare, color: '#14b8a6' }
    case 'POST_LIKED':
      return { icon: Heart, color: '#ec4899' }
    case 'DOC':
      return { icon: FileText, color: '#f59e0b' }
    default:
      return { icon: Bell, color: '#818cf8' }
  }
}

export default function AppLayout() {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [groupOpen, setGroupOpen] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)

  const notifRef = useRef<HTMLDivElement | null>(null)

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: groupApi.list,
  })

  const { data: notificationsPage } = useQuery({
    queryKey: ['notifications', 0],
    queryFn: () => notificationApi.list(0),
    refetchInterval: 15000,
  })

  const { data: notifCount } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.count(),
    refetchInterval: 10000,
  })

  const notifications = useMemo(
    () => notificationsPage?.content ?? notificationsPage?.items ?? [],
    [notificationsPage]
  )

  const unreadCount = notifCount?.count ?? notifications.filter((n: any) => !n.read).length

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
    const onClickOutside = (e: MouseEvent) => {
      if (!notifRef.current) return
      if (!notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // ignore
    }
    logout()
    navigate('/login')
    toast.success('Đã đăng xuất')
  }

  const handleOpenNotification = async (n: any) => {
    try {
      if (!n.read) {
        await markOneMut.mutateAsync(n.id)
      }
      setNotifOpen(false)

      if (n.link) {
        navigate(n.link)
      } else {
        navigate('/notifications')
      }
    } catch {
      toast.error('Không mở được thông báo')
    }
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className="px-4 py-4 border-b border-white/[.07] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 18 18" fill="none" className="w-[18px] h-[18px]">
              <path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M9 7v4M7 9h4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#f0f0f5] tracking-tight">StudyMate AI</div>
            <div className="text-[10px] text-[#5a5a6e] uppercase tracking-widest">Học nhóm thông minh</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2">Tổng quan</div>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Nhóm học</div>
          <NavItem to="/groups" icon={Users} label="Tất cả nhóm" />

          {groups.length > 0 && (
            <>
              <button
                onClick={() => setGroupOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 w-full text-[11px] text-[#5a5a6e] hover:text-[#8b8b9e] transition-colors"
              >
                <ChevronDown size={12} className={clsx('transition-transform', !groupOpen && '-rotate-90')} />
                Nhóm của tôi
              </button>
              {groupOpen && groups.slice(0, 4).map((g: any) => (
                <div key={g.id} className="ml-4 border-l border-white/[.06] pl-2 mb-0.5">
                  <NavLink
                    to={`/groups/${g.id}/kanban`}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-all',
                        isActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-[#8b8b9e] hover:text-[#f0f0f5]'
                      )
                    }
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.coverColor }} />
                    <span className="truncate">{g.name}</span>
                  </NavLink>
                </div>
              ))}
            </>
          )}

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Phân tích AI</div>
          <NavItem to="/predict" icon={BrainCircuit} label="Dự đoán học lực" />
          <NavItem to="/dashboard" icon={TrendingUp} label="Thống kê cá nhân" />

          {user?.role === 'ADMIN' && (
            <>
              <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Admin</div>
              <NavItem to="/admin" icon={Shield} label="Quản trị hệ thống" />
            </>
          )}

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Tài khoản</div>
          <NavItem to="/profile" icon={UserCircle} label="Hồ sơ của tôi" />
          <NavItem to="/dashboard" icon={Settings} label="Cài đặt" />
        </nav>

        <div className="p-2.5 border-t border-white/[.07]">
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[.04] cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
              {user ? initials(user.fullName) : '??'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#f0f0f5] truncate">{user?.fullName}</div>
              <div className="text-[10px] text-[#5a5a6e]">{user?.xp?.toLocaleString() ?? 0} XP</div>
            </div>
            <button onClick={handleLogout} className="text-[#5a5a6e] hover:text-[#ef4444] transition-colors p-1">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <div className="flex-1 text-[14px] font-medium text-[#f0f0f5] tracking-tight" id="page-title-slot" />

          <div className="flex items-center gap-2 bg-[#1e1e28] border border-white/[.07] rounded-lg px-3 h-8 min-w-[200px] hover:border-white/[.13] transition-colors">
            <Search size={13} className="text-[#5a5a6e] flex-shrink-0" />
            <input
              placeholder="Tìm kiếm..."
              className="bg-transparent border-none outline-none text-[12px] text-[#f0f0f5] placeholder-[#5a5a6e] font-['DM_Sans'] w-full"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 rounded-lg border border-white/[.07] flex items-center justify-center text-[#8b8b9e] hover:bg-white/[.04] hover:text-[#f0f0f5] transition-all"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#0f0f13]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 w-[360px] rounded-2xl border border-white/[.08] bg-[#16161d] shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/[.06] flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-semibold text-[#f0f0f5]">Thông báo</div>
                    <div className="text-[11px] text-[#8b8b9e]">{unreadCount} chưa đọc</div>
                  </div>

                  <button
                    onClick={() => markAllMut.mutate()}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Đánh dấu tất cả
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[12px] text-[#8b8b9e]">
                      Chưa có thông báo nào
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n: any) => {
                      const { icon: Icon, color } = notifMeta(n.type)

                      return (
                        <button
                          key={n.id}
                          onClick={() => handleOpenNotification(n)}
                          className="w-full text-left px-4 py-3 border-b border-white/[.06] hover:bg-white/[.03] transition-colors flex items-start gap-3"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${color}18` }}
                          >
                            <Icon size={16} style={{ color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-medium text-[#f0f0f5] line-clamp-1">
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[12px] text-[#8b8b9e] mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-[10px] text-[#5a5a6e] mt-1.5">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/[.06]">
                  <button
                    onClick={() => {
                      setNotifOpen(false)
                      navigate('/notifications')
                    }}
                    className="w-full text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Xem tất cả thông báo →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white cursor-pointer">
            {user ? initials(user.fullName) : '?'}
          </div>
        </header>

        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}