import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/services'
import { useUiStore } from '@/store/uiStore'
import {
  Settings,
  Save,
  BrainCircuit,
  ShieldAlert,
  FileText,
  Upload,
  Bell,
  AlertTriangle,
  Moon,
  Sun,
} from 'lucide-react'

export default function AdminSettings() {
  const { darkMode, setDarkMode } = useUiStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    weakGpaThreshold: 5.5,
    criticalGpaThreshold: 4.5,
    infoGpaThreshold: 6.5,

    enableAdminAlerts: true,
    alertOnWeakLearner: true,
    alertOnReportedPost: true,
    alertOnReportedDocument: true,
    alertOnOverdueTask: true,

    defaultRequirePostApproval: false,

    autoReviewReportedDocument: true,
    documentReportLimit: 3,
    blockRejectedDocument: true,

    supportReminderTitle: 'Hỗ trợ học tập từ StudyMate AI',
    supportReminderMessage:
      'Kết quả gần đây cho thấy bạn có thể cần thêm hỗ trợ học tập. Hãy xem lại tài liệu, quiz và nhóm học phù hợp để cải thiện dần nhé.',

    infoLabel: 'Cần theo dõi thêm',
    warningLabel: 'Nguy cơ học lực giảm',
    criticalLabel: 'Cần can thiệp sớm',

    mlServiceUrl: 'http://localhost:8000',
    mlHealthEndpoint: '/health',

    maxFileUploadMb: 25,
    allowedFileTypes: 'PDF,DOC,DOCX,PPT,PPTX,TXT,PNG,JPG,JPEG,ZIP',
    appearanceTheme: 'light',
  })

  useEffect(() => {
    adminApi.getAdminSettings()
      .then(data => {
        setSettings(prev => ({ ...prev, ...data }))
      })
      .catch(() => toast.error('Không thể tải cài đặt hệ thống'))
      .finally(() => setLoading(false))
  }, [setDarkMode])

  const updateField = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setDarkMode(theme === 'dark')
    updateField('appearanceTheme', theme)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.saveAdminSettings({
        ...settings,
        appearanceTheme: darkMode ? 'dark' : 'light',
      })
      toast.success('Đã lưu cài đặt hệ thống')
    } catch {
      toast.error('Không thể lưu cài đặt hệ thống')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] text-[var(--text)] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold flex items-center gap-2">
            <Settings size={22} className="text-red-400" />
            Cài đặt hệ thống
          </h1>
          <p className="text-[13px] text-[#8b8b9e] mt-1">
            Quản lý ngưỡng cảnh báo, rule moderation, ML service và giới hạn upload.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium"
        >
          <Save size={15} />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="xl:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-[16px] font-semibold mb-2">Giao diện toàn hệ thống</h2>
          <p className="text-[12px] text-[var(--text2)] mb-4">
            Theme được áp dụng đồng bộ cho khu vực người dùng và quản trị trên thiết bị này.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                !darkMode ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--bg3)]'
              }`}
            >
              <Sun size={18} className="text-amber-500" />
              <span>
                <strong className="block text-[13px]">Sáng</strong>
                <span className="text-[11px] text-[var(--text2)]">Nền sáng, phù hợp ban ngày</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                darkMode ? 'border-red-500 bg-red-500/10' : 'border-[var(--border)] bg-[var(--bg3)]'
              }`}
            >
              <Moon size={18} className="text-indigo-400" />
              <span>
                <strong className="block text-[13px]">Tối</strong>
                <span className="text-[11px] text-[var(--text2)]">Giảm chói khi dùng ban đêm</span>
              </span>
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-yellow-400" />
            Ngưỡng cảnh báo học lực
          </h2>

          <div className="space-y-4">
            <SettingNumber
              label="INFO threshold"
              desc="GPA dưới mức này sẽ được theo dõi thêm."
              value={settings.infoGpaThreshold}
              onChange={v => updateField('infoGpaThreshold', v)}
            />

            <SettingNumber
              label="WARNING threshold"
              desc="GPA dưới mức này sẽ cảnh báo nguy cơ học lực giảm."
              value={settings.weakGpaThreshold}
              onChange={v => updateField('weakGpaThreshold', v)}
            />

            <SettingNumber
              label="CRITICAL threshold"
              desc="GPA dưới mức này cần can thiệp sớm."
              value={settings.criticalGpaThreshold}
              onChange={v => updateField('criticalGpaThreshold', v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-red-400" />
            Rule admin alert
          </h2>

          <div className="space-y-3">
            <SettingToggle
              label="Bật admin alerts"
              checked={settings.enableAdminAlerts}
              onChange={v => updateField('enableAdminAlerts', v)}
            />

            <SettingToggle
              label="Cảnh báo user học lực yếu"
              checked={settings.alertOnWeakLearner}
              onChange={v => updateField('alertOnWeakLearner', v)}
            />

            <SettingToggle
              label="Cảnh báo bài đăng bị report"
              checked={settings.alertOnReportedPost}
              onChange={v => updateField('alertOnReportedPost', v)}
            />

            <SettingToggle
              label="Cảnh báo tài liệu bị report"
              checked={settings.alertOnReportedDocument}
              onChange={v => updateField('alertOnReportedDocument', v)}
            />

            <SettingToggle
              label="Cảnh báo task quá hạn"
              checked={settings.alertOnOverdueTask}
              onChange={v => updateField('alertOnOverdueTask', v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <FileText size={18} className="text-blue-400" />
            Moderation bài đăng & tài liệu
          </h2>

          <div className="space-y-4">
            <SettingToggle
              label="Require post approval mặc định"
              checked={settings.defaultRequirePostApproval}
              onChange={v => updateField('defaultRequirePostApproval', v)}
            />

            <SettingToggle
              label="Tự chuyển tài liệu bị report sang under review"
              checked={settings.autoReviewReportedDocument}
              onChange={v => updateField('autoReviewReportedDocument', v)}
            />

            <SettingNumber
              label="Số report để ưu tiên xử lý"
              desc="Tài liệu đạt số report này sẽ được đưa vào mức ưu tiên cao."
              value={settings.documentReportLimit}
              onChange={v => updateField('documentReportLimit', v)}
            />

            <SettingToggle
              label="Chặn tài liệu đã bị reject"
              checked={settings.blockRejectedDocument}
              onChange={v => updateField('blockRejectedDocument', v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <Bell size={18} className="text-emerald-400" />
            Text mẫu nhắc nhở hỗ trợ
          </h2>

          <div className="space-y-4">
            <SettingInput
              label="Tiêu đề mặc định"
              value={settings.supportReminderTitle}
              onChange={v => updateField('supportReminderTitle', v)}
            />

            <div>
              <label className="text-[12px] text-[#8b8b9e]">Nội dung mặc định</label>
              <textarea
                value={settings.supportReminderMessage}
                onChange={e => updateField('supportReminderMessage', e.target.value)}
                rows={5}
                className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-red-500/50 resize-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-yellow-400" />
            Cấu hình mức cảnh báo
          </h2>

          <div className="space-y-4">
            <SettingInput
              label="INFO label"
              value={settings.infoLabel}
              onChange={v => updateField('infoLabel', v)}
            />

            <SettingInput
              label="WARNING label"
              value={settings.warningLabel}
              onChange={v => updateField('warningLabel', v)}
            />

            <SettingInput
              label="CRITICAL label"
              value={settings.criticalLabel}
              onChange={v => updateField('criticalLabel', v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <BrainCircuit size={18} className="text-purple-400" />
            ML service
          </h2>

          <div className="space-y-4">
            <SettingInput
              label="ML service URL"
              value={settings.mlServiceUrl}
              onChange={v => updateField('mlServiceUrl', v)}
            />

            <SettingInput
              label="Health endpoint"
              value={settings.mlHealthEndpoint}
              onChange={v => updateField('mlHealthEndpoint', v)}
            />

            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
              <p className="text-[12px] text-emerald-300">Health status</p>
              <p className="text-[18px] font-semibold text-emerald-400 mt-1">
                READY TO CHECK
              </p>
            </div>
          </div>
        </section>

        <section className="xl:col-span-2 rounded-2xl border border-white/[.08] bg-[#12121a] p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2 mb-4">
            <Upload size={18} className="text-blue-400" />
            Giới hạn file upload
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingNumber
              label="Dung lượng tối đa mỗi file MB"
              desc="Áp dụng cho tài liệu học tập và file chat."
              value={settings.maxFileUploadMb}
              onChange={v => updateField('maxFileUploadMb', v)}
            />

            <SettingInput
              label="Loại file cho phép"
              value={settings.allowedFileTypes}
              onChange={v => updateField('allowedFileTypes', v)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {settings.allowedFileTypes.split(',').map(type => (
              <span
                key={type}
                className="px-3 py-1 rounded-full bg-white/[.04] border border-white/[.08] text-[12px] text-[#d8d8e2]"
              >
                {type.trim()}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function SettingInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="text-[12px] text-[#8b8b9e]">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-red-500/50"
      />
    </div>
  )
}

function SettingNumber({
  label,
  desc,
  value,
  onChange,
}: {
  label: string
  desc?: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="text-[12px] text-[#8b8b9e]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-red-500/50"
      />
      {desc && <p className="text-[11px] text-[#6b6b7c] mt-1">{desc}</p>}
    </div>
  )
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-[#0a0a0f] px-3 py-2 cursor-pointer">
      <span className="text-[13px] text-[#d8d8e2]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  )
}
