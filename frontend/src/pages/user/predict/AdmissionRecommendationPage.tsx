import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Filter,
  GraduationCap,
  Info,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import {
  SUBJECT_LABELS,
  calculateCombinationScores,
  majorGroupName,
  parseAdmissionCsv,
  parseAdmissionProgramCsv,
  parseTuitionCsv,
  schoolSearchTerms,
  recommendAdmissions,
  type AdmissionProgramRow,
  type AdmissionRow,
  type RecommendationCategory,
  type RiasecKey,
  type RiasecScores,
  type SubjectKey,
  type SubjectScores,
  type TuitionRow,
} from '@/utils/admissionRecommendation'

const EMPTY_SCORES = Object.fromEntries(
  Object.keys(SUBJECT_LABELS).map(key => [key, null]),
) as SubjectScores

const RIASEC_INFO: Record<RiasecKey, { label: string; color: string }> = {
  R: { label: 'Kỹ thuật', color: '#22c55e' },
  I: { label: 'Nghiên cứu', color: '#3b82f6' },
  A: { label: 'Nghệ thuật', color: '#a855f7' },
  S: { label: 'Xã hội', color: '#ec4899' },
  E: { label: 'Quản lý', color: '#f59e0b' },
  C: { label: 'Nghiệp vụ', color: '#06b6d4' },
}

const RIASEC_QUESTIONS: { id: string; type: RiasecKey; text: string }[] = [
  { id: 'r1', type: 'R', text: 'Tôi thích lắp ráp, sửa chữa máy móc hoặc thiết bị.' },
  { id: 'r2', type: 'R', text: 'Tôi thích làm việc thực hành, tạo ra sản phẩm cụ thể.' },
  { id: 'r3', type: 'R', text: 'Tôi hứng thú với công cụ, kỹ thuật hoặc hoạt động ngoài trời.' },
  { id: 'i1', type: 'I', text: 'Tôi thích tìm nguyên nhân và giải quyết vấn đề khó.' },
  { id: 'i2', type: 'I', text: 'Tôi thích thí nghiệm, phân tích dữ liệu hoặc nghiên cứu.' },
  { id: 'i3', type: 'I', text: 'Tôi thường muốn hiểu sự việc hoạt động như thế nào.' },
  { id: 'a1', type: 'A', text: 'Tôi thích viết, vẽ, thiết kế, âm nhạc hoặc sáng tạo nội dung.' },
  { id: 'a2', type: 'A', text: 'Tôi muốn tự do thể hiện ý tưởng và phong cách riêng.' },
  { id: 'a3', type: 'A', text: 'Tôi nhạy cảm với cái đẹp, ngôn ngữ và cảm xúc.' },
  { id: 's1', type: 'S', text: 'Tôi thích hướng dẫn, chăm sóc hoặc hỗ trợ người khác.' },
  { id: 's2', type: 'S', text: 'Tôi dễ lắng nghe và đồng cảm với vấn đề của mọi người.' },
  { id: 's3', type: 'S', text: 'Tôi thích làm việc nhóm và tạo ảnh hưởng tích cực.' },
  { id: 'e1', type: 'E', text: 'Tôi thích thuyết phục, dẫn dắt hoặc tổ chức hoạt động.' },
  { id: 'e2', type: 'E', text: 'Tôi hứng thú với kinh doanh, đàm phán và ra quyết định.' },
  { id: 'e3', type: 'E', text: 'Tôi sẵn sàng chịu trách nhiệm để đạt mục tiêu.' },
  { id: 'c1', type: 'C', text: 'Tôi thích công việc có quy trình, số liệu và tiêu chuẩn rõ ràng.' },
  { id: 'c2', type: 'C', text: 'Tôi làm việc cẩn thận, ngăn nắp và chú ý chi tiết.' },
  { id: 'c3', type: 'C', text: 'Tôi thích lập kế hoạch, quản lý hồ sơ hoặc kiểm tra thông tin.' },
]

