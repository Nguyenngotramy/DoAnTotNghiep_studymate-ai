import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminPostApi } from '@/api/services'
import type { Post, PostReport } from '@/types'
import { Shield, Check, X, AlertTriangle, AlertCircle, Sparkles, Trash2, Loader2, Eye } from 'lucide-react'
import { initials, timeAgo } from '@/utils/helpers'
import toast from 'react-hot-toast'

type TabKey = 'pending' | 'flagged' | 'reported' | 'processed'

function ago(d?: string): string {
  if (!d) return ''
  try {
    return timeAgo(d)
  } catch {
    return ''
  }
}

function reportKey(r: PostReport): string {
  return r.reportId || r.id
}

function validSummary(post: Post) {
  return post.aiSummaryStatus === 'DONE' && !!post.aiSummary?.trim()
}

function toMediaUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
  const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  const clean = url.startsWith('/') ? url : `/${url}`
  if (clean.startsWith('/uploads/')) return `${API_BASE}${clean}`
  if (clean.startsWith('/api/uploads/')) return `${API_BASE}${clean.replace(/^\/api/, '')}`
  return `${API_BASE}/uploads/${url.replace(/^\/?uploads\//, '')}`
}

function mediaBadgeClass(status?: string) {
  switch (status) {
    case 'SAFE':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'WARNING':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'VIOLATION':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  }
}

