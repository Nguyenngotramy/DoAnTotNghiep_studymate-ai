import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Decode Base64URL an toàn hơn
function decodeBase64Url(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return atob(normalized + padding)
}

export default function OAuth2CallbackPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const handle = async () => {
      console.log('[OAuth2] URL:', window.location.href)

      try {
        const params = new URLSearchParams(window.location.search)
        const encodedAccess = params.get('at')
        const encodedRefresh = params.get('rt')

        if (!encodedAccess || !encodedRefresh) {
          toast.error('Đăng nhập Google thất bại!')
          navigate('/login', { replace: true })
          return
        }

        const accessToken = decodeBase64Url(encodedAccess)
        const refreshToken = decodeBase64Url(encodedRefresh)

        console.log('[OAuth2] JWT length:', accessToken.length)
        console.log('[OAuth2] Token prefix:', accessToken.substring(0, 30))

        // debug kỹ hơn
        console.log('[OAuth2] accessToken valid shape:', accessToken.split('.').length === 3)
        console.log('[OAuth2] refreshToken valid shape:', refreshToken.split('.').length === 3)

        // Gọi /auth/me với Bearer token vừa lấy được
        const res = await axios.get('http://localhost:8080/api/auth/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        })

        const user = res.data?.data ?? res.data
        if (!user) throw new Error('Không lấy được thông tin user')

        // Lưu auth sau khi xác thực /me thành công
        setAuth(user, accessToken, refreshToken)

        toast.success(`Chào mừng ${user.fullName}! 🎉`)

        if (user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true })
        } else if (!user.onboardingDone) {
          navigate('/onboarding', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } catch (err: any) {
        console.error('[OAuth2Callback] error status:', err?.response?.status)
        console.error('[OAuth2Callback] error data:', err?.response?.data)
        console.error('[OAuth2Callback] error message:', err?.message)

        toast.error('Đăng nhập Google thất bại, vui lòng thử lại!')
        navigate('/login', { replace: true })
      }
    }

    handle()
  }, [navigate, setAuth])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#0a0a0f' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-7 h-7">
          <path
            d="M10 2.5L17 6.25V13.75L10 17.5L3 13.75V6.25L10 2.5Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 7.5v5M7.5 10h5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <Loader2 size={24} className="animate-spin text-indigo-400" />
      <p className="text-[13px] text-[#8b8b9e]">Đang xử lý đăng nhập Google...</p>
    </div>
  )
}