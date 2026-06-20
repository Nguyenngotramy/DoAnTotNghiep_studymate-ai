import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, adminMembershipApi, uploadApi } from '@/api/services'
import { resolveUserAvatar } from '@/utils/avatar'
import toast from 'react-hot-toast'
import { Check, ImagePlus, Loader2, Save, Trash2, Wallet, X } from 'lucide-react'
import clsx from 'clsx'

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
}

export default function AdminMembershipPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('')
  const [bank, setBank] = useState<Record<string, string>>({})
  const [pricingSilver, setPricingSilver] = useState({ WEEK: 50000, MONTH: 200000, YEAR: 2000000 })
  const [pricingGold, setPricingGold] = useState({ WEEK: 100000, MONTH: 400000, YEAR: 4000000 })
  const [savingConfig, setSavingConfig] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrFileRef = useRef<HTMLInputElement>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-membership-stats'],
    queryFn: () => adminMembershipApi.getStats(),
  })

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['admin-membership-orders', filter],
    queryFn: () => adminMembershipApi.getOrders(filter || undefined),
  })

  const { data: tokenOrders = [], refetch: refetchTokenOrders } = useQuery({
    queryKey: ['admin-ai-token-orders', filter],
    queryFn: () => adminMembershipApi.getAiTokenOrders(filter || undefined),
  })
  useEffect(() => {
    adminApi.getAdminSettings().then(data => {
      if (data?.membershipBank) setBank(data.membershipBank as Record<string, string>)
      const p = data?.membershipPricing
      if (p?.SILVER) setPricingSilver(p.SILVER)
      if (p?.GOLD) setPricingGold(p.GOLD)
    }).catch(() => {})
  }, [])

  const approveMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminMembershipApi.approve(id, note),
    onSuccess: () => {
      toast.success('Đã duyệt')
      qc.invalidateQueries({ queryKey: ['admin-membership-stats'] })
      refetchOrders()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi duyệt'),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminMembershipApi.reject(id, note),
    onSuccess: () => {
      toast.success('Đã từ chối')
      qc.invalidateQueries({ queryKey: ['admin-membership-stats'] })
      refetchOrders()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi'),
  })

  const approveTokenMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminMembershipApi.approveAiToken(id, note),
    onSuccess: () => { toast.success('Đã cộng token vào ví người dùng'); refetchTokenOrders() },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi duyệt token'),
  })
  const rejectTokenMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminMembershipApi.rejectAiToken(id, note),
    onSuccess: () => { toast.success('Đã từ chối đơn token'); refetchTokenOrders() },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi từ chối token'),
  })
  const saveConfig = async (bankOverride?: Record<string, string>) => {
    try {
      setSavingConfig(true)
      const current = await adminApi.getAdminSettings()
      const bankToSave = bankOverride ?? bank
      await adminApi.saveAdminSettings({
        ...current,
        membershipBank: bankToSave,
        membershipPricing: { SILVER: pricingSilver, GOLD: pricingGold },
      })
      if (bankOverride) setBank(bankToSave)
      toast.success('Đã lưu cấu hình thu phí')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Lỗi lưu')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh tối đa 5MB')
      return
    }
    try {
      setUploadingQr(true)
      const res = await uploadApi.uploadImage(file)
      const url = res?.url || res?.relativeUrl
      if (!url) {
        toast.error('Không nhận được URL ảnh')
        return
      }
      const nextBank = { ...bank, qrImageUrl: url }
      setBank(nextBank)
      await saveConfig(nextBank)
      toast.success('Đã upload QR lên Cloudinary')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi upload ảnh QR')
    } finally {
      setUploadingQr(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-red-400" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
          <Wallet size={20} className="text-emerald-400" />
          Thu phí & Gói thành viên
        </h1>
        <p className="text-[12px] text-[#8b8b9e] mt-1">Thống kê doanh thu và duyệt thanh toán chuyển khoản</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Tổng đơn', stats?.totalOrders],
          ['Chờ duyệt', stats?.pending],
          ['Đã duyệt', stats?.approved],
          ['Doanh thu', formatVnd(stats?.totalRevenueVnd ?? 0)],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border border-white/[.06] bg-[#12121a] p-4">
            <p className="text-[10px] text-[#5a5a6e] uppercase">{label}</p>
            <p className="text-[18px] font-bold text-[#f0f0f5] mt-1">{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[.06] bg-[#12121a] p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-[#f0f0f5]">Cấu hình ngân hàng & giá</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Tên ngân hàng"
            value={bank.bankName ?? ''}
            onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))}
            className="rounded-lg px-3 py-2 text-[12px] bg-[#0a0a0f] border border-white/10 text-[#f0f0f5]"
          />
          <input
            placeholder="Số tài khoản"
            value={bank.accountNumber ?? ''}
            onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value }))}
            className="rounded-lg px-3 py-2 text-[12px] bg-[#0a0a0f] border border-white/10 text-[#f0f0f5]"
          />
          <input
            placeholder="Chủ tài khoản"
            value={bank.accountName ?? ''}
            onChange={e => setBank(b => ({ ...b, accountName: e.target.value }))}
            className="rounded-lg px-3 py-2 text-[12px] bg-[#0a0a0f] border border-white/10 text-[#f0f0f5]"
          />
        </div>

        <div className="rounded-xl border border-white/[.08] bg-[#0a0a0f] p-4 space-y-3">
          <p className="text-[12px] font-medium text-[#f0f0f5]">Ảnh mã QR thanh toán</p>
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-40 h-40 rounded-xl border border-white/10 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {bank.qrImageUrl ? (
                <img
                  src={bank.qrImageUrl.startsWith('http') ? bank.qrImageUrl : resolveUserAvatar(bank.qrImageUrl)}
                  alt="QR thanh toán"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-[#5a5a6e] text-center px-2">Chưa có QR</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={qrFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
              <button
                type="button"
                disabled={uploadingQr || savingConfig}
                onClick={() => qrFileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-500 disabled:opacity-50"
              >
                {uploadingQr ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                {uploadingQr ? 'Đang upload...' : 'Upload QR lên Cloudinary'}
              </button>
              {bank.qrImageUrl && (
                <button
                  type="button"
                  onClick={() => setBank(b => ({ ...b, qrImageUrl: '' }))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-[11px] hover:bg-red-500/10"
                >
                  <Trash2 size={12} />
                  Xóa ảnh QR
                </button>
              )}
              <p className="text-[10px] text-[#5a5a6e] max-w-xs">
                Ảnh lưu trên Cloudinary và tự lưu vào cấu hình. User sẽ thấy QR khi nạp tiền.
              </p>
            </div>
          </div>
          <input
            placeholder="Hoặc dán URL ảnh QR thủ công (https://...)"
            value={bank.qrImageUrl ?? ''}
            onChange={e => setBank(b => ({ ...b, qrImageUrl: e.target.value }))}
            className="w-full rounded-lg px-3 py-2 text-[11px] bg-[#12121a] border border-white/10 text-[#8b8b9e] font-mono"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-[12px]">
          <div>
            <p className="text-[#8b8b9e] mb-2">Giá Bạc (VND)</p>
            {(['WEEK', 'MONTH', 'YEAR'] as const).map(k => (
              <div key={k} className="flex items-center gap-2 mb-2">
                <span className="w-14 text-[#5a5a6e]">{k}</span>
                <input
                  type="number"
                  value={pricingSilver[k]}
                  onChange={e => setPricingSilver(s => ({ ...s, [k]: Number(e.target.value) }))}
                  className="flex-1 rounded-lg px-2 py-1.5 bg-[#0a0a0f] border border-white/10 text-[#f0f0f5]"
                />
              </div>
            ))}
          </div>
          <div>
            <p className="text-[#8b8b9e] mb-2">Giá Vàng (VND)</p>
            {(['WEEK', 'MONTH', 'YEAR'] as const).map(k => (
              <div key={k} className="flex items-center gap-2 mb-2">
                <span className="w-14 text-[#5a5a6e]">{k}</span>
                <input
                  type="number"
                  value={pricingGold[k]}
                  onChange={e => setPricingGold(s => ({ ...s, [k]: Number(e.target.value) }))}
                  className="flex-1 rounded-lg px-2 py-1.5 bg-[#0a0a0f] border border-white/10 text-[#f0f0f5]"
                />
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveConfig()}
          disabled={savingConfig || uploadingQr}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-500 disabled:opacity-50"
        >
          {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Lưu cấu hình
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].map(s => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-[11px] font-medium border',
              filter === s ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-white/10 text-[#8b8b9e]',
            )}
          >
            {s === '' ? 'Tất cả' : s === 'PENDING' ? 'Chờ duyệt' : s === 'APPROVED' ? 'Đã duyệt' : s === 'REJECTED' ? 'Từ chối' : 'Hết hạn'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <div><h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Đơn mua AI token</h2><p className="text-[10px]" style={{ color: 'var(--text3)' }}>Duyệt xong hệ thống tự cộng token vào ví.</p></div>
          <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-500">{tokenOrders.length} đơn</span>
        </div>
        <table className="w-full text-[12px]">
          <thead style={{ background: 'var(--bg3)', color: 'var(--text3)' }}><tr><th className="px-4 py-3 text-left">Người dùng</th><th className="px-4 py-3 text-left">Token</th><th className="px-4 py-3 text-left">Số tiền</th><th className="px-4 py-3 text-left">Mã CK</th><th className="px-4 py-3 text-left">Trạng thái</th><th className="px-4 py-3 text-left">Thao tác</th></tr></thead>
          <tbody>{tokenOrders.map((order: any) => <tr key={order.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
            <td className="px-4 py-3"><p style={{ color: 'var(--text)' }}>{order.userFullName}</p><p className="text-[10px]" style={{ color: 'var(--text3)' }}>{order.userEmail}</p></td>
            <td className="px-4 py-3 font-bold text-violet-500">{order.tokenAmount}</td><td className="px-4 py-3 text-emerald-500">{formatVnd(order.amountVnd)}</td><td className="px-4 py-3 font-mono" style={{ color: 'var(--text2)' }}>{order.transferCode}</td>
            <td className="px-4 py-3"><span className="text-[10px]" style={{ color: order.status === 'APPROVED' ? '#22c55e' : order.status === 'PENDING' ? '#f59e0b' : '#ef4444' }}>{order.status}</span></td>
            <td className="px-4 py-3">{order.status === 'PENDING' && <div className="flex gap-1"><button type="button" onClick={() => approveTokenMut.mutate({ id: order.id })} className="rounded-lg border border-green-500/30 p-1.5 text-green-500"><Check size={14} /></button><button type="button" onClick={() => rejectTokenMut.mutate({ id: order.id, note: window.prompt('Lý do từ chối') ?? '' })} className="rounded-lg border border-red-500/30 p-1.5 text-red-500"><X size={14} /></button></div>}</td>
          </tr>)}</tbody>
        </table>
        {tokenOrders.length === 0 && <p className="py-8 text-center text-[11px]" style={{ color: 'var(--text3)' }}>Chưa có đơn mua token</p>}
      </div>
      <div className="rounded-xl border border-white/[.06] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[#0a0a0f] text-[#5a5a6e] text-left">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Mã CK</th>
              <th className="px-4 py-3">Ghi chú</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Hết hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-t border-white/[.04] hover:bg-white/[.02]">
                <td className="px-4 py-3">
                  <p className="text-[#f0f0f5] font-medium">{o.userFullName}</p>
                  <p className="text-[10px] text-[#5a5a6e]">{o.userEmail}</p>
                </td>
                <td className="px-4 py-3 text-[#f0f0f5]">{o.tier} · {o.period}</td>
                <td className="px-4 py-3 text-emerald-400">{formatVnd(o.amountVnd)}</td>
                <td className="px-4 py-3 font-mono text-[11px]">{o.transferCode}</td>
                <td className="px-4 py-3 text-[#8b8b9e] max-w-[200px] truncate" title={o.userNote || o.adminNote || '-'}>
                  {o.userNote || o.adminNote || '-'}
                </td>
                <td className="px-4 py-3 text-[#8b8b9e] text-[11px]">
                  {o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '-'}
                </td>
                <td className="px-4 py-3 text-[#8b8b9e] text-[11px]">
                  {o.expiresAt ? new Date(o.expiresAt).toLocaleString('vi-VN') : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                      o.status === 'PENDING' && 'bg-amber-500/15 text-amber-400',
                      o.status === 'APPROVED' && 'bg-green-500/15 text-green-400',
                      o.status === 'REJECTED' && 'bg-red-500/15 text-red-400',
                      o.status === 'EXPIRED' && 'bg-gray-500/15 text-gray-400',
                    )}
                  >
                    {o.status === 'PENDING' ? 'Chờ duyệt' : o.status === 'APPROVED' ? 'Đã duyệt' : o.status === 'REJECTED' ? 'Từ chối' : 'Hết hạn'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => approveMut.mutate({ id: o.id })}
                        className="p-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10"
                        title="Duyệt"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const note = window.prompt('Lý do từ chối (tuỳ chọn)') ?? ''
                          rejectMut.mutate({ id: o.id, note })
                        }}
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                        title="Từ chối"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {o.status === 'REJECTED' && o.rejectReason && (
                    <span className="text-[10px] text-red-400" title={o.rejectReason}>
                      {o.rejectReason.substring(0, 20)}...
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="text-center py-10 text-[#5a5a6e]">Chưa có giao dịch</p>
        )}
      </div>
    </div>
  )
}
