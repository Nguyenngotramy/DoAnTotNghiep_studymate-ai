import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi, notificationApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Users2, FileText, MessageCircle,
  BrainCircuit, AlertTriangle, Bell, Settings, LogOut, X, Check, CheckCircle2, AlertCircle, Heart, Wallet, BarChart3
} from 'lucide-react'
import clsx from 'clsx'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const ADMIN_LOGO_SRC = '/images/admin-logo.png'

function AdminNavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => clsx(
      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all mb-0.5 relative',
      isActive
        ? 'bg-red-500/12 text-red-400 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-red-500 before:rounded-r-full'
        : 'text-[#8b8b9e] hover:bg-white/[.04] hover:text-[#f0f0f5]'
    )}>
      <Icon size={14} className="flex-shrink-0" />
      {label}
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
    case 'POST_REPORTED':
      return { icon: AlertTriangle, color: '#ef4444' }
    case 'USER_WARNING':
      return { icon: AlertCircle, color: '#f59e0b' }
    default:
      return { icon: Bell, color: '#818cf8' }
  }
}

function AdminNotifDropdown({
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
      const el = document.getElementById('admin-notif-dropdown')
      if (el && !el.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      id="admin-notif-dropdown"
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border bg-[#1a1a24] border-white/[.08]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.06]">
        <span className="text-[13px] font-semibold text-zinc-100">
          Thông báo Admin
        </span>
        <div className="flex items-center gap-3">
          {unread > 0 && <span className="text-[10px] text-red-400 font-medium">{unread} chưa đọc</span>}
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
          <div className="px-4 py-10 text-center text-[12px] text-zinc-500">
            Chưa có thông báo nào
          </div>
        ) : (
          notifications.slice(0, 8).map(n => {
            const { icon: Icon, color } = notifMeta(n.type)

            return (
              <button
                key={n.id}
                onClick={() => onOpenNotif(n)}
                className={clsx(
                  'w-full text-left flex gap-3 px-4 py-3 hover:bg-white/[.03] transition-colors border-b border-white/[.04] last:border-0',
                  !n.read && 'bg-red-500/[.03]',
                )}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium leading-snug text-zinc-200">
                      {n.title}
                    </p>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] mt-0.5 line-clamp-2 text-zinc-400">
                    {n.body}
                  </p>
                  <p className="text-[10px] mt-1 text-zinc-500">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-white/[.06]">
        <button
          onClick={() => {
            navigate('/admin/posts')
            onClose()
          }}
          className="w-full text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors text-center"
        >
          Trang kiểm duyệt bài viết →
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNotif, setShowNotif] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const { data: notificationsPage } = useQuery({
    queryKey: ['admin-notifications', 0],
    queryFn: () => notificationApi.list(0),
    refetchInterval: 12000,
    refetchOnWindowFocus: true,
  })

  const { data: notifCount } = useQuery({
    queryKey: ['admin-notification-count'],
    queryFn: () => notificationApi.count(),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  })

  const notifications = useMemo(
    () => notificationsPage?.content ?? notificationsPage?.items ?? [],
    [notificationsPage]
  )

  const unread = notifCount?.count ?? notifications.filter((n: any) => !n.read).length

  const markOneMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
      qc.invalidateQueries({ queryKey: ['admin-notification-count'] })
    },
  })

  const markAllMut = useMutation({
    mutationFn: () => notificationApi.markAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
      qc.invalidateQueries({ queryKey: ['admin-notification-count'] })
      toast.success('Đã đánh dấu tất cả là đã đọc')
    },
  })

  const handleOpenNotif = async (n: any) => {
    try {
      if (!n.read) {
        await markOneMut.mutateAsync(n.id)
      }
      setShowNotif(false)

      if (n.link) {
        navigate(n.link)
      } else {
        navigate('/admin/posts')
      }
    } catch {
      toast.error('Không mở được thông báo')
    }
  }

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken) } catch {}
    logout()
    navigate('/login')
    toast.success('Đã đăng xuất!')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Sidebar Admin - màu đỏ */}
      <aside className="w-[228px] min-w-[228px] flex flex-col" style={{ background: '#12121a', borderRight: '0.5px solid rgba(255,255,255,.06)' }}>
        {/* Logo */}
        <Link
          to="/admin/dashboard"
          className="px-4 py-4 flex items-center gap-3 hover:bg-white/[.025] transition-colors"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,.06)' }}
        >
          {!logoError ? (
            <img
              src={ADMIN_LOGO_SRC}
              alt="StudyMate AI Admin"
              className="w-11 h-11 rounded-2xl object-cover flex-shrink-0 shadow-lg shadow-red-500/15"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/15"
              style={{ background: 'linear-gradient(135deg,#dc2626,#9f1239,#fb7185)' }}
            >
              <svg viewBox="0 0 18 18" fill="none" className="w-5 h-5">
                <path
                  d="M9 2.2L14 4.2V8.1C14 11.2 12 13.8 9 15.2C6 13.8 4 11.2 4 8.1V4.2L9 2.2Z"
                  stroke="white"
                  strokeWidth="1.45"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.8 8.6L8.35 10.1L11.4 6.9"
                  stroke="white"
                  strokeWidth="1.45"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#f0f0f5] truncate">
              StudyMate AI
            </div>
            <div className="text-[9px] text-[#5a5a6e] uppercase tracking-widest truncate">
              Quản trị hệ thống
            </div>
          </div>

          <span
            className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ background: 'rgba(220,38,38,.2)', color: '#f87171' }}
          >
            ADMIN
          </span>
        </Link>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2">Tổng quan</div>
          <AdminNavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard Admin" />
          <AdminNavItem to="/admin/stats"     icon={LayoutDashboard} label="Thống kê hệ thống" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Quản lý</div>
          <AdminNavItem to="/admin/users"  icon={Users}    label="Người dùng" />
          <AdminNavItem to="/admin/posts"  icon={MessageCircle} label="Kiểm duyệt bài viết" />
          <AdminNavItem to="/admin/groups" icon={Users2}   label="Nhóm học" />
          <AdminNavItem to="/admin/docs"   icon={FileText} label="Tài liệu" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">AI & Dự đoán</div>
          <AdminNavItem to="/admin/ml"     icon={BrainCircuit}   label="Kết quả ML" />
          <AdminNavItem to="/admin/alerts" icon={AlertTriangle}  label="Cảnh báo" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Thu phí</div>
          <AdminNavItem to="/admin/membership" icon={Wallet} label="Gói & doanh thu" />
          <AdminNavItem to="/admin/revenue" icon={BarChart3} label="Thống kê doanh thu" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">Hệ thống</div>
          <AdminNavItem to="/admin/notifications" icon={Bell}     label="Gửi thông báo" />
          <AdminNavItem to="/admin/settings"      icon={Settings} label="Cài đặt hệ thống" />
        </nav>

        {/* User */}
        <div className="p-2.5" style={{ borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[.04] cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#dc2626,#9f1239)' }}>
              AD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#f0f0f5] truncate">{user?.fullName}</div>
              <div className="text-[10px]" style={{ color: '#f87171' }}>Quản trị viên</div>
            </div>
            <button onClick={handleLogout} className="text-[#5a5a6e] hover:text-red-400 transition-colors p-1">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 min-h-14 flex items-center gap-3 px-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,.06)' }}>
          <span className="text-[13px] font-medium text-[#f0f0f5] flex-1">Bảng điều khiển quản trị</span>
          
          <div className="flex items-center gap-3">
            {/* Notification bell and badge for Admin */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(v => !v)}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[.06] text-zinc-400 hover:text-white"
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotif && (
                <AdminNotifDropdown
                  unread={unread}
                  notifications={notifications}
                  onClose={() => setShowNotif(false)}
                  onOpenNotif={handleOpenNotif}
                  onMarkAll={() => markAllMut.mutate()}
                />
              )}
            </div>

            <span className="text-[10px] font-semibold px-3 py-1 rounded-md" style={{ background: 'rgba(220,38,38,.15)', color: '#f87171', border: '0.5px solid rgba(220,38,38,.3)' }}>
              Chế độ Admin
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
