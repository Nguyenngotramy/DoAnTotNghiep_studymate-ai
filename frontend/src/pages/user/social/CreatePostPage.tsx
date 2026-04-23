import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Image,
  Video,
  X,
  Send,
  Loader2,
  Sparkles,
  Hash,
  PlayCircle,
} from 'lucide-react'
import { postApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const SUGGESTED_TAGS = [
  'Toán',
  'Tiếng Anh',
  'Lập trình',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'IELTS',
  'TOEIC',
  'AI/ML',
  'Python',
  'Java',
  'React',
  'THPT',
  'Đại học',
  'Luyện thi',
  'Kinh nghiệm',
  'Tài liệu',
  'Mẹo học',
  'Ôn thi',
  'Đồ án',
  'Tổng hợp',
]

const AVATAR_COLORS = [
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#8b5cf6',
]

const BACKEND_URL = 'http://localhost:8080/api'

function initials(n: string) {
  return (n ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(-2)
    .toUpperCase()
}

function nameColor(name?: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}

function toMediaUrl(url?: string) {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url
  }
  if (url.startsWith('/')) {
    return `${BACKEND_URL}${url}`
  }
  return `${BACKEND_URL}/uploads/${url}`
}

function normalizeUploadedUrl(url?: string) {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url
  }
  if (url.startsWith('/')) {
    return url
  }
  return `/uploads/${url}`
}

