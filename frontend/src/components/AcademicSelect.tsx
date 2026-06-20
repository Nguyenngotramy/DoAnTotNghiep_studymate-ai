import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  GraduationCap,
  Search,
  X,
} from 'lucide-react'
import clsx from 'clsx'

interface AcademicSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder: string
  type: 'school' | 'major'
  disabled?: boolean
  loading?: boolean
  helperText?: string
  theme?: 'light' | 'dark'
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function AcademicSelect({
  value,
  options,
  onChange,
  placeholder,
  type,
  disabled = false,
  loading = false,
  helperText,
  theme = 'light',
}: AcademicSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const Icon = type === 'school' ? GraduationCap : BriefcaseBusiness
  const dark = theme === 'dark'

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    const matched = needle
      ? options.filter(option => normalize(option).includes(needle))
      : options
    return matched.slice(0, 100)
  }, [options, query])

  const choose = (option: string) => {
    onChange(option)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={clsx(
          'w-full min-h-11 px-3.5 rounded-xl border flex items-center gap-3 text-left transition-all',
          disabled && 'cursor-not-allowed opacity-55',
        )}
        style={{
          background: dark ? '#1e1e2e' : 'var(--bg2)',
          borderColor: open ? 'rgba(99,102,241,.65)' : dark ? 'rgba(255,255,255,.08)' : 'var(--border)',
          color: dark ? '#f0f0f5' : 'var(--text)',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,.10)' : 'none',
        }}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: type === 'school' ? 'rgba(99,102,241,.14)' : 'rgba(20,184,166,.14)' }}
        >
          <Icon size={16} style={{ color: type === 'school' ? '#818cf8' : '#2dd4bf' }} />
        </span>
        <span
          className="flex-1 min-w-0 text-[13px] truncate"
          style={{ color: value ? (dark ? '#f0f0f5' : 'var(--text)') : (dark ? '#737386' : 'var(--text3)') }}
        >
          {loading ? 'Đang tải danh sách...' : value || placeholder}
        </span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={event => {
              event.stopPropagation()
              onChange('')
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') onChange('')
            }}
            className="p-1 rounded-md hover:bg-black/10"
            title="Bỏ lựa chọn"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={15} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {helperText && (
        <p className="text-[11px] mt-1.5" style={{ color: dark ? '#737386' : 'var(--text3)' }}>
          {helperText}
        </p>
      )}

      {open && !disabled && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 rounded-xl border overflow-hidden shadow-2xl"
          style={{
            background: dark ? '#181822' : 'var(--bg2)',
            borderColor: dark ? 'rgba(255,255,255,.12)' : 'var(--border)',
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,.08)' : 'var(--border)' }}>
            <div
              className="h-9 px-3 rounded-lg flex items-center gap-2"
              style={{ background: dark ? '#101018' : 'var(--bg3)' }}
            >
              <Search size={14} style={{ color: dark ? '#737386' : 'var(--text3)' }} />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={type === 'school' ? 'Tìm nhanh tên trường...' : 'Tìm nhanh ngành hoặc nghề...'}
                className="flex-1 bg-transparent outline-none text-[12px]"
                style={{ color: dark ? '#f0f0f5' : 'var(--text)' }}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5">
            {filtered.length > 0 ? filtered.map(option => (
              <button
                type="button"
                key={option}
                onClick={() => choose(option)}
                className="w-full px-3 py-2.5 rounded-lg flex items-start gap-2 text-left text-[12px] transition-colors hover:bg-indigo-500/10"
                style={{ color: dark ? '#c7c7d1' : 'var(--text2)' }}
              >
                <span className="flex-1 leading-snug">{option}</span>
                {value === option && <Check size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />}
              </button>
            )) : (
              <div className="px-3 py-6 text-center text-[12px]" style={{ color: dark ? '#737386' : 'var(--text3)' }}>
                Không tìm thấy lựa chọn phù hợp
              </div>
            )}
          </div>

          <div
            className="px-3 py-2 text-[10px] border-t"
            style={{
              color: dark ? '#737386' : 'var(--text3)',
              borderColor: dark ? 'rgba(255,255,255,.08)' : 'var(--border)',
            }}
          >
            {options.length.toLocaleString('vi-VN')} lựa chọn
            {options.length > 100 && !query ? ' · dùng ô tìm kiếm để xem nhanh hơn' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