export default function AdminPostsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [rejectPostId, setRejectPostId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [revisionPostId, setRevisionPostId] = useState<string | null>(null)
  const [revisionMessage, setRevisionMessage] = useState('')
  const [warningUserId, setWarningUserId] = useState<string | null>(null)
  const [warningPostId, setWarningPostId] = useState<string | null>(null)
  const [warningLevel, setWarningLevel] = useState<'REMINDER' | 'WARNING' | 'SEVERE'>('WARNING')
  const [warningReason, setWarningReason] = useState('')
  const [warningMsgText, setWarningMsgText] = useState('')
  const [detailReport, setDetailReport] = useState<PostReport | null>(null)
  const [removeReportPostId, setRemoveReportPostId] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState('')

  const { data: counts } = useQuery({
    queryKey: ['admin-post-counts'],
    queryFn: () => adminPostApi.getModerationCounts(),
  })

  const { data: postsRes, isLoading: postsLoading } = useQuery({
    queryKey: ['admin-posts', activeTab],
    queryFn: () => adminPostApi.listModerationPosts(activeTab),
    enabled: activeTab !== 'reported',
  })

  const { data: reportsRes, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminPostApi.getReports(),
    enabled: activeTab === 'reported',
  })

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-posts'] })
    qc.invalidateQueries({ queryKey: ['admin-reports'] })
    qc.invalidateQueries({ queryKey: ['admin-post-counts'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['unreadCount'] })
  }

  const removeFromCurrentList = (postId: string) => {
    if (activeTab !== 'reported') {
      qc.setQueryData(['admin-posts', activeTab], (old: any) => {
        if (!old?.content) return old
        return { ...old, content: old.content.filter((p: Post) => p.id !== postId) }
      })
    }
  }

  const removeReportFromList = (reportId: string) => {
    qc.setQueryData(['admin-reports'], (old: PostReport[] | undefined) =>
      old ? old.filter(r => reportKey(r) !== reportId) : old,
    )
  }

  const approveMutation = useMutation({
    mutationFn: (postId: string) => adminPostApi.approvePost(postId),
    onSuccess: (_, postId) => {
      removeFromCurrentList(postId)
      refreshAll()
      toast.success('Đã duyệt bài viết')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) => adminPostApi.rejectPost(postId, reason),
    onSuccess: (_, { postId }) => {
      removeFromCurrentList(postId)
      refreshAll()
      setRejectPostId(null)
      setRejectReason('')
      toast.success('Đã từ chối bài viết')
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason?: string }) => adminPostApi.removePost(postId, reason),
    onSuccess: (_, { postId }) => {
      removeFromCurrentList(postId)
      qc.setQueryData(['admin-posts', 'flagged'], (old: any) => {
        if (!old?.content) return old
        return { ...old, content: old.content.filter((p: Post) => p.id !== postId) }
      })
      qc.setQueryData(['admin-posts', 'pending'], (old: any) => {
        if (!old?.content) return old
        return { ...old, content: old.content.filter((p: Post) => p.id !== postId) }
      })
      qc.setQueryData(['admin-post-counts'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          flagged: Math.max(0, (old.flagged ?? 1) - 1),
          processed: (old.processed ?? 0) + 1,
        }
      })
      qc.setQueryData(['admin-reports'], (old: PostReport[] | undefined) =>
        old ? old.filter(r => r.postId !== postId) : old,
      )
      refreshAll()
      setRemoveReportPostId(null)
      setRemoveReason('')
      setDetailReport(null)
      toast.success('Đã gỡ bài viết — chuyển sang tab Đã xử lý')
    },
  })

  const requestRevisionMutation = useMutation({
    mutationFn: ({ postId, message }: { postId: string; message: string }) => adminPostApi.requestRevision(postId, message),
    onSuccess: (_, { postId }) => {
      removeFromCurrentList(postId)
      refreshAll()
      setRevisionPostId(null)
      setRevisionMessage('')
      toast.success('Đã gửi yêu cầu chỉnh sửa')
    },
  })

  const dismissReportMutation = useMutation({
    mutationFn: (reportId: string) => adminPostApi.dismissReport(reportId),
    onSuccess: (_, reportId) => {
      removeReportFromList(reportId)
      refreshAll()
      setDetailReport(null)
      toast.success('Đã bỏ qua báo cáo')
    },
  })

  const sendWarningMutation = useMutation({
    mutationFn: (payload: { userId: string; postId: string; level: 'REMINDER' | 'WARNING' | 'SEVERE'; reason: string; message: string }) =>
      adminPostApi.warnUser(payload.userId, payload.postId, payload.level, payload.reason, payload.message),
    onSuccess: (data: any) => {
      setWarningUserId(null)
      setWarningPostId(null)
      setWarningLevel('WARNING')
      setWarningReason('')
      setWarningMsgText('')
      const discipline = data?.discipline
      if (discipline?.actionTaken) {
        toast.success(discipline.message || 'Đã áp dụng kỷ luật tài khoản')
      } else {
        toast.success(discipline?.message || 'Đã gửi cảnh cáo người dùng')
      }
    },
  })

  const rescanMediaMutation = useMutation({
    mutationFn: () => adminPostApi.rescanMedia(30),
    onSuccess: (data) => {
      refreshAll()
      toast.success(`Đã quét lại media cho ${data.rescanned} bài viết. Kiểm tra tab AI cảnh báo.`)
    },
    onError: () => toast.error('Không thể quét lại media. Thử lại sau.'),
  })

  const handleSendWarning = () => {
    if (!warningUserId || !warningPostId || !warningReason.trim() || !warningMsgText.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin cảnh cáo')
      return
    }
    sendWarningMutation.mutate({
      userId: warningUserId,
      postId: warningPostId,
      level: warningLevel,
      reason: warningReason.trim(),
      message: warningMsgText.trim(),
    })
  }

  const posts = postsRes?.content ?? []
  const reports = reportsRes ?? []

  const tabLabels: Record<TabKey, string> = {
    pending: `Chờ duyệt${counts ? ` (${counts.pending})` : ''}`,
    flagged: `AI cảnh báo (Cần sửa)${counts ? ` (${counts.flagged})` : ''}`,
    reported: `Bài bị báo cáo (Report)${counts ? ` (${counts.reported})` : ''}`,
    processed: `Đã gỡ / Từ chối${counts ? ` (${counts.processed})` : ''}`,
  }

  const renderPostCard = (post: Post) => (
    <div key={post.id} className="bg-[#1a1a24] border border-white/[.05] hover:border-white/[.1] transition-all rounded-xl p-4.5 space-y-3.5 shadow">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white">
            {initials(post.authorName || 'U')}
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-zinc-200">{post.authorName || 'Thành viên'}</h3>
            <p className="text-[10px] text-zinc-500">Mã tác giả: {post.authorId} · Đăng {ago(post.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => approveMutation.mutate(post.id)} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11.5px] font-bold flex items-center gap-1 transition-all">
            <Check size={12} />
            Duyệt bài
          </button>
          <button onClick={() => setRevisionPostId(post.id)} className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11.5px] font-bold flex items-center gap-1 transition-all">
            <AlertTriangle size={12} />
            Yêu cầu sửa
          </button>
          <button onClick={() => setRejectPostId(post.id)} className="h-8 px-3 rounded-lg bg-red-600/20 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-[11.5px] font-bold flex items-center gap-1 transition-all">
            <X size={12} />
            Từ chối
          </button>
          <button onClick={() => removeMutation.mutate({ postId: post.id })} className="h-8 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-[11.5px] font-bold flex items-center gap-1 transition-all">
            <Trash2 size={12} />
            Gỡ bỏ
          </button>
          <button
            onClick={() => {
              setWarningUserId(post.authorId)
              setWarningPostId(post.id)
            }}
            className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11.5px] font-bold flex items-center gap-1 transition-all"
          >
            Cảnh cáo User
          </button>
        </div>
      </div>

      <div className="space-y-1.5 border-l-2 border-[#534AB7] pl-3.5">
        <h4 className="text-[13px] font-bold text-white">{post.title}</h4>
        <p className="text-[12px] text-zinc-400 leading-relaxed max-h-24 overflow-y-auto">{post.content}</p>
        <div className="flex gap-1.5 items-center flex-wrap pt-1.5">
          {post.subject && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEEDFE] text-[#3C3489] border border-indigo-100">
              Môn học chính: {post.subject}
            </span>
          )}
          {post.tags?.map(t => (
            <span key={t} className="text-[9.5px] font-semibold text-zinc-400">#{t}</span>
          ))}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-white/[.02] border border-white/[.04] grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
            <Sparkles size={11} className="text-indigo-400" />
            AI Tóm tắt nội dung
          </div>
          <p className="text-[11.5px] text-zinc-300 font-medium leading-relaxed italic">
            {validSummary(post) ? post.aiSummary : 'Không có tóm tắt AI hợp lệ.'}
          </p>
        </div>

        <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-white/[.06] pt-3 md:pt-0 md:pl-4">
          <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
            <Shield size={11} className="text-amber-400" />
            AI Phân tích kiểm duyệt
          </div>
          <div className="text-[11.5px] space-y-1 text-zinc-300">
            <div>Chủ đề thực tế: <span className="text-[#818cf8] font-bold">{post.aiDetectedSubject || 'N/A'}</span> (Confidence: {((post.aiTagConfidence ?? 0) * 100).toFixed(0)}%)</div>
            {(post.aiTagConfidence ?? 0) < 0.75 && (
              <div className="text-amber-400 text-[10.5px]">Tag/môn học người dùng chọn có thể không khớp nội dung thật.</div>
            )}
            <div>Safety Status: <span className={post.aiSafetyStatus === 'VIOLATION' ? 'text-red-400 font-bold' : post.aiSafetyStatus === 'WARNING' ? 'text-amber-400 font-bold' : 'text-green-400 font-bold'}>{post.aiSafetyStatus || 'SAFE'}</span></div>
            {post.aiSafetyReason && <div className="text-red-400 text-[10.5px]">Lý do: {post.aiSafetyReason}</div>}
            {(post.aiTagSuggestion?.length ?? 0) > 0 && (
              <div className="text-zinc-500 text-[10.5px]">Tags gợi ý: {post.aiTagSuggestion!.join(', ')}</div>
            )}
          </div>
        </div>
      </div>

      {((post.imageUrls?.length ?? 0) > 0 || post.videoUrl) && (
        <div className="p-3.5 rounded-xl bg-white/[.02] border border-amber-500/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
              <Eye size={11} className="text-amber-400" />
              Media kiểm duyệt
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${mediaBadgeClass(post.mediaSafetyStatus)}`}>
              {post.mediaSafetyStatus || 'UNKNOWN'}
            </span>
          </div>
          {post.mediaSafetyReason && (
            <p className="text-[10.5px] text-amber-300/90">{post.mediaSafetyReason}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {post.imageUrls?.map((img, i) => (
              <a
                key={`${post.id}-img-${i}`}
                href={toMediaUrl(img)}
                target="_blank"
                rel="noreferrer"
                className="block w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400/50 transition-all"
              >
                <img src={toMediaUrl(img)} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
            {post.videoUrl && (
              <a
                href={toMediaUrl(post.videoUrl)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border border-white/10 text-[10px] text-indigo-300 hover:bg-white/5"
              >
                Xem video
              </a>
            )}
          </div>
          {(post.flaggedImageUrls?.length ?? 0) > 0 && (
            <p className="text-[10px] text-red-400">Ảnh được gắn cờ: {post.flaggedImageUrls!.length}</p>
          )}
        </div>
      )}
    </div>
  )

  const renderReportCard = (report: PostReport) => {
    const rid = reportKey(report)
    const post = report.post
    return (
      <div key={rid} className="bg-[#1a1a24] border border-red-500/15 rounded-xl p-4.5 space-y-3.5 shadow-md">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-zinc-200">
                Báo cáo từ: {report.reporterName || 'Người dùng ẩn danh'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25">
                {report.reasonType}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Chi tiết: {report.reasonText || 'Không có mô tả thêm.'} · {ago(report.createdAt)}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {post && (
              <button
                onClick={() => setDetailReport(report)}
                className="px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 text-[11px] font-bold flex items-center gap-1"
              >
                <Eye size={12} />
                Xem chi tiết
              </button>
            )}
            <button
              onClick={() => dismissReportMutation.mutate(rid)}
              disabled={dismissReportMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] font-bold transition-all"
            >
              Bỏ qua báo cáo
            </button>
            <button
              onClick={() => {
                if (post?.id) setRemoveReportPostId(post.id)
                else toast.error('Không tìm thấy bài viết để gỡ')
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all"
            >
              Gỡ bài đăng
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[.02] border border-white/[.04]">
          {post ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400">Bài viết bị báo cáo:</div>
              <h4 className="text-[13px] font-bold text-white">{post.title}</h4>
              <p className="text-[12px] text-zinc-300 leading-relaxed line-clamp-4">{post.content}</p>
              <div className="flex flex-wrap gap-1.5">
                {post.subject && <span className="text-[10px] text-indigo-400">Môn: {post.subject}</span>}
                {post.tags?.map(t => (
                  <span key={t} className="text-[10px] text-zinc-500">#{t}</span>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500">Tác giả: {post.authorName}</p>
            </div>
          ) : (
            <p className="text-[12px] text-zinc-300 font-medium italic">
              Bài viết đã bị xóa hoặc không còn tồn tại.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[.06] pb-3 flex-wrap gap-3">
        <h1 className="text-[18px] font-semibold text-[#f0f0f5] flex items-center gap-2">
          <Shield size={18} className="text-[#818cf8]" />
          Kiểm duyệt bài viết học tập
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {(activeTab === 'flagged' || activeTab === 'pending') && (
            <button
              type="button"
              onClick={() => rescanMediaMutation.mutate()}
              disabled={rescanMediaMutation.isPending}
              className="h-9 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-bold hover:bg-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rescanMediaMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              Quét lại media AI
            </button>
          )}
          {(['pending', 'flagged', 'reported', 'processed'] as const).map(key => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`h-9 px-3.5 rounded-lg border text-[12px] font-bold transition-all duration-300 ${
                activeTab === key
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-md'
                  : 'border-white/[.08] bg-[#1e1e28] text-zinc-400 hover:text-white'
              }`}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {(postsLoading && activeTab !== 'reported') || (reportsLoading && activeTab === 'reported') ? (
          <div className="p-20 text-center flex flex-col items-center">
            <Loader2 className="animate-spin text-indigo-400 mb-3" size={24} />
            <p className="text-[13px] text-zinc-500">Đang tải dữ liệu kiểm duyệt...</p>
          </div>
        ) : activeTab === 'reported' ? (
          reports.length === 0 ? (
            <div className="p-12 text-center text-[12px] bg-[#1a1a24] rounded-xl text-zinc-500 border border-white/[.05]">
              Không có bài đăng nào bị báo cáo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">{reports.map(renderReportCard)}</div>
          )
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-[12px] bg-[#1a1a24] rounded-xl text-zinc-500 border border-white/[.05] space-y-3">
            <p>Không có bài đăng nào cần xử lý trong mục này.</p>
            {(activeTab === 'flagged' || activeTab === 'pending') && (
              <p className="text-[11px] text-zinc-600">
                Bài có ảnh đã public nhưng chưa bị phát hiện? Bấm <strong className="text-amber-400">Quét lại media AI</strong> để kiểm duyệt lại.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">{posts.map(renderPostCard)}</div>
        )}
      </div>

      {detailReport && detailReport.post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailReport(null)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 bg-[#1a1a24] border border-white/[.08] shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-[15px] font-bold text-white">Chi tiết báo cáo</h3>
              <button onClick={() => setDetailReport(null)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
            </div>

            <div className="text-[12px] text-zinc-400 space-y-1">
              <p>Người báo cáo: <strong className="text-zinc-200">{detailReport.reporterName}</strong></p>
              <p>Lý do: <strong className="text-red-400">{detailReport.reasonType}</strong> — {detailReport.reasonText}</p>
            </div>

            <div className="border-t border-white/[.06] pt-3 space-y-2">
              <h4 className="text-[14px] font-bold text-white">{detailReport.post.title}</h4>
              <p className="text-[13px] text-zinc-300 whitespace-pre-wrap">{detailReport.post.content}</p>
              {detailReport.post.imageUrls?.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg max-h-48 object-cover" />
              ))}
              {detailReport.post.videoUrl && (
                <a href={detailReport.post.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-400 text-[12px]">
                  Xem video
                </a>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/[.02] border border-white/[.04] text-[11px] text-zinc-300 space-y-1">
              <p>AI Subject: {detailReport.post.aiDetectedSubject} · Confidence: {((detailReport.post.aiTagConfidence ?? 0) * 100).toFixed(0)}%</p>
              <p>Safety: {detailReport.post.aiSafetyStatus} {detailReport.post.aiSafetyReason && `— ${detailReport.post.aiSafetyReason}`}</p>
              {validSummary(detailReport.post) && <p className="italic">Summary: {detailReport.post.aiSummary}</p>}
            </div>

            <div className="flex gap-2 justify-end flex-wrap">
              <button
                onClick={() => dismissReportMutation.mutate(reportKey(detailReport))}
                className="px-3 py-1.5 rounded-lg bg-zinc-700 text-white text-[11px] font-bold"
              >
                Bỏ qua báo cáo
              </button>
              <button
                onClick={() => detailReport.post?.id && setRemoveReportPostId(detailReport.post.id)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold"
              >
                Gỡ bài đăng
              </button>
              {detailReport.post?.id && (
                <button
                  onClick={() => approveMutation.mutate(detailReport.post!.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                >
                  Duyệt bài
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectPostId(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 bg-[#1a1a24] border border-white/[.08] shadow-2xl">
            <h3 className="text-[14px] font-bold text-white mb-3">Lý do từ chối bài viết</h3>
            <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối..." className="w-full p-2.5 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectPostId(null)} className="px-3.5 py-1.5 rounded-lg bg-zinc-700 text-white text-[11px] font-bold">Hủy</button>
              <button onClick={() => rejectMutation.mutate({ postId: rejectPostId, reason: rejectReason })} className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold">Xác nhận từ chối</button>
            </div>
          </div>
        </div>
      )}

      {revisionPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRevisionPostId(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 bg-[#1a1a24] border border-white/[.08] shadow-2xl">
            <h3 className="text-[14px] font-bold text-white mb-3">Yêu cầu người dùng sửa đổi bài viết</h3>
            <textarea rows={3} value={revisionMessage} onChange={e => setRevisionMessage(e.target.value)} placeholder="Nhập lời nhắc sửa đổi cho tác giả..." className="w-full p-2.5 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRevisionPostId(null)} className="px-3.5 py-1.5 rounded-lg bg-zinc-700 text-white text-[11px] font-bold">Hủy</button>
              <button onClick={() => requestRevisionMutation.mutate({ postId: revisionPostId, message: revisionMessage })} className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold">Gửi yêu cầu</button>
            </div>
          </div>
        </div>
      )}

      {removeReportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRemoveReportPostId(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 bg-[#1a1a24] border border-white/[.08] shadow-2xl">
            <h3 className="text-[14px] font-bold text-white mb-3">Lý do gỡ bài đăng</h3>
            <textarea rows={3} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Nhập lý do gỡ bài..." className="w-full p-2.5 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRemoveReportPostId(null)} className="px-3.5 py-1.5 rounded-lg bg-zinc-700 text-white text-[11px] font-bold">Hủy</button>
              <button
                onClick={() => removeMutation.mutate({ postId: removeReportPostId, reason: removeReason || 'Vi phạm tiêu chuẩn cộng đồng' })}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold"
              >
                Xác nhận gỡ
              </button>
            </div>
          </div>
        </div>
      )}

      {warningUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWarningUserId(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 bg-[#1a1a24] border border-white/[.08] shadow-2xl space-y-4">
            <h3 className="text-[14px] font-bold text-white border-b border-white/[.06] pb-2 flex items-center gap-1.5">
              <AlertCircle className="text-red-400" size={15} />
              Gửi cảnh cáo chính thức đến người dùng
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Cấp độ cảnh cáo</label>
                <select value={warningLevel} onChange={e => setWarningLevel(e.target.value as any)} className="w-full h-10 px-3 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none">
                  <option value="REMINDER">Cấp 1 - Nhắc nhở</option>
                  <option value="WARNING">Cấp 2 - Cảnh cáo vừa</option>
                  <option value="SEVERE">Cấp 3 - Cảnh cáo nghiêm trọng</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                  Tự động khóa: Nhắc nhở ×5 → 10 ngày · Cảnh cáo ×3 → 20 ngày · Nghiêm trọng ×2 → 30 ngày.
                  Tái phạm sau khi bị khóa → vĩnh viễn.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Lý do vi phạm</label>
                <input value={warningReason} onChange={e => setWarningReason(e.target.value)} placeholder="Ví dụ: sai tag hệ thống, nội dung không phù hợp..." className="w-full h-10 px-3 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Thông điệp chi tiết gửi user</label>
                <textarea rows={3} value={warningMsgText} onChange={e => setWarningMsgText(e.target.value)} placeholder="Nhập tin nhắn cụ thể về lý do cảnh cáo..." className="w-full p-2.5 rounded-xl border text-[12px] bg-[#14141e] border-white/[.08] text-white outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[.06] pt-3">
              <button onClick={() => setWarningUserId(null)} className="px-3.5 py-1.5 rounded-lg bg-zinc-700 text-white text-[11px] font-bold">Hủy</button>
              <button onClick={handleSendWarning} className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold flex items-center gap-1">Gửi cảnh cáo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
