import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import toast from 'react-hot-toast'
import { Wallet, CreditCard, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react'

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export default function PaymentPage() {
  const navigate = useNavigate()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<'MOMO' | 'VNPAY'>('MOMO')

  const createPaymentMutation = useMutation({
    mutationFn: (data: { amountVnd: number; provider: string }) =>
      api.post('/payment/create', data),
    onSuccess: (response: any) => {
      const { payUrl } = response.data.data
      // Redirect to payment gateway
      window.location.href = payUrl
    },
    onError: () => {
      toast.error('Không thể tạo yêu cầu thanh toán')
    },
  })

  const handlePayment = () => {
    const amount = selectedAmount || parseInt(customAmount)
    if (!amount || amount < 10000) {
      toast.error('Số tiền phải lớn hơn 10,000 VNĐ')
      return
    }
    if (amount > 50000000) {
      toast.error('Số tiền không được vượt quá 50,000,000 VNĐ')
      return
    }

    createPaymentMutation.mutate({
      amountVnd: amount,
      provider: selectedProvider,
    })
  }

  const handlePresetAmount = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const formatVnd = (n: number) => {
    return new Intl.NumberFormat('vi-VN').format(n) + ' ₫'
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-[12px] font-semibold text-indigo-400">Nạp tiền vào tài khoản</span>
        </div>
        <h1 className="text-[24px] font-bold text-[#f0f0f5]">Nạp tiền</h1>
        <p className="text-[13px] text-[#8b8b9e]">
          Chọn số tiền và phương thức thanh toán để nạp vào tài khoản StudyMate của bạn
        </p>
      </div>

      {/* Payment Provider Selection */}
      <div className="rounded-xl border border-white/[.06] bg-[#12121a] p-5">
        <h2 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Phương thức thanh toán</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedProvider('MOMO')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedProvider === 'MOMO'
                ? 'border-pink-500 bg-pink-500/10'
                : 'border-white/[.06] bg-white/[.02] hover:bg-white/[.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Wallet size={20} className="text-pink-400" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-[#f0f0f5]">MoMo</p>
                <p className="text-[11px] text-[#8b8b9e]">Ví điện tử</p>
              </div>
              {selectedProvider === 'MOMO' && (
                <Check size={16} className="ml-auto text-pink-400" />
              )}
            </div>
          </button>

          <button
            onClick={() => setSelectedProvider('VNPAY')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedProvider === 'VNPAY'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/[.06] bg-white/[.02] hover:bg-white/[.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard size={20} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-[#f0f0f5]">VNPay</p>
                <p className="text-[11px] text-[#8b8b9e]">Cổng thanh toán</p>
              </div>
              {selectedProvider === 'VNPAY' && (
                <Check size={16} className="ml-auto text-blue-400" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Amount Selection */}
      <div className="rounded-xl border border-white/[.06] bg-[#12121a] p-5">
        <h2 className="text-[14px] font-semibold text-[#f0f0f5] mb-4">Chọn số tiền</h2>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handlePresetAmount(amount)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedAmount === amount
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/[.06] bg-white/[.02] hover:bg-white/[.04]'
              }`}
            >
              <p className="text-[13px] font-semibold text-[#f0f0f5]">{formatVnd(amount)}</p>
              {selectedAmount === amount && (
                <Check size={14} className="mx-auto mt-1 text-indigo-400" />
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value)
              setSelectedAmount(null)
            }}
            placeholder="Hoặc nhập số tiền khác (VNĐ)"
            className="w-full px-4 py-3 rounded-xl border border-white/[.06] bg-white/[.02] text-[13px] text-[#f0f0f5] placeholder:text-[#5a5a6e] focus:outline-none focus:border-indigo-500/50 transition-colors"
            min="10000"
            max="50000000"
          />
          {customAmount && (
            <button
              onClick={() => {
                setCustomAmount('')
                setSelectedAmount(null)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5a6e] hover:text-[#f0f0f5]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-white/[.06] bg-[#12121a] p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[#8b8b9e]">Số tiền nạp</span>
          <span className="text-[16px] font-bold text-[#f0f0f5]">
            {formatVnd(selectedAmount || parseInt(customAmount) || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[#8b8b9e]">Phí giao dịch</span>
          <span className="text-[12px] text-emerald-400">Miễn phí</span>
        </div>
        <div className="border-t border-white/[.06] pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#f0f0f5]">Tổng thanh toán</span>
            <span className="text-[18px] font-bold text-emerald-400">
              {formatVnd(selectedAmount || parseInt(customAmount) || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handlePayment}
        disabled={createPaymentMutation.isPending || (!selectedAmount && !customAmount)}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[.04] disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-all flex items-center justify-center gap-2"
      >
        {createPaymentMutation.isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            Tiếp tục thanh toán
            <ArrowRight size={18} />
          </>
        )}
      </button>

      {/* Note */}
      <p className="text-[11px] text-[#5a5a6e] text-center">
        Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của StudyMate
      </p>
    </div>
  )
}
