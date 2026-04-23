import { useEffect, useMemo, useState } from 'react'
import {
  Settings, Moon, Bell, Shield, Save, UserCircle,
  Mail, LogOut, Lock, Loader2, CheckCircle2, Sun
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { userApi, authApi } from '@/api/services'
import { useNavigate } from 'react-router-dom'

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'relative w-10 h-5 rounded-full transition-all flex-shrink-0',
        checked ? 'bg-indigo-500' : 'bg-white/[.15]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <div
        className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
          checked ? 'left-5' : 'left-0.5',
        )}
      />
    </button>
  )
}

function SettingRow({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)]">{title}</p>
        {desc && (
          <p className="text-[11px] text-[var(--text3)] mt-0.5 leading-relaxed">
            {desc}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div
        className="flex items-center gap-2 px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <Icon size={15} className="text-indigo-400" />
        <span className="text-[13px] font-semibold text-[var(--text)]">{title}</span>
      </div>
      <div className="px-5">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore()
  const darkMode = useUiStore(s => s.darkMode)
  const toggleDarkMode = useUiStore(s => s.toggleDarkMode)

  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const [settings, setSettings] = useState({
    taskNotif: true,
    chatNotif: true,
    emailNotif: false,
    aiNotif: true,
    lang: 'vi',
  })

  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const rawSettings = (user as any)?.settings ?? {}

    setSettings({
      taskNotif: rawSettings.taskNotif ?? true,
      chatNotif: rawSettings.chatNotif ?? true,
      emailNotif: rawSettings.emailNotif ?? false,
      aiNotif: rawSettings.aiNotif ?? true,
      lang: rawSettings.lang ?? 'vi',
    })
  }, [user])

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }))
  }

  const accountBadge = useMemo(() => {
    const role = user?.role
    if (role === 'ADMIN') return 'Quản trị viên'
    return 'Thành viên'
  }, [user?.role])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const updated = await userApi.updateProfile({
        settings: {
          ...(user as any)?.settings,
          ...settings,
          darkMode,
        },
      } as any)

      updateUser(updated)
      toast.success('Đã lưu cài đặt')
    } catch {
      toast.error('Lưu cài đặt thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pw.currentPassword || !pw.newPassword || !pw.confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }

    if (pw.newPassword.length < 6) {
      toast.error('Mật khẩu mới tối thiểu 6 ký tự')
      return
    }

    if (pw.newPassword !== pw.confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp')
      return
    }

    setSavingPw(true)
    try {
      await userApi.changePassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      })

      toast.success('Đổi mật khẩu thành công')
      setPw({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPwModal(false)
    } catch {
      toast.error('Mật khẩu hiện tại không đúng')
    } finally {
      setSavingPw(false)
    }
  }

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || ''
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch {
    } finally {
      logout?.()
      toast.success('Đã đăng xuất')
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl border"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text)]">Đổi mật khẩu</p>
                <p className="text-[11px] text-[var(--text3)] mt-1">
                  Cập nhật mật khẩu đăng nhập để bảo mật tài khoản
                </p>
              </div>
              <button
                onClick={() => setShowPwModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] hover:bg-white/[.05] transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text2)] mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={pw.currentPassword}
                  onChange={e => setPw(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border text-[13px] outline-none"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text2)] mb-1.5">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={pw.newPassword}
                  onChange={e => setPw(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border text-[13px] outline-none"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text2)] mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={pw.confirmPassword}
                  onChange={e => setPw(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border text-[13px] outline-none"
                  style={{
                    background: 'var(--bg3)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowPwModal(false)}
                className="flex-1 h-10 rounded-xl border text-[12px] transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Hủy
              </button>
              <button
                onClick={handleChangePassword}
                disabled={savingPw}
                className="flex-1 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-[12px] font-medium text-white transition-colors flex items-center justify-center gap-2"
              >
                {savingPw ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {savingPw ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-[18px] font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Settings size={18} className="text-indigo-400" />
            Cài đặt
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
            Quản lý tài khoản, thông báo, giao diện và bảo mật
          </p>
        </div>

        <Section icon={UserCircle} title="Tài khoản">
          <SettingRow title="Họ và tên" desc="Thông tin hồ sơ cơ bản của bạn">
            <div className="text-right">
              <p className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                {user?.fullName || 'Chưa cập nhật'}
              </p>
              <button
                onClick={() => navigate('/profile/edit')}
                className="mt-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </SettingRow>

          <SettingRow title="Email" desc="Địa chỉ email đăng nhập">
            <div className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--text2)' }}>
              <Mail size={13} className="text-indigo-400" />
              {user?.email}
            </div>
          </SettingRow>

          <SettingRow title="Vai trò tài khoản" desc="Loại tài khoản hiện tại">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-medium text-indigo-300">
              {accountBadge}
            </span>
          </SettingRow>
        </Section>

        <Section icon={Moon} title="Giao diện">
          <SettingRow
            title="Chế độ sáng / tối"
            desc="Chuyển đổi giao diện toàn bộ ứng dụng"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (darkMode) toggleDarkMode()
                }}
                className={clsx(
                  'px-3 h-9 rounded-xl text-[12px] font-medium border transition-all flex items-center gap-1.5',
                  !darkMode
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'border-[var(--border)]',
                )}
                style={!darkMode ? {} : { color: 'var(--text2)' }}
              >
                <Sun size={13} />
                Sáng
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!darkMode) toggleDarkMode()
                }}
                className={clsx(
                  'px-3 h-9 rounded-xl text-[12px] font-medium border transition-all flex items-center gap-1.5',
                  darkMode
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'border-[var(--border)]',
                )}
                style={darkMode ? {} : { color: 'var(--text2)' }}
              >
                <Moon size={13} />
                Tối
              </button>
            </div>
          </SettingRow>

          <SettingRow title="Ngôn ngữ" desc="Ngôn ngữ hiển thị của ứng dụng">
            <select
              value={settings.lang}
              onChange={e => setSettings(prev => ({ ...prev, lang: e.target.value }))}
              className="h-9 px-3 rounded-lg text-[12px] outline-none border"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </SettingRow>
        </Section>

        <Section icon={Bell} title="Thông báo">
          <SettingRow title="Thông báo Task" desc="Nhận thông báo task mới, deadline và cập nhật tiến độ">
            <Toggle checked={settings.taskNotif} onChange={() => toggle('taskNotif')} />
          </SettingRow>

          <SettingRow title="Thông báo Chat" desc="Tin nhắn mới trong nhóm học và trò chuyện trực tiếp">
            <Toggle checked={settings.chatNotif} onChange={() => toggle('chatNotif')} />
          </SettingRow>

          <SettingRow title="Thông báo AI" desc="Kết quả gợi ý học tập, quiz, flashcard và hỗ trợ AI">
            <Toggle checked={settings.aiNotif} onChange={() => toggle('aiNotif')} />
          </SettingRow>

          <SettingRow title="Thông báo Email" desc="Gửi tóm tắt hoạt động hoặc cập nhật quan trọng qua email">
            <Toggle checked={settings.emailNotif} onChange={() => toggle('emailNotif')} />
          </SettingRow>
        </Section>

        <Section icon={Shield} title="Bảo mật">
          <SettingRow title="Đổi mật khẩu" desc="Cập nhật mật khẩu đăng nhập của bạn">
            <button
              onClick={() => setShowPwModal(true)}
              className="px-3 py-1.5 rounded-lg border text-[12px] hover:bg-white/[.04] transition-all flex items-center gap-1.5"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <Lock size={12} />
              Đổi mật khẩu
            </button>
          </SettingRow>

          <SettingRow title="Đăng xuất" desc="Đăng xuất khỏi tài khoản trên thiết bị hiện tại">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-red-500/20 text-[12px] text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5"
            >
              <LogOut size={12} />
              Đăng xuất
            </button>
          </SettingRow>
        </Section>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full h-11 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 rounded-xl text-[13px] font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>
    </>
  )
}