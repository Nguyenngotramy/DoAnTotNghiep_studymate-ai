import { useMemo, useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { membershipApi } from '@/api/services'
import { resolveUserAvatar } from '@/utils/avatar'
import toast from 'react-hot-toast'
import { Crown, Check, Copy, Loader2, Wallet, Eye, EyeOff, RefreshCw, Sparkles, Zap, Shield, X, CheckCircle2, PartyPopper } from 'lucide-react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'

type TierKey = 'SILVER' | 'GOLD'
type PeriodKey = 'WEEK' | 'MONTH' | 'YEAR'

const TIER_META: Record<TierKey, {
  label: string; color: string; desc: string
  gradient: string; icon: React.ReactNode; accentColor: string
}> = {
  SILVER: {
    label: 'Bạc', color: '#94a3b8',
    desc: 'Nhiều nhóm, dung lượng lớn hơn, AI x30/tháng',
    gradient: 'linear-gradient(135deg, #475569 0%, #94a3b8 50%, #cbd5e1 100%)',
    icon: <Shield size={18} />,
    accentColor: '#94a3b8',
  },
  GOLD: {
    label: 'Vàng', color: '#f59e0b',
    desc: 'Không giới hạn nhóm & AI, dung lượng tối đa',
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde68a 100%)',
    icon: <Crown size={18} />,
    accentColor: '#f59e0b',
  },
}

const PERIOD_META: Record<PeriodKey, { label: string; sublabel: string }> = {
  WEEK: { label: 'Tuần', sublabel: '7 ngày' },
  MONTH: { label: 'Tháng', sublabel: '30 ngày' },
  YEAR: { label: 'Năm', sublabel: '365 ngày' },
}

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}

function limitText(v: number) {
  return v < 0 ? '∞' : String(v)
}

// ── Payment Modal ──
const MODAL_DURATION = 300 // 5 phút