const ANSWER_LABELS = ['Không đúng', 'Ít đúng', 'Phân vân', 'Khá đúng', 'Rất đúng']
const CATEGORY_META: Record<RecommendationCategory, { label: string; color: string; bg: string }> = {
  an_toan: { label: 'An toàn', color: '#16a34a', bg: 'rgba(34,197,94,.12)' },
  vua_suc: { label: 'Vừa sức', color: '#4f46e5', bg: 'rgba(99,102,241,.12)' },
  thu_thach: { label: 'Thử thách', color: '#d97706', bg: 'rgba(245,158,11,.12)' },
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 text-[13px] font-medium text-[var(--text)] outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/10'

function NumberInput({
  value,
  onChange,
  max,
  placeholder = '0',
}: {
  value: number | null
  onChange: (value: number | null) => void
  max: number
  placeholder?: string
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      step="0.01"
      value={value ?? ''}
      placeholder={placeholder}
      className={inputClass}
      onChange={event => {
        const next = event.target.value === '' ? null : Number(event.target.value)
        onChange(next == null ? null : Math.min(max, Math.max(0, next)))
      }}
    />
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border p-4 sm:p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
        <span className="text-indigo-400">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function AdmissionRecommendationPage() {
  const user = useAuthStore(state => state.user)
  const isUniversityStudent = user?.userType === 'STUDENT'
  const resultRef = useRef<HTMLElement>(null)
  const [rows, setRows] = useState<AdmissionRow[]>([])
  const [programs, setPrograms] = useState<AdmissionProgramRow[]>([])
  const [tuition, setTuition] = useState<TuitionRow[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [scores, setScores] = useState<SubjectScores>(EMPTY_SCORES)
  const [priorityScore, setPriorityScore] = useState<number | null>(0)
  const [dgnlHcm, setDgnlHcm] = useState<number | null>(null)
  const [dgnlHn, setDgnlHn] = useState<number | null>(null)
  const [riasec, setRiasec] = useState<RiasecScores>({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
  const [riasecAnswers, setRiasecAnswers] = useState<Record<string, number>>({})
  const [showRiasec, setShowRiasec] = useState(false)
  const [majorQuery, setMajorQuery] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [strategy, setStrategy] = useState<'balanced' | 'ambitious' | 'safe'>('balanced')
  const [onlyCurrentPrograms, setOnlyCurrentPrograms] = useState(true)
  const [result, setResult] = useState<ReturnType<typeof recommendAdmissions> | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | RecommendationCategory>('all')

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/data/diem_chuan_tuyensinh247.csv?v=admission-20260621-v3'),
      fetch('/data/nganh_dao_tao_hien_tai.csv?v=admission-20260621-v3'),
      fetch('/data/hoc_phi_tham_khao.csv?v=admission-20260621-v3'),
    ])
      .then(async responses => {
        const failed = responses.find(response => !response.ok)
        if (failed) throw new Error(`Không tải được dữ liệu (${failed.status})`)
        return Promise.all(responses.map(response => response.text()))
      })
      .then(([admissionText, programText, tuitionText]) => {
        if (!active) return
        setRows(parseAdmissionCsv(admissionText))
        setPrograms(parseAdmissionProgramCsv(programText))
        setTuition(parseTuitionCsv(tuitionText))
        setLoadingData(false)
      })
      .catch(error => {
        if (!active) return
        setDataError(error instanceof Error ? error.message : 'Không tải được dữ liệu tuyển sinh')
        setLoadingData(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const stored = localStorage.getItem(`studymate-riasec-${user.id}`)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { answers?: Record<string, number>; scores?: RiasecScores }
      if (parsed.answers) setRiasecAnswers(parsed.answers)
      if (parsed.scores) setRiasec(parsed.scores)
    } catch {
      localStorage.removeItem(`studymate-riasec-${user.id}`)
    }
  }, [user?.id])

  const currentCombinations = useMemo(
    () => calculateCombinationScores(scores, priorityScore ?? 0),
    [scores, priorityScore],
  )
  const majors = useMemo(
    () => [...new Set(rows.map(row => majorGroupName(row.ten_nganh)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi')),
    [rows],
  )
  const schoolSuggestions = useMemo(() => {
    const unique = new Map<string, { code: string; name: string }>()
    rows.forEach(row => {
      const key = row.ma_truong || row.ten_truong
      if (!unique.has(key)) unique.set(key, { code: row.ma_truong, name: row.ten_truong })
    })
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [rows])
  const hasLocationData = useMemo(
    () => rows.some(row => Boolean(row.khu_vuc_truong?.trim())),
    [rows],
  )
  const visibleResults = useMemo(() => {
    if (!result) return []
    return activeFilter === 'all'
      ? result.ket_qua
      : result.ket_qua.filter(item => item.phan_loai === activeFilter)
  }, [result, activeFilter])
  const categories = useMemo(() => {
    const source = result?.ket_qua ?? []
    return {
      an_toan: source.filter(item => item.phan_loai === 'an_toan').length,
      vua_suc: source.filter(item => item.phan_loai === 'vua_suc').length,
      thu_thach: source.filter(item => item.phan_loai === 'thu_thach').length,
    }
  }, [result])
  const topRiasec = useMemo(
    () => (Object.entries(riasec) as [RiasecKey, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
    [riasec],
  )

  const handleRecommend = () => {
    if (!rows.length) {
      toast.error('Dữ liệu tuyển sinh chưa sẵn sàng')
      return
    }
    if (!Object.keys(currentCombinations).length && dgnlHcm == null && dgnlHn == null) {
      toast.error('Hãy nhập đủ điểm của ít nhất một tổ hợp hoặc điểm ĐGNL')
      return
    }
    const next = recommendAdmissions(rows, {
      subjectScores: scores,
      priorityScore: priorityScore ?? 0,
      dgnlHcm,
      dgnlHn,
      riasec,
      majorQuery,
      schoolQuery,
      locationQuery: hasLocationData ? locationQuery : '',
      strategy,
      programs,
      tuition,
      onlyCurrentPrograms,
    })
    setResult(next)
    setActiveFilter('all')
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const completeRiasecTest = () => {
    if (!user?.id) return
    if (Object.keys(riasecAnswers).length !== RIASEC_QUESTIONS.length) {
      toast.error(`Bạn còn ${RIASEC_QUESTIONS.length - Object.keys(riasecAnswers).length} câu chưa trả lời`)
      return
    }
    const calculated = (Object.keys(RIASEC_INFO) as RiasecKey[]).reduce<RiasecScores>(
      (output, key) => {
        const questions = RIASEC_QUESTIONS.filter(question => question.type === key)
        const total = questions.reduce((sum, question) => sum + riasecAnswers[question.id], 0)
        output[key] = Math.round((total / (questions.length * 5)) * 100) / 10
        return output
      },
      { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    )
    setRiasec(calculated)
    localStorage.setItem(`studymate-riasec-${user.id}`, JSON.stringify({ answers: riasecAnswers, scores: calculated }))
    setShowRiasec(false)
    toast.success('Đã tính và lưu kết quả RIASEC')
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border p-10 text-center" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <GraduationCap className="mx-auto mb-3 text-indigo-400" size={32} />
        <p style={{ color: 'var(--text)' }}>Bạn cần đăng nhập để dùng đề xuất ngành học.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-0 pb-8 sm:space-y-5 sm:px-1 sm:pb-10">
      <header
        className="relative overflow-hidden rounded-2xl border p-4 sm:rounded-3xl sm:p-6"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg2) 86%, #6366f1 14%), var(--bg2))',
          borderColor: 'color-mix(in srgb, var(--border) 65%, #6366f1 35%)',
        }}
      >
        <div className="relative flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
              <Sparkles size={12} /> Đề xuất tham khảo
            </div>
            <h1 className="flex items-start gap-2.5 text-[20px] font-bold leading-tight sm:items-center sm:gap-3 sm:text-[25px]" style={{ color: 'var(--text)' }}>
              <GraduationCap className="mt-0.5 shrink-0 text-indigo-400 sm:mt-0" size={26} />
              {isUniversityStudent ? 'Gợi ý ngành học thêm & hướng nghề' : 'Gợi ý ngành và trường phù hợp'}
            </h1>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--text3)' }}>
              {isUniversityStudent
                ? 'Đối chiếu sở thích, năng lực đầu vào và khám phá ngành bổ trợ phù hợp với định hướng hiện tại.'
                : 'Gợi ý ngành và trường phù hợp'}
            </p>
          </div>
          <div className="self-start rounded-xl border px-3 py-2" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <span className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: loadingData ? '#f59e0b' : dataError ? '#ef4444' : '#22c55e' }}>
              {loadingData ? <LoaderCircle className="animate-spin" size={14} /> : dataError ? <AlertCircle size={14} /> : <Database size={14} />}
              {loadingData
                ? 'Đang tải'
                : dataError || `${rows.length.toLocaleString('vi-VN')} điểm chuẩn · ${programs.length.toLocaleString('vi-VN')} ngành`}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="1. Bạn đang tìm gì?" icon={<Search size={17} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium" style={{ color: 'var(--text2)' }}>Ngành mong muốn</span>
              <input list="major-options" value={majorQuery} onChange={e => setMajorQuery(e.target.value)} placeholder="Ví dụ: Công nghệ thông tin" className={inputClass} />
              <datalist id="major-options">{majors.map(item => <option key={item} value={item} />)}</datalist>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium" style={{ color: 'var(--text2)' }}>Trường mong muốn</span>
              <input list="school-options" value={schoolQuery} onChange={e => setSchoolQuery(e.target.value)} placeholder="Để trống nếu muốn xem nhiều trường" className={inputClass} />
              <datalist id="school-options">{schoolSuggestions.flatMap(item => [
                <option key={`${item.code}-code`} value={item.code || item.name} label={item.name} />,
                <option key={`${item.code}-name`} value={item.name} label={schoolSearchTerms(item.code, item.name)} />,
              ])}</datalist>
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-medium" style={{ color: 'var(--text2)' }}>Địa điểm mong muốn</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text3)' }} />
                <input
                  value={locationQuery}
                  onChange={e => setLocationQuery(e.target.value)}
                  disabled={!hasLocationData}
                  placeholder={hasLocationData ? 'Ví dụ: Hà Nội, Đà Nẵng, TP.HCM' : 'Chưa có dữ liệu địa lý'}
                  className={`${inputClass} pl-9 disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                {hasLocationData
                  ? 'Kết quả được lọc theo khu vực có trong dữ liệu trường.'
                  : 'Bộ lọc tạm khóa để tránh trả kết quả địa lý thiếu chính xác.'}
              </p>
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium" style={{ color: 'var(--text2)' }}>Chiến lược nguyện vọng</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([
                ['balanced', 'Cân bằng', 'Kết hợp điểm và sở thích'],
                ['ambitious', 'Điểm chuẩn cao', 'Ưu tiên trường/ngành có chuẩn cao'],
                ['safe', 'An toàn', 'Ưu tiên khả năng đủ điểm'],
              ] as const).map(([key, label, description]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setStrategy(key)}
                  className="rounded-xl border p-3 text-left transition"
                  style={{
                    borderColor: strategy === key ? '#6366f1' : 'var(--border)',
                    background: strategy === key ? 'rgba(99,102,241,.12)' : 'var(--bg3)',
                  }}
                >
                  <strong className="block text-[11px]" style={{ color: strategy === key ? '#818cf8' : 'var(--text)' }}>{label}</strong>
                  <span className="mt-1 block text-[9px] leading-relaxed" style={{ color: 'var(--text3)' }}>{description}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px]" style={{ color: 'var(--text3)' }}>
              “Điểm chuẩn cao” không đồng nghĩa xếp hạng danh tiếng trường; dữ liệu không có bảng xếp hạng.
            </p>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
            <input
              type="checkbox"
              checked={onlyCurrentPrograms}
              onChange={event => setOnlyCurrentPrograms(event.target.checked)}
              className="mt-0.5 accent-indigo-500"
            />
            <span>
              <strong className="block text-[11px]" style={{ color: 'var(--text)' }}>Chỉ hiện ngành ghép được với dữ liệu tuyển sinh mới</strong>
              <span className="mt-1 block text-[9px]" style={{ color: 'var(--text3)' }}>
                Giảm kết quả dùng ngành cũ hoặc tên ngành chưa đối chiếu được.
              </span>
            </span>
          </label>
        </Panel>

        <Panel title="2. Hồ sơ của bạn" icon={<Target size={17} />}>
          <details open={!isUniversityStudent} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-medium" style={{ color: 'var(--text2)' }}>
              Điểm thi và ĐGNL
              <ChevronDown size={15} className="transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.entries(SUBJECT_LABELS) as [SubjectKey, string][]).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{label}</span>
                  <NumberInput value={scores[key]} max={10} onChange={value => setScores(current => ({ ...current, [key]: value }))} />
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="space-y-1"><span className="text-[10px]" style={{ color: 'var(--text3)' }}>Ưu tiên</span><NumberInput value={priorityScore} max={3} onChange={setPriorityScore} /></label>
              <label className="space-y-1"><span className="text-[10px]" style={{ color: 'var(--text3)' }}>ĐGNL HCM</span><NumberInput value={dgnlHcm} max={1200} onChange={setDgnlHcm} /></label>
              <label className="space-y-1"><span className="text-[10px]" style={{ color: 'var(--text3)' }}>ĐGNL HN</span><NumberInput value={dgnlHn} max={150} onChange={setDgnlHn} /></label>
            </div>
          </details>

          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>Sở thích RIASEC</p>
                <p className="mt-1 text-[9px]" style={{ color: 'var(--text3)' }}>
                  {topRiasec[0]?.[1] > 0
                    ? topRiasec.map(([key, value]) => `${key} ${value.toFixed(1)}`).join(' · ')
                    : 'Chưa làm bài trắc nghiệm'}
                </p>
              </div>
              <button type="button" onClick={() => setShowRiasec(true)} className="rounded-lg bg-indigo-500/10 px-3 py-2 text-[10px] font-semibold text-indigo-400">
                {topRiasec[0]?.[1] > 0 ? 'Làm lại' : 'Làm bài test'}
              </button>
            </div>
          </div>

          {Object.keys(currentCombinations).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(currentCombinations).map(([code, score]) => (
                <span key={code} className="rounded-lg border px-2 py-1 text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                  {code}: <b>{score.toFixed(2)}</b>
                </span>
              ))}
            </div>
          )}

          <button type="button" onClick={handleRecommend} disabled={loadingData || Boolean(dataError)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {loadingData ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Tìm ngành và trường phù hợp
          </button>
        </Panel>
      </div>

      {result && (
        <section ref={resultRef} className="scroll-mt-4 space-y-4">
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-[18px] font-semibold" style={{ color: 'var(--text)' }}>
                <BarChart3 className="text-indigo-400" size={19} /> Kết quả đề xuất
              </h2>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                {majorQuery ? `Ngành chứa “${majorQuery}”` : 'Tất cả ngành phù hợp'} · tối đa 10 kết quả
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {([
                ['all', 'Tất cả', result.ket_qua.length],
                ['an_toan', 'An toàn', categories.an_toan],
                ['vua_suc', 'Vừa sức', categories.vua_suc],
                ['thu_thach', 'Thử thách', categories.thu_thach],
              ] as const).map(([key, label, count]) => (
                <button key={key} onClick={() => setActiveFilter(key)} className="rounded-lg border px-3 py-1.5 text-[10px] font-medium" style={{ borderColor: activeFilter === key ? '#6366f1' : 'var(--border)', background: activeFilter === key ? 'rgba(99,102,241,.12)' : 'var(--bg2)', color: activeFilter === key ? '#818cf8' : 'var(--text3)' }}>
                  {label} · {count}
                </button>
              ))}
            </div>
          </div>

          {visibleResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
              <Filter className="mx-auto mb-2 text-indigo-400" size={25} />
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Không có kết quả khớp toàn bộ điều kiện</p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text3)' }}>Thử bỏ bộ lọc địa điểm/trường hoặc chọn chiến lược khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleResults.map((item, index) => {
                const meta = CATEGORY_META[item.phan_loai]
                const difference = item.diem_cua_ban - item.diem_chuan_gan_nhat
                return (
                  <article key={`${item.ten_truong}-${item.ten_nganh}-${item.to_hop_su_dung}`} className="rounded-2xl border p-4 sm:p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-[11px] font-bold text-indigo-400">{index + 1}</span>
                        <div>
                          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{item.ten_nganh}</h3>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--text3)' }}>{item.ten_truong}</p>
                          <p className="mt-1 text-[9px]" style={{ color: item.co_du_lieu_nganh_hien_tai ? '#22c55e' : 'var(--text3)' }}>
                            {item.ma_nganh ? `Mã ngành ${item.ma_nganh} · ` : ''}
                            {item.co_du_lieu_nganh_hien_tai ? 'Đã đối chiếu dữ liệu ngành mới' : 'Chỉ có điểm chuẩn lịch sử'}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg px-2.5 py-1 text-[10px] font-semibold" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ['Xét bằng', item.to_hop_su_dung],
                        ['Điểm bạn', item.diem_cua_ban.toFixed(2)],
                        ['Điểm chuẩn', item.diem_chuan_gan_nhat.toFixed(2)],
                        ['Chênh lệch', `${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl p-2.5" style={{ background: 'var(--bg3)' }}>
                          <p className="text-[8px] uppercase" style={{ color: 'var(--text3)' }}>{label}</p>
                          <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--text)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                      <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text2)' }}><CheckCircle2 size={13} className="text-indigo-400" /> Phù hợp tổng hợp</span>
                      <b className="text-[13px] text-indigo-400">{item.do_phu_hop_tong_hop.toFixed(1)}</b>
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>{item.ly_do}</p>
                    {(item.chi_tieu || item.phuong_thuc_xet_tuyen || item.hoc_phi_tham_khao) && (
                      <details className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
                        <summary className="cursor-pointer text-[10px] font-semibold text-indigo-400">Thông tin tuyển sinh tham khảo</summary>
                        <div className="mt-2 space-y-2 text-[9px] leading-relaxed" style={{ color: 'var(--text3)' }}>
                          {item.chi_tieu && <p><b style={{ color: 'var(--text2)' }}>Chỉ tiêu nguồn:</b> {item.chi_tieu}</p>}
                          {item.phuong_thuc_xet_tuyen && <p><b style={{ color: 'var(--text2)' }}>Phương thức:</b> {item.phuong_thuc_xet_tuyen}</p>}
                          {item.to_hop_hien_tai && <p><b style={{ color: 'var(--text2)' }}>Tổ hợp trong nguồn mới:</b> {item.to_hop_hien_tai}</p>}
                          {item.hoc_phi_tham_khao && (
                            <p>
                              <b style={{ color: 'var(--text2)' }}>Học phí:</b>{' '}
                              {item.hoc_phi_tham_khao.length > 1200
                                ? `${item.hoc_phi_tham_khao.slice(0, 1200)}…`
                                : item.hoc_phi_tham_khao}
                            </p>
                          )}
                          {item.nguon_url && (
                            <p>
                              <b style={{ color: 'var(--text2)' }}>Nguồn dữ liệu:</b>{' '}
                              <a href={item.nguon_url} target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                                Mở trang nguồn
                              </a>
                              {item.thu_thap_luc ? ` · Thu thập ${new Date(item.thu_thap_luc).toLocaleDateString('vi-VN')}` : ''}
                            </p>
                          )}
                        </div>
                      </details>
                    )}
                  </article>
                )
              })}
            </div>
          )}
          <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-[10px] text-amber-600 dark:text-amber-300">
            <Info size={13} className="shrink-0" />
            Điểm chuẩn cao chỉ phản ánh mức cạnh tranh lịch sử trong CSV, không phải bảng xếp hạng chất lượng trường.
          </div>
        </section>
      )}

      {!result && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-[10px]" style={{ color: 'var(--text3)' }}>
          <ShieldCheck size={14} className="text-emerald-500" />
          Hệ thống chỉ dùng ngành, trường và điểm chuẩn trong CSV; không tự tạo trường hoặc dữ liệu tuyển sinh.
        </div>
      )}

      {showRiasec && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-3">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border sm:max-h-[92vh] sm:rounded-3xl" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="flex items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--text)' }}><ClipboardCheck size={18} className="text-indigo-400" /> Trắc nghiệm RIASEC</h2>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text3)' }}>18 câu · đã trả lời {Object.keys(riasecAnswers).length}/18</p>
              </div>
              <button type="button" onClick={() => setShowRiasec(false)} className="rounded-lg p-2" style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {RIASEC_QUESTIONS.map((question, index) => (
                <div key={question.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>{index + 1}. {question.text}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                    {ANSWER_LABELS.map((label, answerIndex) => {
                      const value = answerIndex + 1
                      const selected = riasecAnswers[question.id] === value
                      return (
                        <button type="button" key={label} onClick={() => setRiasecAnswers(current => ({ ...current, [question.id]: value }))} className="min-h-9 rounded-lg border px-1 text-[9px] font-medium" style={{ borderColor: selected ? '#6366f1' : 'var(--border)', background: selected ? 'rgba(99,102,241,.14)' : 'var(--bg2)', color: selected ? '#818cf8' : 'var(--text3)' }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={completeRiasecTest} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-[12px] font-semibold text-white">
                <BrainCircuit size={15} /> Tính và lưu kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