function extractVideoEmbed(url?: string) {
  if (!url) return null

  try {
    const u = new URL(url)

    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
    }

    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (u.hostname.includes('drive.google.com')) {
      const match = url.match(/\/d\/([^/]+)/)
      if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`
    }

    return null
  } catch {
    return null
  }
}

export default function CreatePostPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [images, setImages] = useState<{ file?: File; url: string; preview: string }[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  )

  const readTime = Math.max(1, Math.round(wordCount / 200))
  const canSubmit = title.trim() && content.trim().length >= 20 && tags.length > 0
  const embedVideo = extractVideoEmbed(videoUrl)
  const avatarColor = nameColor(user?.fullName)

  const addTag = (raw: string) => {
    const clean = raw.trim().replace(/^#/, '').slice(0, 30)
    if (!clean) return
    if (tags.includes(clean)) {
      setTagInput('')
      return
    }
    if (tags.length >= 8) {
      toast.error('Tối đa 8 tag')
      return
    }
    setTags(prev => [...prev, clean])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(x => x !== tag))
  }

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || images.length >= 6) return
    const allowed = Array.from(files).slice(0, 6 - images.length)

    for (const file of allowed) {
      if (!file.type.startsWith('image/')) {
        toast.error('Chỉ hỗ trợ file ảnh')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Mỗi ảnh tối đa 5MB')
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      const tmpId = Date.now().toString() + Math.random().toString(36).slice(2)

      setImages(prev => [...prev, { file, url: tmpId, preview: previewUrl }])

      setUploadingImg(true)
      try {
        const res = await postApi.uploadImage(file)
        const safeUrl = normalizeUploadedUrl(res.url)
        setImages(prev => prev.map(img => (img.url === tmpId ? { ...img, url: safeUrl } : img)))
      } catch {
        const reader = new FileReader()
        reader.onload = e => {
          const b64 = e.target?.result as string
          setImages(prev => prev.map(img => (img.url === tmpId ? { ...img, url: b64 } : img)))
        }
        reader.readAsDataURL(file)
      } finally {
        setUploadingImg(false)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Nhập tiêu đề bài viết')
      return
    }

    if (!content.trim() || content.trim().length < 20) {
      toast.error('Nội dung tối thiểu 20 ký tự')
      return
    }

    if (tags.length === 0) {
      toast.error('Thêm ít nhất 1 tag')
      return
    }

    setSubmitting(true)
    try {
      await postApi.create({
        title: title.trim(),
        content: content.trim(),
        tags,
        imageUrls: images
          .map(i => i.url)
          .filter(u => !!u && !u.startsWith('blob:')),
        videoUrl: videoUrl.trim() || undefined,
      })

      toast.success('Đăng bài thành công')
      navigate('/blog')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi khi đăng bài')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/blog')}
          className="p-2 rounded-xl hover:bg-white/[.05] transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex-1">
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
            Tạo bài viết
          </h1>
          <p className="text-[11px]" style={{ color: 'var(--text3)' }}>
            Chia sẻ kiến thức, kinh nghiệm học tập hoặc tài liệu hữu ích
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-[12px] font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {submitting ? 'Đang đăng...' : 'Đăng bài'}
        </button>
      </div>

      <div
        className="border rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
              style={{ background: avatarColor }}
            >
              {user ? initials(user.fullName) : 'U'}
            </div>

            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                {user?.fullName}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                {wordCount} từ · ~{readTime} phút đọc
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tiêu đề bài viết..."
            className="w-full bg-transparent text-[24px] font-bold outline-none"
            style={{ color: 'var(--text)' }}
          />

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Bạn muốn chia sẻ điều gì hôm nay?"
            className="w-full min-h-[180px] resize-none bg-transparent outline-none text-[14px] leading-7"
            style={{ color: 'var(--text2)' }}
          />

          {images.length > 0 && (
            <div className={clsx('grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {images.map((img, i) => (
                <div
                  key={i}
                  className={clsx(
                    'relative rounded-2xl overflow-hidden group',
                    images.length === 1 ? 'h-80' : 'h-48',
                  )}
                >
                  <img src={toMediaUrl(img.preview || img.url)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeImage(i)}
                      className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {embedVideo && !images.length && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{ borderColor: 'var(--border)' }}
            >
              <iframe
                src={embedVideo}
                className="w-full h-72"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="video-preview"
              />
            </div>
          )}

          {!embedVideo && videoUrl.trim() && !images.length && (
            <div
              className="rounded-2xl overflow-hidden border"
              style={{ borderColor: 'var(--border)' }}
            >
              {videoUrl.match(/\.(mp4|webm|ogg)$/i) || videoUrl.startsWith('/uploads/') ? (
                <video controls className="w-full h-72 bg-black">
                  <source src={toMediaUrl(videoUrl)} />
                </video>
              ) : (
                <a
                  href={toMediaUrl(videoUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-24 flex items-center justify-center gap-2 text-indigo-400"
                  style={{ background: 'var(--bg3)' }}
                >
                  <PlayCircle size={18} />
                  Xem preview video
                </a>
              )}
            </div>
          )}

          <div
            className="rounded-2xl border p-3"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                Thêm vào bài viết của bạn
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] hover:bg-white/[.05] transition-colors"
                  style={{ color: 'var(--text2)' }}
                >
                  <Image size={14} />
                  Ảnh
                </button>

                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] hover:bg-white/[.05] transition-colors"
                  style={{ color: 'var(--text2)' }}
                >
                  <Video size={14} />
                  Video / Tag
                </button>

                {uploadingImg && <Loader2 size={14} className="animate-spin text-indigo-400" />}
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Video size={14} className="flex-shrink-0" style={{ color: 'var(--text3)' }} />
                  <input
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="Dán link video YouTube / Drive / TikTok hoặc /uploads/video.mp4 ..."
                    className="flex-1 h-10 px-3 rounded-xl border text-[12px] outline-none"
                    style={{
                      background: 'var(--bg2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                    <Hash size={12} className="text-indigo-400" />
                    Tags ({tags.length}/8)
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map(t => (
                        <span
                          key={t}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                        >
                          #{t}
                          <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                    placeholder="Nhập tag rồi bấm Enter..."
                    className="w-full h-10 px-3 rounded-xl border text-[12px] outline-none"
                    style={{
                      background: 'var(--bg2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_TAGS.filter(t => !tags.includes(t))
                      .filter(t => !tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))
                      .slice(0, 12)
                      .map(t => (
                        <button
                          key={t}
                          onClick={() => addTag(t)}
                          className="text-[10px] px-2.5 py-1 rounded-full border hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/[.05] transition-all"
                          style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
                        >
                          + {t}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleImageFiles(e.target.files)}
          />
        </div>
      </div>

      <div
        className="border rounded-2xl p-4"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-indigo-400" />
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
            Gợi ý để bài viết dễ thu hút hơn
          </p>
        </div>

        <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--text2)' }}>
          <p>• Đặt tiêu đề rõ ràng, có đúng chủ đề môn học</p>
          <p>• Chọn 1–3 tag chính để bài hiện đúng người cần xem</p>
          <p>• Có ảnh minh họa sẽ dễ được chú ý hơn</p>
          <p>• Nội dung ngắn gọn, rõ ý sẽ dễ đọc hơn trên feed</p>
        </div>
      </div>
    </div>
  )
}