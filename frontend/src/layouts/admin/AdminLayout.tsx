import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Users2, FileText,
  BrainCircuit, AlertTriangle, Bell, Settings, LogOut
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

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

export default function AdminLayout() {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()
  const [logoError, setLogoError] = useState(false)

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
          <AdminNavItem to="/admin/groups" icon={Users2}   label="Nhóm học" />
          <AdminNavItem to="/admin/docs"   icon={FileText} label="Tài liệu" />

          <div className="text-[10px] font-medium text-[#5a5a6e] uppercase tracking-[.06em] px-2 py-2 mt-2">AI & Dự đoán</div>
          <AdminNavItem to="/admin/ml"     icon={BrainCircuit}   label="Kết quả ML" />
          <AdminNavItem to="/admin/alerts" icon={AlertTriangle}  label="Cảnh báo" />

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
          <span className="text-[10px] font-semibold px-3 py-1 rounded-md" style={{ background: 'rgba(220,38,38,.15)', color: '#f87171', border: '0.5px solid rgba(220,38,38,.3)' }}>
            Chế độ Admin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
