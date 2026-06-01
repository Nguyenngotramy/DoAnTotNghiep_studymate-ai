import { useEffect, useState } from 'react'
import { DEFAULT_AVATAR_URL, resolveUserAvatar } from '@/utils/avatar'
import { initials } from '@/utils/helpers'
import { Crown } from 'lucide-react'
import type { MembershipTier } from '@/types'

type UserAvatarProps = {
  name?: string
  avatar?: string | null
  size?: number
  className?: string
  /** Hiện chữ cái khi ảnh lỗi thay vì fallback cáo */
  showInitialsOnError?: boolean
  /** Membership tier to show badge */
  tier?: MembershipTier
}

export default function UserAvatar({
  name,
  avatar,
  size = 32,
  className = '',
  showInitialsOnError = false,
  tier,
}: UserAvatarProps) {
  const [src, setSrc] = useState(() => resolveUserAvatar(avatar))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(resolveUserAvatar(avatar))
    setFailed(false)
  }, [avatar])

  const text = name ? initials(name) : '?'
  const fontSize = size <= 28 ? 10 : size <= 36 ? 11 : 12

  const showSilverBadge = tier === 'SILVER'
  const showGoldBadge = tier === 'GOLD'

  if (failed && showInitialsOnError) {
    return (
      <div className="relative inline-flex">
        <div
          className={`rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold ${className}`}
          style={{
            width: size,
            height: size,
            fontSize,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          }}
        >
          {text}
        </div>
        {showSilverBadge && (
          <div
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
            style={{
              width: size * 0.4,
              height: size * 0.4,
              background: 'linear-gradient(135deg,#c0c0c0,#e8e8e8)',
              border: '2px solid #fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <Crown size={size * 0.25} className="text-gray-700" strokeWidth={2.5} />
          </div>
        )}
        {showGoldBadge && (
          <div
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
            style={{
              width: size * 0.4,
              height: size * 0.4,
              background: 'linear-gradient(135deg,#ffd700,#ffec8b)',
              border: '2px solid #fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <Crown size={size * 0.25} className="text-yellow-700" strokeWidth={2.5} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative inline-flex">
      <img
        src={failed ? DEFAULT_AVATAR_URL : src}
        alt={name ? `Avatar ${name}` : 'Avatar'}
        className={`rounded-full object-cover flex-shrink-0 ${showSilverBadge ? 'ring-2 ring-gray-300' : ''} ${showGoldBadge ? 'ring-2 ring-yellow-400' : ''} ${className}`}
        style={{ width: size, height: size }}
        onError={() => {
          if (!failed) {
            setFailed(true)
            setSrc(DEFAULT_AVATAR_URL)
          }
        }}
      />
      {showSilverBadge && (
        <div
          className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            background: 'linear-gradient(135deg,#c0c0c0,#e8e8e8)',
            border: '2px solid #fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <Crown size={size * 0.25} className="text-gray-700" strokeWidth={2.5} />
        </div>
      )}
      {showGoldBadge && (
        <div
          className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
          style={{
            width: size * 0.4,
            height: size * 0.4,
            background: 'linear-gradient(135deg,#ffd700,#ffec8b)',
            border: '2px solid #fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <Crown size={size * 0.25} className="text-yellow-700" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
