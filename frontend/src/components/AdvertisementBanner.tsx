import { useEffect, useState } from 'react'
import { X, Sparkles, Zap, Crown } from 'lucide-react'

const BANNER_STORAGE_KEY = 'studymate-ad-banner-dismissed'

export default function AdvertisementBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY)
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(BANNER_STORAGE_KEY, 'true')
  }

  if (!isVisible) return null

  return (
    <div className="relative w-full overflow-hidden rounded-2xl mb-6" style={{
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
    }}>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-4 left-8 w-24 h-24 rounded-full bg-white blur-2xl" />
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
        title="Đóng quảng cáo"
      >
        <X size={16} />
      </button>

      <div className="relative flex flex-col items-start gap-4 px-4 py-5 pr-12 sm:flex-row sm:items-center sm:px-6">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-[15px] flex items-center gap-2">
            Nâng cấp trải nghiệm học tập
            <Crown size={16} className="text-yellow-300" />
          </h3>
          <p className="text-white/90 text-[13px] mt-1">
            Đăng ký gói <span className="font-semibold text-yellow-200">Bạc</span> hoặc <span className="font-semibold text-yellow-200">Vàng</span> để mở khóa tính năng AI nâng cao, không giới hạn nhóm và nhiều ưu đãi đặc biệt!
          </p>
        </div>

        <div className="w-full flex-shrink-0 sm:w-auto">
          <button
            onClick={() => window.location.href = '/membership'}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-indigo-600 transition-colors hover:bg-white/90 sm:w-auto"
          >
            <Zap size={16} />
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </div>
  )
}
