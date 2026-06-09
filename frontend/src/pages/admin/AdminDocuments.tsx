import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/api/services'
import toast from 'react-hot-toast'
import {
  FileText,
  Search,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

type AdminDocument = {
  id: string
  groupId: string
  groupName: string
  name: string
  fileUrl: string
  type: string
  sizeKb: number
  uploaderId: string
  uploaderName: string
  sourceType: string
  reviewStatus: 'APPROVED' | 'REPORTED' | 'UNDER_REVIEW' | 'REJECTED' | 'REMOVED'
  reportsCount: number
  flagReason?: string
  latestReason?: string
  reviewNote?: string
  reviewedByName?: string
  reviewedAt?: string
  createdAt?: string
  reports?: {
    id: string
    userId: string
    fullName: string
    reason: string
    createdAt: string
  }[]
}

const API_BASE = import.meta.env.VITE_API_URL || ''

function fullUrl(url?: string) {
  if (!url) return '#'
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

function formatSize(sizeKb?: number) {
  if (!sizeKb) return '—'
  if (sizeKb < 1024) return `${sizeKb} KB`
  return `${(sizeKb / 1024).toFixed(1)} MB`
}

function statusBadge(status: string) {
  switch (status) {
    case 'REPORTED':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'UNDER_REVIEW':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'APPROVED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'REJECTED':
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    case 'REMOVED':
      return 'bg-red-900/20 text-red-300 border-red-800/40'
    default:
      return 'bg-white/5 text-zinc-400 border-white/10'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'REPORTED':
      return 'Bị report'
    case 'UNDER_REVIEW':
      return 'Đang xem xét'
    case 'APPROVED':
      return 'Đã duyệt'
    case 'REJECTED':
      return 'Đã từ chối'
    case 'REMOVED':
      return 'Đã gỡ'
    default:
      return status
  }
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [type, setType] = useState('ALL')

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getDocuments({
        status,
        type,
      })
      setDocuments(data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [status, type])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()

    return documents.filter(doc => {
      if (!q) return true

      return (
        doc.name?.toLowerCase().includes(q) ||
        doc.groupName?.toLowerCase().includes(q) ||
        doc.uploaderName?.toLowerCase().includes(q) ||
        doc.latestReason?.toLowerCase().includes(q) ||
        doc.flagReason?.toLowerCase().includes(q)
      )
    })
  }, [documents, search])

  const summary = useMemo(() => {
    return {
      reported: documents.filter(d => d.reviewStatus === 'REPORTED').length,
      underReview: documents.filter(d => d.reviewStatus === 'UNDER_REVIEW').length,
      approved: documents.filter(d => d.reviewStatus === 'APPROVED').length,
      rejected: documents.filter(d => d.reviewStatus === 'REJECTED' || d.reviewStatus === 'REMOVED').length,
    }
  }, [documents])

  const handleApprove = async (docId: string) => {
    try {
      await adminApi.approveDocument(docId)
      toast.success('Đã duyệt tài liệu')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể duyệt tài liệu')
    }
  }

  const handleUnderReview = async (docId: string) => {
    const reason = window.prompt('Nhập lý do chuyển sang under review:', 'Cần kiểm tra thêm nội dung tài liệu')
    if (reason === null) return

    try {
      await adminApi.markDocumentUnderReview(docId, reason)
      toast.success('Đã chuyển sang under review')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }

  const handleReject = async (docId: string) => {
    const reason = window.prompt('Nhập lý do từ chối:', 'Tài liệu không phù hợp')
    if (reason === null) return

    try {
      await adminApi.rejectDocument(docId, reason)
      toast.success('Đã từ chối tài liệu')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể từ chối tài liệu')
    }
  }

  const handleRemove = async (docId: string) => {
    const ok = window.confirm('Bạn có chắc muốn gỡ tài liệu này không?')
    if (!ok) return

    const reason = window.prompt('Nhập lý do gỡ tài liệu:', 'Tài liệu vi phạm quy định nhóm học')
    if (reason === null) return

    try {
      await adminApi.removeDocument(docId, reason)
      toast.success('Đã gỡ tài liệu')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể gỡ tài liệu')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f] text-[#f0f0f5] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold flex items-center gap-2">
            <FileText size={22} className="text-red-400" />
            Quản lý tài liệu
          </h1>
          <p className="text-[13px] text-[#8b8b9e] mt-1">
            Chỉ xử lý tài liệu bị report hoặc cần xem xét. Không duyệt toàn bộ tài liệu upload.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[13px] text-[#d8d8e2] border border-white/[.08]"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-red-300">Bị report</p>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{summary.reported}</h2>
        </div>

        <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-yellow-300">Under review</p>
            <Clock size={18} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{summary.underReview}</h2>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-emerald-300">Đã duyệt</p>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{summary.approved}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-500/15 bg-white/[.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-300">Reject / Removed</p>
            <XCircle size={18} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl font-semibold mt-2">{summary.rejected}</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[.08] bg-[#12121a] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b7c]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên file, nhóm, uploader, lý do..."
              className="w-full bg-[#0a0a0f] border border-white/[.08] rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-red-500/50"
            />
          </div>

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="REPORTED">Bị report</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="REMOVED">Đã gỡ</option>
          </select>

          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-[#0a0a0f] border border-white/[.08] rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            <option value="ALL">Tất cả loại file</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
            <option value="PPTX">PPTX</option>
            <option value="IMAGE">IMAGE</option>
            <option value="VIDEO">VIDEO</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[.08] bg-[#12121a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-[13px]">
            <thead className="bg-white/[.03] text-[#8b8b9e]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Tài liệu</th>
                <th className="text-left px-4 py-3 font-medium">Nhóm</th>
                <th className="text-left px-4 py-3 font-medium">Uploader</th>
                <th className="text-left px-4 py-3 font-medium">Metadata</th>
                <th className="text-left px-4 py-3 font-medium">Lý do</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#8b8b9e]">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#8b8b9e]">
                    Không có tài liệu phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="border-t border-white/[.06] hover:bg-white/[.025]">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                          <FileText size={17} />
                        </div>
                        <div>
                          <p className="font-medium text-[#f0f0f5] max-w-[230px] truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-[#6b6b7c] mt-0.5">
                            {doc.type || 'UNKNOWN'} · {doc.sourceType}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[#d8d8e2]">
                      <p className="max-w-[170px] truncate">{doc.groupName}</p>
                      <p className="text-[11px] text-[#6b6b7c]">{doc.groupId}</p>
                    </td>

                    <td className="px-4 py-3 text-[#d8d8e2]">
                      <p>{doc.uploaderName || '—'}</p>
                      <p className="text-[11px] text-[#6b6b7c]">{doc.uploaderId}</p>
                    </td>

                    <td className="px-4 py-3 text-[#b9b9c8]">
                      <p>{formatSize(doc.sizeKb)}</p>
                      <p className="text-[11px] text-[#6b6b7c]">{formatDate(doc.createdAt)}</p>
                    </td>

                    <td className="px-4 py-3 text-[#b9b9c8] max-w-[260px]">
                      <p className="line-clamp-2">
                        {doc.latestReason || doc.flagReason || doc.reviewNote || '—'}
                      </p>
                      <p className="text-[11px] text-[#6b6b7c] mt-1">
                        {doc.reportsCount || 0} report
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-medium ${statusBadge(doc.reviewStatus)}`}>
                        {statusLabel(doc.reviewStatus)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <a
                          href={fullUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[#d8d8e2]"
                          title="Preview"
                        >
                          <Eye size={15} />
                        </a>

                        <a
                          href={fullUrl(doc.fileUrl)}
                          download
                          className="p-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] text-[#d8d8e2]"
                          title="Tải file"
                        >
                          <Download size={15} />
                        </a>

                        <button
                          onClick={() => handleApprove(doc.id)}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                          title="Approve"
                        >
                          <CheckCircle size={15} />
                        </button>

                        <button
                          onClick={() => handleUnderReview(doc.id)}
                          className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400"
                          title="Under review"
                        >
                          <Clock size={15} />
                        </button>

                        <button
                          onClick={() => handleReject(doc.id)}
                          className="p-2 rounded-lg bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300"
                          title="Reject"
                        >
                          <XCircle size={15} />
                        </button>

                        <button
                          onClick={() => handleRemove(doc.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          title="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}