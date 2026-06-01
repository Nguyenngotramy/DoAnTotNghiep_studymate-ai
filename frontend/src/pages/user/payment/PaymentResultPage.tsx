import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/axios'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, ArrowLeft, Wallet, RefreshCw } from 'lucide-react'

type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN'

export default function PaymentResultPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<PaymentStatus>('PENDING')
  const [amount, setAmount] = useState<string>('')

  useEffect(() => {
    // Parse URL parameters based on payment gateway
    const resultCode = searchParams.get('resultCode') || searchParams.get('vnp_ResponseCode')
    const amountParam = searchParams.get('amount') || searchParams.get('vnp_Amount')
    
    if (amountParam) {
      // VNPay returns amount in cents, MoMo in VND
      const parsedAmount = parseInt(amountParam) / (searchParams.has('vnp_Amount') ? 100 : 1)
      setAmount(new Intl.NumberFormat('vi-VN').format(parsedAmount) + ' ₫')
    }

    // Determine payment status
    if (resultCode === '0' || resultCode === '00') {
      setStatus('SUCCESS')
      toast.success('Thanh toán thành công!')
    } else if (resultCode) {
      setStatus('FAILED')
      toast.error('Thanh toán thất bại')
    } else {
      setStatus('PENDING')
    }
  }, [searchParams])

  const { data: userData, refetch } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me'),
    enabled: status === 'SUCCESS',
  })

  const handleRefreshBalance = () => {
    refetch()
    toast.success('Đã cập nhật số dư')
  }

  const handleBackToPayment = () => {
    navigate('/payment')
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const renderStatusIcon = () => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle size={64} className="text-emerald-400" />
      case 'FAILED':
        return <XCircle size={64} className="text-red-400" />
      case 'PENDING':
        return <Clock size={64} className="text-amber-400" />
      default:
        return <Clock size={64} className="text-gray-400" />
    }
  }

  const renderStatusText = () => {
    switch (status) {
      case 'SUCCESS':
        return 'Thanh toán thành công'
      case 'FAILED':
        return 'Thanh toán thất bại'
      case 'PENDING':
        return 'Đang xử lý thanh toán'
      default:
        return 'Trạng thái không xác định'
    }
  }

  const renderStatusDescription = () => {
    switch (status) {
      case 'SUCCESS':
        return 'Số tiền đã được cộng vào tài khoản của bạn. Bạn có thể sử dụng số dư này để mua gói thành viên hoặc các dịch vụ khác.'
      case 'FAILED':
        return 'Giao dịch thanh toán không thành công. Vui lòng kiểm tra lại thông tin hoặc thử phương thức thanh toán khác.'
      case 'PENDING':
        return 'Giao dịch đang được xử lý. Số tiền sẽ được cộng vào tài khoản sau khi thanh toán được xác nhận.'
      default:
        return 'Không thể xác định trạng thái giao dịch. Vui lòng liên hệ hỗ trợ nếu cần.'
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={handleBackToPayment}
        className="flex items-center gap-2 text-[13px] text-[#8b8b9e] hover:text-[#f0f0f5] transition-colors"
      >
        <ArrowLeft size={16} />
        Quay lại trang nạp tiền
      </button>

      <div className="rounded-2xl border border-white/[.06] bg-[#12121a] p-8 text-center">
        <div className="flex justify-center mb-6">
          {renderStatusIcon()}
        </div>

        <h1 className="text-[24px] font-bold text-[#f0f0f5] mb-2">
          {renderStatusText()}
        </h1>

        <p className="text-[13px] text-[#8b8b9e] mb-6 max-w-md mx-auto">
          {renderStatusDescription()}
        </p>

        {status === 'SUCCESS' && amount && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 mb-6">
            <p className="text-[12px] text-emerald-400 mb-1">Số tiền nạp</p>
            <p className="text-[20px] font-bold text-emerald-400">{amount}</p>
          </div>
        )}

        {status === 'SUCCESS' && userData?.data?.data && (
          <div className="rounded-xl border border-white/[.06] bg-[#0a0a0f] p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Wallet size={18} className="text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-[#8b8b9e]">Số dư hiện tại</p>
                  <p className="text-[16px] font-bold text-[#f0f0f5]">
                    {new Intl.NumberFormat('vi-VN').format(userData.data.data.balance || 0)} ₫
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefreshBalance}
                className="p-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[#8b8b9e] hover:text-[#f0f0f5] transition-colors"
                title="Cập nhật số dư"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleBackToPayment}
            className="px-6 py-3 rounded-xl border border-white/[.06] bg-white/[.02] hover:bg-white/[.04] text-[13px] font-medium text-[#f0f0f5] transition-colors"
          >
            Nạp thêm
          </button>
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>

      {status === 'FAILED' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-[12px] text-amber-400 mb-2">Lưu ý:</p>
          <ul className="text-[11px] text-[#8b8b9e] space-y-1 list-disc list-inside">
            <li>Đảm bảo số dư trong tài khoản thanh toán đủ</li>
            <li>Kiểm tra lại thông tin thẻ/tài khoản</li>
            <li>Thử lại sau vài phút nếu gặp lỗi tạm thời</li>
            <li>Liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn</li>
          </ul>
        </div>
      )}
    </div>
  )
}
