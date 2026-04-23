import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Video,
  Trash2,
  ExternalLink,
  Search,
  Grid3X3,
  List,
  Upload,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Files,
  HardDrive,
  ChevronRight,
  ArrowLeft,
  FolderPlus,
  Pencil,
  Inbox,
  MoveRight,
  X,
  Eye,
  Download,
} from 'lucide-react'
import { studyDriveApi, studyDriveFolderApi } from '@/api/services'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const BACKEND = 'http://localhost:8080/api'

function toAbs(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${BACKEND}${url.startsWith('/') ? url : `/${url}`}`
}

function formatSize(sizeKb?: number) {
  if (!sizeKb || sizeKb <= 0) return '0 KB'
  if (sizeKb < 1024) return `${sizeKb} KB`
  return `${(sizeKb / 1024).toFixed(1)} MB`
}

function formatDate(input?: string) {
  if (!input) return ''
  const d = new Date(input)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(input?: string) {
  if (!input) return ''
  const d = new Date(input)
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function iconByType(type?: string) {
  const t = (type || '').toUpperCase()
  if (t === 'PDF') return <FileText size={18} />
  if (t === 'DOC' || t === 'DOCX') return <FileText size={18} />
  if (t === 'PPT' || t === 'PPTX') return <Presentation size={18} />
  if (t === 'XLS' || t === 'XLSX' || t === 'EXCEL') return <FileSpreadsheet size={18} />
  if (t === 'IMAGE') return <FileImage size={18} />
  if (t === 'VIDEO') return <Video size={18} />
  return <FolderOpen size={18} />
}

function countTotalAttachments(items: any[]) {
  return items.reduce((sum, item) => sum + (item.attachments?.length || 0), 0)
}

function countTotalSize(items: any[]) {
  let totalKb = 0
  for (const item of items) {
    for (const file of item.attachments || []) {
      totalKb += file.sizeKb || 0
    }
  }
  return totalKb
}

function renderStorage(totalKb: number) {
  if (totalKb < 1024) return `${totalKb} KB`
  if (totalKb < 1024 * 1024) return `${(totalKb / 1024).toFixed(1)} MB`
  return `${(totalKb / (1024 * 1024)).toFixed(2)} GB`
}

function getPreviewType(item: any) {
  if (item?.imageUrls?.length) return 'image'
  if (item?.videoUrl) return 'video'
  if (item?.attachments?.length) {
    const type = String(item.attachments[0]?.type || '').toUpperCase()
    if (type === 'PDF') return 'pdf'
    return 'file'
  }
  return 'file'
}

function getPrimaryDownload(item: any) {
  if (item?.attachments?.length) {
    return {
      url: toAbs(item.attachments[0].url),
      name: item.attachments[0].name || item.title || 'download',
    }
  }
  if (item?.imageUrls?.length) {
    return {
      url: toAbs(item.imageUrls[0]),
      name: item.title || 'image',
    }
  }
  if (item?.videoUrl) {
    return {
      url: toAbs(item.videoUrl),
      name: item.title || 'video',
    }
  }
  return null
}

export default function MyStudyDrivePage() {
  const qc = useQueryClient()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Học tập cá nhân' },
  ])

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showRenameFolder, setShowRenameFolder] = useState(false)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [moveItem, setMoveItem] = useState<any | null>(null)
  const [previewFile, setPreviewFile] = useState<any | null>(null)
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [itemMenuOpen, setItemMenuOpen] = useState<string | null>(null)

  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['study-drive', currentFolderId],
    queryFn: () => studyDriveApi.list(currentFolderId),
  })

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['study-drive-folders', currentFolderId],
    queryFn: () => studyDriveFolderApi.list(currentFolderId),
  })

  const { data: rootFolders = [] } = useQuery({
    queryKey: ['study-drive-folders-root'],
    queryFn: () => studyDriveFolderApi.list(null),
  })

  const createFolderMut = useMutation({
    mutationFn: () => studyDriveFolderApi.create(newFolderName.trim(), currentFolderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive-folders'] })
      qc.invalidateQueries({ queryKey: ['study-drive-folders-root'] })
      setShowCreateFolder(false)
      setNewFolderName('')
      toast.success('Đã tạo folder')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể tạo folder')
    },
  })

  const renameFolderMut = useMutation({
    mutationFn: () => {
      if (!renameFolderId) throw new Error('Thiếu folder')
      return studyDriveFolderApi.rename(renameFolderId, renameFolderName.trim())
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive-folders'] })
      qc.invalidateQueries({ queryKey: ['study-drive-folders-root'] })

      setFolderPath(prev =>
        prev.map(node =>
          node.id === renameFolderId ? { ...node, name: renameFolderName.trim() } : node
        )
      )

      setShowRenameFolder(false)
      setRenameFolderId(null)
      setRenameFolderName('')
      toast.success('Đã đổi tên folder')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể đổi tên folder')
    },
  })

  const deleteFolderMut = useMutation({
    mutationFn: (folderId: string) => studyDriveFolderApi.delete(folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive-folders'] })
      qc.invalidateQueries({ queryKey: ['study-drive'] })
      qc.invalidateQueries({ queryKey: ['study-drive-folders-root'] })
      toast.success('Đã xoá folder')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể xoá folder')
    },
  })

  const deleteItemMut = useMutation({
    mutationFn: (id: string) => studyDriveApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive'] })
      toast.success('Đã xoá khỏi học tập cá nhân')
    },
    onError: () => toast.error('Không thể xoá mục này'),
  })

  const moveItemMut = useMutation({
    mutationFn: ({ itemId, targetFolderId }: { itemId: string; targetFolderId?: string | null }) =>
      studyDriveFolderApi.moveItem(itemId, targetFolderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive'] })
      qc.invalidateQueries({ queryKey: ['study-drive-folders'] })
      setMoveItem(null)
      toast.success('Đã chuyển mục')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể chuyển mục')
    },
  })

  const uploadMut = useMutation({
    mutationFn: (file: File) => studyDriveApi.upload(file, currentFolderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-drive'] })
      toast.success('Đã tải file lên')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Không thể tải file lên')
    },
  })

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items

    return items.filter((item: any) => {
      const inTitle = item.title?.toLowerCase().includes(q)
      const inDesc = item.description?.toLowerCase().includes(q)
      const inGroup = item.groupName?.toLowerCase().includes(q)
      const inFiles = (item.attachments || []).some((f: any) =>
        f.name?.toLowerCase().includes(q)
      )
      return inTitle || inDesc || inGroup || inFiles
    })
  }, [items, search])

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((folder: any) =>
      folder.name?.toLowerCase().includes(q)
    )
  }, [folders, search])

  const totalItems = filteredItems.length
  const totalFiles = countTotalAttachments(filteredItems)
  const totalStorage = renderStorage(countTotalSize(filteredItems))

  const openFolder = (folder: any) => {
    setCurrentFolderId(folder.id)
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
    setFolderMenuOpen(null)
  }

  const goToPath = (index: number) => {
    const next = folderPath.slice(0, index + 1)
    setFolderPath(next)
    setCurrentFolderId(next[next.length - 1].id)
  }

  const goBack = () => {
    if (folderPath.length <= 1) return
    const next = folderPath.slice(0, -1)
    setFolderPath(next)
    setCurrentFolderId(next[next.length - 1].id)
  }

  const onDragStartItem = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('studyItemId', itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragStartFolder = (e: React.DragEvent, folderId: string) => {
    e.dataTransfer.setData('studyFolderId', folderId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDropToFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()

    const itemId = e.dataTransfer.getData('studyItemId')
    const draggedFolderId = e.dataTransfer.getData('studyFolderId')

    if (itemId) {
      moveItemMut.mutate({ itemId, targetFolderId: folderId })
      return
    }

    if (draggedFolderId && draggedFolderId !== folderId) {
      studyDriveFolderApi.moveFolder(draggedFolderId, folderId)
        .then(() => {
          qc.invalidateQueries({ queryKey: ['study-drive-folders'] })
          qc.invalidateQueries({ queryKey: ['study-drive-folders-root'] })
          toast.success('Đã chuyển folder')
        })
        .catch((err: any) => {
          toast.error(err?.response?.data?.message || 'Không thể chuyển folder')
        })
    }
  }

  const onDragOverFolder = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="page-enter max-w-7xl mx-auto space-y-5">
      <section
        className="rounded-[28px] border overflow-hidden"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.18), rgba(139,92,246,.18))' }}
              >
                <FolderOpen size={28} style={{ color: '#a5b4fc' }} />
              </div>

              <div>
                <h1 className="text-[22px] font-bold" style={{ color: 'var(--text)' }}>
                  Học tập cá nhân
                </h1>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text3)' }}>
                  Lưu trữ bài viết, tài liệu và tài nguyên học tập của bạn
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                style={{ background: 'rgba(99,102,241,.16)', color: '#a5b4fc' }}
                onClick={() => setShowCreateFolder(true)}
              >
                <FolderPlus size={16} />
                Tạo folder
              </button>

              <input
                ref={uploadInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMut.mutate(file)
                  e.currentTarget.value = ''
                }}
              />

              <button
                className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-medium"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload size={16} />
                Tải tệp lên
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 h-11 rounded-2xl flex-1 min-w-[260px]"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--text3)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong học tập cá nhân..."
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <div
              className="h-11 px-2 rounded-2xl flex items-center gap-1"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setView('grid')}
                className={clsx(
                  'w-10 h-9 rounded-xl flex items-center justify-center transition-all',
                  view === 'grid' && 'bg-indigo-500/15'
                )}
                style={{ color: view === 'grid' ? '#a5b4fc' : 'var(--text3)' }}
              >
                <Grid3X3 size={16} />
              </button>

              <button
                onClick={() => setView('list')}
                className={clsx(
                  'w-10 h-9 rounded-xl flex items-center justify-center transition-all',
                  view === 'list' && 'bg-indigo-500/15'
                )}
                style={{ color: view === 'list' ? '#a5b4fc' : 'var(--text3)' }}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen size={16} style={{ color: '#818cf8' }} />
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Mục đã lưu
                </span>
              </div>
              <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--text)' }}>
                {totalItems}
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Files size={16} style={{ color: '#14b8a6' }} />
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Tệp đính kèm
                </span>
              </div>
              <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--text)' }}>
                {totalFiles}
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <HardDrive size={16} style={{ color: '#f59e0b' }} />
                <span className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Dung lượng
                </span>
              </div>
              <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--text)' }}>
                {totalStorage}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="rounded-[28px] border overflow-hidden"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 text-[13px] flex-wrap" style={{ color: 'var(--text2)' }}>
            <button
              onClick={goBack}
              disabled={folderPath.length <= 1}
              className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-40"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              <ArrowLeft size={14} />
            </button>

            {folderPath.map((node, idx) => (
              <div key={`${node.id ?? 'root'}-${idx}`} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight size={14} style={{ color: 'var(--text3)' }} />}
                <button
                  onClick={() => goToPath(idx)}
                  className="hover:underline"
                  style={{ color: idx === folderPath.length - 1 ? 'var(--text)' : 'var(--text2)' }}
                >
                  {node.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text3)' }}>
            <CalendarDays size={14} />
            {new Date().toLocaleDateString('vi-VN')}
          </div>
        </div>

        {(foldersLoading || itemsLoading) ? (
          <div className="text-center py-14" style={{ color: 'var(--text3)' }}>
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {!!filteredFolders.length && (
              <div className="px-5 pt-5">
                <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text3)' }}>
                  Folder
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredFolders.map((folder: any) => (
                    <div
                      key={folder.id}
                      draggable
                      onDragStart={(e) => onDragStartFolder(e, folder.id)}
                      className="rounded-2xl border p-4"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                      onDragOver={onDragOverFolder}
                      onDrop={(e) => onDropToFolder(e, folder.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => openFolder(folder)}
                          className="flex items-center gap-3 min-w-0 text-left flex-1"
                        >
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,.15)', color: '#a5b4fc' }}
                          >
                            <FolderOpen size={20} />
                          </div>

                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                              {folder.name}
                            </div>
                            <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                              Cập nhật {formatDate(folder.updatedAt || folder.createdAt)}
                            </div>
                          </div>
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {folderMenuOpen === folder.id && (
                            <div
                              className="absolute right-0 top-11 w-44 rounded-2xl border shadow-xl z-20 overflow-hidden"
                              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                            >
                              <button
                                onClick={() => {
                                  setRenameFolderId(folder.id)
                                  setRenameFolderName(folder.name)
                                  setShowRenameFolder(true)
                                  setFolderMenuOpen(null)
                                }}
                                className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                style={{ color: 'var(--text)' }}
                              >
                                Đổi tên
                              </button>

                              <button
                                onClick={() => {
                                  openFolder(folder)
                                  setFolderMenuOpen(null)
                                }}
                                className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                style={{ color: 'var(--text)' }}
                              >
                                Mở folder
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa folder "${folder.name}"?`)) {
                                    deleteFolderMut.mutate(folder.id)
                                  }
                                  setFolderMenuOpen(null)
                                }}
                                className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                style={{ color: '#ef4444' }}
                              >
                                Xóa folder
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!filteredFolders.length && !filteredItems.length ? (
              <div className="text-center py-16">
                <FolderOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
                <p className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                  Chưa có gì trong thư mục này
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  Bạn có thể tạo folder hoặc lưu bài viết vào đây.
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredItems.map((item: any) => {
                  const primaryDownload = getPrimaryDownload(item)

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => onDragStartItem(e, item.id)}
                      className="rounded-3xl border p-4 cursor-grab active:cursor-grabbing"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[18px] font-bold truncate" style={{ color: 'var(--text)' }}>
                            {item.title}
                          </div>
                          <div className="mt-1 text-[12px]" style={{ color: 'var(--text3)' }}>
                            {item.groupName ? `Từ nhóm ${item.groupName}` : 'Nguồn cá nhân'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewFile(item)}
                            className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e' }}
                            title="Xem trước"
                          >
                            <Eye size={16} />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setItemMenuOpen(itemMenuOpen === item.id ? null : item.id)}
                              className="w-11 h-11 rounded-2xl flex items-center justify-center"
                              style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                              title="Tùy chọn"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {itemMenuOpen === item.id && (
                              <div
                                className="absolute right-0 top-12 w-48 rounded-2xl border shadow-xl z-20 overflow-hidden"
                                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                              >
                                <button
                                  onClick={() => {
                                    setMoveItem(item)
                                    setItemMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                  style={{ color: 'var(--text)' }}
                                >
                                  Chuyển vào folder
                                </button>

                                <button
                                  onClick={() => {
                                    setPreviewFile(item)
                                    setItemMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                  style={{ color: 'var(--text)' }}
                                >
                                  Xem trước
                                </button>

                                {primaryDownload && (
                                  <a
                                    href={primaryDownload.url}
                                    download={primaryDownload.name}
                                    className="block w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                    style={{ color: 'var(--text)' }}
                                    onClick={() => setItemMenuOpen(null)}
                                  >
                                    Tải xuống
                                  </a>
                                )}

                                <button
                                  onClick={() => {
                                    deleteItemMut.mutate(item.id)
                                    setItemMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-3 text-left text-sm hover:bg-white/[.04]"
                                  style={{ color: '#ef4444' }}
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {!!item.description && (
                        <p className="mt-3 text-[13px] line-clamp-3 whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
                          {item.description}
                        </p>
                      )}

                      {!!item.imageUrls?.length && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {item.imageUrls.slice(0, 2).map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={toAbs(img)}
                              alt="saved"
                              className="w-full h-40 object-cover rounded-2xl border"
                              style={{ borderColor: 'var(--border)' }}
                            />
                          ))}
                        </div>
                      )}

                      {!!item.videoUrl && (
                        <div className="mt-4 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                          <video src={toAbs(item.videoUrl)} controls className="w-full max-h-[280px] bg-black" />
                        </div>
                      )}

                      {!!item.attachments?.length && (
                        <div className="mt-4 space-y-2">
                          {item.attachments.slice(0, 4).map((file: any, idx: number) => (
                            <a
                              key={idx}
                              href={toAbs(file.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border hover:bg-white/[.03]"
                              style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/[.04]">
                                  {iconByType(file.type)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-medium truncate">{file.name}</div>
                                  <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                                    {file.type} · {formatSize(file.sizeKb)}
                                  </div>
                                </div>
                              </div>
                              <ExternalLink size={15} style={{ color: '#a5b4fc' }} />
                            </a>
                          ))}

                          {item.attachments.length > 4 && (
                            <div className="text-[12px] pl-1" style={{ color: 'var(--text3)' }}>
                              + {item.attachments.length - 4} tệp khác
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className="mt-4 pt-3 flex items-center justify-between text-[11px]"
                        style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {formatDateTime(item.createdAt)}
                        </span>

                        {primaryDownload ? (
                          <a
                            href={primaryDownload.url}
                            download={primaryDownload.name}
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                            title="Tải xuống"
                          >
                            <Download size={15} />
                          </a>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center opacity-40"
                            style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                          >
                            <Download size={15} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-3">
                <div
                  className="grid grid-cols-[minmax(0,1.8fr)_120px_160px_100px] px-3 py-2 text-[11px] font-semibold"
                  style={{ color: 'var(--text3)' }}
                >
                  <div>Tên</div>
                  <div>Số tệp</div>
                  <div>Ngày lưu</div>
                  <div></div>
                </div>

                <div className="space-y-2">
                  {filteredItems.map((item: any) => {
                    const primaryDownload = getPrimaryDownload(item)

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStartItem(e, item.id)}
                        className="grid grid-cols-[minmax(0,1.8fr)_120px_160px_100px] items-center px-3 py-3 rounded-2xl border cursor-grab active:cursor-grabbing"
                        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {item.title}
                          </div>
                          <div className="text-[11px] truncate mt-1" style={{ color: 'var(--text3)' }}>
                            {item.groupName ? `Từ nhóm ${item.groupName}` : 'Nguồn cá nhân'}
                          </div>
                        </div>

                        <div className="text-[12px]" style={{ color: 'var(--text2)' }}>
                          {item.attachments?.length || 0} tệp
                        </div>

                        <div className="text-[12px]" style={{ color: 'var(--text2)' }}>
                          {formatDate(item.createdAt)}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewFile(item)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setMoveItem(item)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,.12)', color: '#a5b4fc' }}
                          >
                            <MoveRight size={14} />
                          </button>
                          {primaryDownload ? (
                            <a
                              href={primaryDownload.url}
                              download={primaryDownload.name}
                              className="w-9 h-9 rounded-xl flex items-center justify-center"
                              style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                            >
                              <Download size={14} />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="w-9 h-9 rounded-xl flex items-center justify-center opacity-40"
                              style={{ background: 'var(--bg2)', color: 'var(--text3)' }}
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showCreateFolder && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-4">
          <div
            className="w-full max-w-md rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Tạo folder mới
              </h3>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-[12px]" style={{ color: 'var(--text3)' }}>
                Tên folder
              </label>
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ví dụ: TOPIK, Java, Đề thi..."
                className="mt-2 w-full h-12 px-4 rounded-2xl outline-none text-[14px]"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolderMut.mutate()
                }}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="h-10 px-4 rounded-xl text-sm"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                Hủy
              </button>
              <button
                onClick={() => createFolderMut.mutate()}
                className="h-10 px-4 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameFolder && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-4">
          <div
            className="w-full max-w-md rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                Đổi tên folder
              </h3>
              <button
                onClick={() => setShowRenameFolder(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4">
              <input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl outline-none text-[14px]"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameFolderMut.mutate()
                }}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowRenameFolder(false)}
                className="h-10 px-4 rounded-xl text-sm"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                Hủy
              </button>
              <button
                onClick={() => renameFolderMut.mutate()}
                className="h-10 px-4 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {moveItem && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-4">
          <div
            className="w-full max-w-lg rounded-3xl border p-5"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Chuyển vào folder
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  {moveItem.title}
                </p>
              </div>
              <button
                onClick={() => setMoveItem(null)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto">
              <button
                onClick={() => moveItemMut.mutate({ itemId: moveItem.id, targetFolderId: null })}
                className="w-full rounded-2xl border px-3 py-3 text-left"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <div className="flex items-center gap-3">
                  <Inbox size={18} />
                  <span>Thư mục gốc</span>
                </div>
              </button>

              {(rootFolders as any[]).map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => moveItemMut.mutate({ itemId: moveItem.id, targetFolderId: folder.id })}
                  className="w-full rounded-2xl border px-3 py-3 text-left"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={18} />
                    <span>{folder.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div
            className="w-full max-w-4xl rounded-3xl border p-5 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                  Xem trước
                </h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text3)' }}>
                  {previewFile.title}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            {getPreviewType(previewFile) === 'image' && !!previewFile.imageUrls?.length && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {previewFile.imageUrls.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={toAbs(img)}
                    alt="preview"
                    className="w-full rounded-2xl border"
                    style={{ borderColor: 'var(--border)' }}
                  />
                ))}
              </div>
            )}

            {getPreviewType(previewFile) === 'video' && !!previewFile.videoUrl && (
              <div className="mt-4 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <video src={toAbs(previewFile.videoUrl)} controls className="w-full max-h-[480px] bg-black" />
              </div>
            )}

            {getPreviewType(previewFile) === 'pdf' &&
              !!previewFile.attachments?.length &&
              !!previewFile.attachments[0]?.url && (
                <div className="mt-4 space-y-3">
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}
                  >
                    <object
                      data={toAbs(previewFile.attachments[0].url)}
                      type="application/pdf"
                      className="w-full h-[70vh]"
                    >
                      <div className="p-6 text-center">
                        <p className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                          Trình duyệt không thể nhúng file PDF trong khung xem trước.
                        </p>
                        <p className="text-[12px] mt-2" style={{ color: 'var(--text3)' }}>
                          Bạn có thể mở file ở tab mới để xem đầy đủ.
                        </p>
                        <a
                          href={toAbs(previewFile.attachments[0].url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 mt-4 px-4 h-10 rounded-xl text-white text-sm font-medium"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                        >
                          <ExternalLink size={15} />
                          Mở file PDF
                        </a>
                      </div>
                    </object>
                  </div>
                </div>
              )}

            {(getPreviewType(previewFile) === 'file' || getPreviewType(previewFile) === 'pdf') &&
              !!previewFile.attachments?.length && (
                <div className="mt-4 space-y-2">
                  {previewFile.attachments.map((file: any, idx: number) => (
                    <a
                      key={idx}
                      href={toAbs(file.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 border"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/[.04]">
                          {iconByType(file.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium truncate">{file.name}</div>
                          <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
                            {file.type} · {formatSize(file.sizeKb)}
                          </div>
                        </div>
                      </div>
                      <ExternalLink size={15} style={{ color: '#a5b4fc' }} />
                    </a>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}