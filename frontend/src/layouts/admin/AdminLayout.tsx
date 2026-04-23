import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Users2, FileText,
  BrainCircuit, AlertTriangle, Bell, Settings, LogOut
} from 'lucide-react'
import clsx from 'clsx'

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
        <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,.06)' }}>
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#dc2626,#9f1239)' }}>
            <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
              <path d="M9 1l2 5h5l-4 3 1.5 5L9 11l-4.5 3L6 9 2 6h5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#f0f0f5]">StudyMate AI</div>
            <div className="text-[9px] text-[#5a5a6e] uppercase tracking-widest">Quản trị hệ thống</div>
          </div>
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(220,38,38,.2)', color: '#f87171' }}>
            ADMIN
          </span>
        </div>

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
          <AdminNavItem to="/admin/alerts" icon={AlertTriangle}  label="Cảnh báo học lực" />

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