function PaymentModal({
  order,
  bank,
  onClose,
  onApproved,
}: {
  order: any
  bank: any
  onClose: () => void
  onApproved: () => void
}) {
  const [timer, setTimer] = useState(MODAL_DURATION)
  const [copied, setCopied] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [approved, setApproved] = useState(false)
  const [qrVisible, setQrVisible] = useState(false)
  const onCloseRef = useRef(onClose)
  const onApprovedRef = useRef(onApproved)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { onApprovedRef.current = onApproved }, [onApproved])

  // Animate in
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Countdown — auto-close at 0
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setVisible(false)
          setTimeout(() => onCloseRef.current(), 300)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Polling — tự đóng khi admin duyệt
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const orders = await membershipApi.getOrders()
        const thisOrder = orders.find((o: any) => o.id === order.id)
        if (thisOrder?.status === 'APPROVED') {
          clearInterval(poll)
          setApproved(true)
          // Hiện trạng thái duyệt 2 giây rồi đóng
          setTimeout(() => {
            setVisible(false)
            setTimeout(() => {
              onApprovedRef.current()
              onCloseRef.current()
            }, 300)
          }, 2000)
        }
      } catch { /* ignore */ }
    }, 10_000) // poll mỗi 10 giây
    return () => clearInterval(poll)
  }, [order.id])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch { /* ignore */ }
  }

  const progress = (timer / MODAL_DURATION) * 100
  const mins = Math.floor(timer / 60)
  const secs = (timer % 60).toString().padStart(2, '0')

  const isGold = order.tier === 'GOLD'
  const accentColor = isGold ? '#f59e0b' : '#94a3b8'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{
          background: 'var(--bg2)',
          border: `1px solid ${approved ? 'rgba(34,197,94,0.5)' : accentColor + '40'}`,
          boxShadow: approved
            ? '0 0 0 1px rgba(34,197,94,0.2), 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(34,197,94,0.2)'
            : `0 0 0 1px ${accentColor}20, 0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${accentColor}15`,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, border-color 0.5s, box-shadow 0.5s',
        }}
      >
        {/* Progress bar top */}
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              height: '100%',
              width: approved ? '100%' : `${progress}%`,
              background: approved
                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                : `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              transition: approved ? 'width 0.5s ease, background 0.5s' : 'width 1s linear',
              boxShadow: approved ? '0 0 8px rgba(34,197,94,0.8)' : `0 0 8px ${accentColor}80`,
            }}
          />
        </div>

        {/* ── APPROVED state ── */}
        {approved ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}>
              <PartyPopper size={28} className="text-green-400" />
            </div>
            <div>
              <p className="text-[20px] font-black text-green-400">Đã được duyệt!</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                Gói {isGold ? 'Vàng' : 'Bạc'} của bạn đã được kích hoạt.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header — full width */}
            <div className="px-6 pt-5 pb-4 relative">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${accentColor}18, transparent)`, transform: 'translate(30%,-30%)' }} />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}>
                    {isGold ? <Crown size={18} style={{ color: accentColor }} /> : <Shield size={18} style={{ color: accentColor }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-green-400" />
                      <span className="text-[11px] font-semibold text-green-400">Đơn đã được tạo</span>
                    </div>
                    <p className="text-[17px] font-black mt-0.5" style={{ color: 'var(--text)' }}>
                      Gói {isGold ? 'Vàng' : 'Bạc'} · {formatVnd(order.amountVnd)}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={handleClose}
                  className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--text3)' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Timer bar */}
              <div className="mt-3 flex items-center justify-between rounded-xl px-3.5 py-2"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 -rotate-90 shrink-0" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke={accentColor}
                      strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="text-[11px]" style={{ color: 'var(--text2)' }}>Mã hết hạn sau</span>
                </div>
                <span className="font-mono font-black text-[18px]"
                  style={{ color: timer < 60 ? '#f87171' : accentColor }}>
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* 2-column body */}
            <div className="grid grid-cols-5 gap-0 border-t" style={{ borderColor: 'var(--border)' }}>

              {/* Left col — transfer info (3/5) */}
              <div className="col-span-3 px-6 py-4 space-y-2 border-r" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text3)' }}>
                  Thông tin chuyển khoản
                </p>
                {[
                  { label: 'Mã chuyển khoản', value: order.transferCode, key: 'code', mono: true, accent: true },
                  { label: 'Số tiền', value: formatVnd(order.amountVnd), key: 'amount', mono: false, accent: false },
                  { label: 'Ngân hàng', value: bank.bankName, key: 'bank', mono: false, accent: false },
                  { label: 'Số tài khoản', value: bank.accountNumber, key: 'acc', mono: true, accent: false },
                  { label: 'Chủ tài khoản', value: bank.accountName, key: 'name', mono: false, accent: false },
                ].filter(r => r.value).map(row => (
                  <div key={row.key}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{
                      background: row.accent ? `${accentColor}0f` : 'var(--bg3)',
                      border: `1px solid ${row.accent ? accentColor + '30' : 'var(--border)'}`,
                    }}>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--text3)' }}>{row.label}</p>
                      <p className={clsx('text-[13px] font-bold mt-0.5', row.mono && 'font-mono')}
                        style={{ color: row.accent ? accentColor : 'var(--text)' }}>
                        {row.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(row.value, row.key)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all shrink-0 ml-2"
                      style={{
                        background: copied === row.key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                        color: copied === row.key ? '#4ade80' : 'var(--text3)',
                        border: `1px solid ${copied === row.key ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      }}>
                      {copied === row.key
                        ? <><CheckCircle2 size={10} /> Đã chép</>
                        : <><Copy size={10} /> Sao chép</>}
                    </button>
                  </div>
                ))}
              </div>

              {/* Right col — QR (2/5) */}
              <div className="col-span-2 px-5 py-4 flex flex-col items-center justify-center gap-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text3)' }}>
                  Mã QR
                </p>
                {bank.qrImageUrl ? (
                  <div className="relative w-full" style={{ maxWidth: 180 }}>
                    <div className={clsx(
                      'rounded-2xl bg-white p-2.5 transition-all duration-300 w-full aspect-square',
                      !qrVisible && 'blur-md'
                    )}>
                      <img
                        src={bank.qrImageUrl.startsWith('http') ? bank.qrImageUrl : resolveUserAvatar(bank.qrImageUrl)}
                        alt="QR thanh toán"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {!qrVisible ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button type="button" onClick={() => setQrVisible(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[11px] font-semibold"
                          style={{ background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)' }}>
                          <Eye size={13} /> Hiện QR
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setQrVisible(false)}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-lg text-white"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <EyeOff size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center text-[11px] text-center px-3"
                    style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px dashed var(--border)' }}>
                    Chưa cấu hình QR
                  </div>
                )}
                <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--text3)' }}>
                  Nhập đúng mã CK<br />vào nội dung chuyển tiền.<br />
                  Duyệt trong <span style={{ color: accentColor }}>5–15 phút</span>.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function MembershipPage() {
  const qc = useQueryClient()
  const [tier, setTier] = useState<TierKey>('GOLD')
  const [period, setPeriod] = useState<PeriodKey>('MONTH')
  const [note, setNote] = useState('')
  const [activeOrder, setActiveOrder] = useState<any>(null)

  const { data: summary, isLoading: loadingMe } = useQuery({
    queryKey: ['membership-me'],
    queryFn: () => membershipApi.getMy(),
  })

  const { data: plans } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membershipApi.getPlans(),
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['membership-orders'],
    queryFn: () => membershipApi.getOrders(),
  })

  const pendingOrder = orders.find((o: any) => o.status === 'PENDING')
  const isExpired = pendingOrder && new Date(pendingOrder.expiresAt) < new Date()

  const price = useMemo(() => {
    const p = plans?.pricing?.[tier]?.[period]
    return typeof p === 'number' ? p : 0
  }, [plans, tier, period])

  const createMut = useMutation({
    mutationFn: () => membershipApi.createOrder({ tier, period, note: note.trim() || undefined }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['membership-orders'] })
      setActiveOrder(order)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Không tạo được đơn'),
  })

  const bank = plans?.bank ?? {}
  const limits = plans?.limits ?? {}
  const usage = summary?.usage ?? {}

  if (loadingMe) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-400" size={32} />
          <p className="text-[12px]" style={{ color: 'var(--text3)' }}>Đang tải…</p>
        </div>
      </div>
    )
  }

  const tierMeta = TIER_META[tier]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* ── Payment Modal ── */}
      {activeOrder && (
        <PaymentModal
          order={activeOrder}
          bank={bank}
          onClose={() => setActiveOrder(null)}
          onApproved={() => {
            toast.success('🎉 Gói đã được kích hoạt!')
            qc.invalidateQueries({ queryKey: ['membership-me'] })
            qc.invalidateQueries({ queryKey: ['membership-orders'] })
          }}
        />
      )}

      {/* ── Hero header ── */}
      <div className="relative rounded-3xl overflow-hidden px-6 py-8"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 20px 60px rgba(99,102,241,0.15)',
        }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.2)' }}>
                <Crown size={16} className="text-amber-400" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/80">
                StudyMate Premium
              </span>
            </div>
            <h1 className="text-[26px] font-black text-white leading-tight">
              Nâng cấp trải<br />nghiệm học tập
            </h1>
            <p className="text-[12px] mt-2 text-indigo-200/70 max-w-xs">
              Tạo nhiều nhóm hơn, mở khóa AI không giới hạn và dùng dung lượng học tập cá nhân rộng mở.
            </p>
          </div>

          <div className="rounded-2xl px-5 py-4 min-w-[180px]"
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-[10px] uppercase tracking-widest text-indigo-300/60 mb-1">Gói hiện tại</p>
            <p className="text-[20px] font-black text-white">{summary?.tierLabel ?? 'Thành viên'}</p>
            {summary?.membershipExpiresAt && (
              <p className="text-[10px] mt-1 text-indigo-200/50">
                Hết hạn {new Date(summary.membershipExpiresAt).toLocaleDateString('vi-VN')}
              </p>
            )}
            <div className="mt-3 space-y-1">
              <UsageBar label="Nhóm" used={usage.groupsLed ?? 0} max={usage.maxGroups ?? 5} />
              <UsageBar label="AI" used={usage.aiTrendUsed ?? 0} max={usage.aiTrendLimit ?? 3} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tier compare cards ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text3)' }}>
          So sánh gói
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(['MEMBER', 'SILVER', 'GOLD'] as const).map(key => {
            const lim = limits[key] ?? {}
            const isCurrent = summary?.tier === key
            const isGold = key === 'GOLD'
            const isSilver = key === 'SILVER'
            return (
              <div key={key} className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: isGold
                    ? 'linear-gradient(160deg, #1c1200 0%, #2d1f00 100%)'
                    : isSilver
                    ? 'linear-gradient(160deg, #0f1520 0%, #1a2233 100%)'
                    : 'var(--bg2)',
                  border: isGold
                    ? '1px solid rgba(245,158,11,0.35)'
                    : isSilver
                    ? '1px solid rgba(148,163,184,0.25)'
                    : '1px solid var(--border)',
                  boxShadow: isGold ? '0 0 30px rgba(245,158,11,0.08)' : 'none',
                }}>
                {isGold && (
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
                )}
                {isCurrent && (
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                      Đang dùng
                    </span>
                  </div>
                )}
                <div className="mb-3">
                  {isGold ? <Crown size={16} className="text-amber-400 mb-1" />
                    : isSilver ? <Shield size={16} className="mb-1" style={{ color: '#94a3b8' }} />
                    : <Sparkles size={16} className="text-indigo-400 mb-1" />}
                  <p className="text-[13px] font-bold"
                    style={{ color: isGold ? '#fde68a' : isSilver ? '#cbd5e1' : 'var(--text)' }}>
                    {key === 'MEMBER' ? 'Miễn phí' : key === 'SILVER' ? 'Bạc' : 'Vàng'}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
                    <Check size={11} className="shrink-0 mt-0.5 text-green-400" />
                    <span>{limitText(lim.maxGroups ?? 5)} nhóm</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
                    <Check size={11} className="shrink-0 mt-0.5 text-green-400" />
                    <span>{limitText(lim.studyDriveMb ?? 500)} MB lưu trữ</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
                    <Zap size={11} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>{limitText(lim.aiTrendPerMonth ?? 3)} AI/tháng</span>
                  </li>
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Order form (full width) ── */}
      <div className="rounded-2xl border p-6 space-y-5"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>Chọn gói nâng cấp</h2>

        {/* Tier selector */}
        <div className="grid grid-cols-2 gap-3">
          {(['SILVER', 'GOLD'] as TierKey[]).map(t => {
            const isActive = tier === t
            const meta = TIER_META[t]
            return (
              <button key={t} type="button" onClick={() => setTier(t)}
                className="relative rounded-xl p-4 text-left transition-all duration-200 overflow-hidden"
                style={{
                  background: isActive
                    ? t === 'GOLD' ? 'linear-gradient(135deg, #1c1200, #2d1f00)' : 'linear-gradient(135deg, #0f1520, #1a2233)'
                    : 'var(--bg3)',
                  border: `1px solid ${isActive ? meta.accentColor + '60' : 'var(--border)'}`,
                  boxShadow: isActive ? `0 0 20px ${meta.accentColor}18` : 'none',
                }}>
                {isActive && (
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-30"
                    style={{ background: `radial-gradient(circle, ${meta.accentColor}, transparent)` }} />
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ color: meta.accentColor }}>{meta.icon}</span>
                  <span className="text-[14px] font-bold" style={{ color: isActive ? meta.accentColor : 'var(--text)' }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text3)' }}>{meta.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Period + Price in a row */}
        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <p className="text-[11px] mb-2 font-medium" style={{ color: 'var(--text3)' }}>Chu kỳ thanh toán</p>
            <div className="grid grid-cols-3 gap-2">
              {(['WEEK', 'MONTH', 'YEAR'] as PeriodKey[]).map(p => {
                const isActive = period === p
                const pmeta = PERIOD_META[p]
                return (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    className="py-2.5 px-2 rounded-xl text-center transition-all"
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg3)',
                      border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                    }}>
                    <div className="text-[12px] font-bold" style={{ color: isActive ? '#818cf8' : 'var(--text)' }}>
                      {pmeta.label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{pmeta.sublabel}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text3)' }}>Tổng thanh toán</p>
              <p className="text-[24px] font-black" style={{ color: tierMeta.accentColor }}>
                {formatVnd(price)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'var(--text3)' }}>Gói</p>
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text2)' }}>
                {tierMeta.label} / {PERIOD_META[period].label}
              </p>
            </div>
          </div>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ghi chú khi chuyển khoản (tuỳ chọn)"
          rows={2}
          className="w-full rounded-xl px-3 py-2.5 text-[12px] border resize-none outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        {/* Pending order notice */}
        {pendingOrder && !isExpired && (
          <div className="rounded-xl p-3.5 flex items-center gap-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-amber-400">Bạn có đơn đang chờ duyệt</p>
              <p className="text-[11px] font-mono text-amber-300 truncate">Mã CK: {pendingOrder.transferCode}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveOrder(pendingOrder)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
              Xem lại
            </button>
          </div>
        )}

        {pendingOrder && isExpired && (
          <div className="rounded-xl p-3.5"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-[12px] font-bold text-red-400 mb-0.5">Đơn đã hết hạn</p>
            <p className="text-[11px]" style={{ color: 'var(--text2)' }}>Vui lòng tạo yêu cầu thanh toán mới.</p>
          </div>
        )}

        <button
          type="button"
          disabled={createMut.isPending || !price || Boolean(pendingOrder && !isExpired)}
          onClick={() => createMut.mutate()}
          className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
          style={{
            background: (pendingOrder && !isExpired)
              ? 'rgba(99,102,241,0.3)'
              : `linear-gradient(135deg, #6366f1, #4f46e5)`,
            boxShadow: (!pendingOrder || isExpired) ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
          }}>
          {createMut.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <Wallet size={16} />}
          {pendingOrder && !isExpired ? 'Đang có đơn chờ duyệt' : 'Tạo yêu cầu thanh toán'}
        </button>
      </div>

      {/* ── Orders history ── */}
      {orders.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text3)' }}>
            Lịch sử đơn
          </p>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {orders.map((o: any, idx: number) => (
                <div key={o.id}
                  className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
                  style={{ background: idx % 2 === 0 ? 'var(--bg2)' : 'transparent' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: o.status === 'APPROVED' ? 'rgba(34,197,94,0.15)'
                          : o.status === 'REJECTED' ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)'
                      }}>
                      {o.tier === 'GOLD'
                        ? <Crown size={14} className="text-amber-400" />
                        : <Shield size={14} style={{ color: '#94a3b8' }} />}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                        Gói {o.tier === 'GOLD' ? 'Vàng' : 'Bạc'} · {PERIOD_META[o.period as PeriodKey]?.label || o.period}
                        <span className="ml-2 font-black">{formatVnd(o.amountVnd)}</span>
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>
                        Mã CK: {o.transferCode}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max < 0 ? 100 : Math.min((used / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[9px] text-indigo-200/50">{label}</span>
        <span className="text-[9px] text-indigo-200/50">{max < 0 ? '∞' : `${used}/${max}`}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct > 80 ? '#f87171' : 'rgba(165,180,252,0.7)' }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === 'APPROVED'
    ? { label: 'Đã duyệt', bg: 'rgba(34,197,94,0.12)', color: '#4ade80', dot: '#4ade80' }
    : status === 'REJECTED'
    ? { label: 'Từ chối', bg: 'rgba(239,68,68,0.12)', color: '#f87171', dot: '#f87171' }
    : { label: 'Chờ duyệt', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', dot: '#f59e0b' }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </div>
  )
}
