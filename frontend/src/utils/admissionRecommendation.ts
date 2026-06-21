export const SUBJECT_LABELS = {
  toan: 'Toán',
  van: 'Ngữ văn',
  anh: 'Tiếng Anh',
  ly: 'Vật lí',
  hoa: 'Hóa học',
  sinh: 'Sinh học',
  su: 'Lịch sử',
  dia: 'Địa lí',
  gdcd: 'GDCD',
} as const

export type SubjectKey = keyof typeof SUBJECT_LABELS
export type SubjectScores = Record<SubjectKey, number | null>
export type RiasecKey = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
export type RiasecScores = Record<RiasecKey, number>

export type AdmissionRow = {
  ma_truong: string
  ten_truong: string
  phuong_thuc: string
  ten_nganh: string
  to_hop_mon: string
  diem_chuan: string
  ghi_chu: string
  ma_nganh_chuan_bo_gddt: string
  nhom_riasec: string
  nganh_ra_lam_gi: string
  khu_vuc_truong: string
  loai_truong: string
  nguon_url: string
  thu_thap_luc: string
  source_sha256: string
}

export type AdmissionProgramRow = {
  ma_truong: string
  ten_truong: string
  ma_nganh: string
  ten_nganh: string
  chi_tieu: string
  phuong_thuc_xet_tuyen: string
  to_hop_mon: string
  nguon_url: string
  thu_thap_luc: string
  source_sha256: string
}

export type TuitionRow = {
  ma_truong: string
  ten_truong: string
  hoc_phi_raw: string
  nguon_url: string
  thu_thap_luc: string
  source_sha256: string
}

export type RecommendationCategory = 'an_toan' | 'vua_suc' | 'thu_thach'
export type InterestFit = 'cao' | 'trung_binh' | 'thap' | 'khong_co_du_lieu'

export type AdmissionRecommendation = {
  ma_nganh: string | null
  ten_nganh: string
  ten_truong: string
  to_hop_su_dung: string
  to_hop_hien_tai: string | null
  diem_chuan_gan_nhat: number
  diem_cua_ban: number
  phan_loai: RecommendationCategory
  do_phu_hop_so_thich: InterestFit
  do_phu_hop_tong_hop: number
  ly_do: string
  nganh_ra_lam_gi: string | null
  chi_tieu: string | null
  phuong_thuc_xet_tuyen: string | null
  hoc_phi_tham_khao: string | null
  co_du_lieu_nganh_hien_tai: boolean
  nguon_url: string | null
  thu_thap_luc: string | null
}

export type RecommendationOutput = {
  diem_xet_tuyen_theo_to_hop: Record<string, number>
  ket_qua: AdmissionRecommendation[]
}

export type RecommendationInput = {
  subjectScores: SubjectScores
  priorityScore: number
  dgnlHcm: number | null
  dgnlHn: number | null
  riasec: RiasecScores
  majorQuery?: string
  schoolQuery?: string
  locationQuery?: string
  strategy?: 'balanced' | 'ambitious' | 'safe'
  programs?: AdmissionProgramRow[]
  tuition?: TuitionRow[]
  onlyCurrentPrograms?: boolean
}

const RIASEC_KEYWORDS: Record<RiasecKey, string[]> = {
  R: [
    'ky thuat', 'cong nghe ky thuat', 'co khi', 'dien', 'dien tu', 'tu dong hoa',
    'xay dung', 'giao thong', 'hang hai', 'hang khong', 'nong nghiep', 'lam nghiep',
    'thuy san', 'thu y', 'quan ly dat dai', 'trac dia', 'vat lieu',
  ],
  I: [
    'khoa hoc', 'nghien cuu', 'toan', 'vat ly', 'hoa hoc', 'sinh hoc', 'cong nghe thong tin',
    'khoa hoc may tinh', 'phan mem', 'an toan thong tin', 'du lieu', 'tri tue nhan tao',
    'y khoa', 'y hoc', 'duoc',
    'dieu duong', 'xet nghiem', 'dinh duong', 'moi truong',
  ],
  A: [
    'nghe thuat', 'thiet ke', 'kien truc', 'my thuat', 'am nhac', 'san khau', 'dien anh',
    'bao chi', 'truyen thong', 'ngon ngu', 'van hoc', 'thoi trang', 'do hoa',
  ],
  S: [
    'su pham', 'giao duc', 'tam ly', 'cong tac xa hoi', 'xa hoi hoc', 'y khoa', 'y hoc',
    'dieu duong', 'phuc hoi', 'du lich', 'khach san', 'quan tri dich vu', 'luu tru',
  ],
  E: [
    'quan tri', 'kinh doanh', 'marketing', 'thuong mai', 'kinh te', 'luat', 'quan ly',
    'bat dong san', 'tai chinh', 'ngan hang', 'bao hiem', 'logistics', 'khoi nghiep',
  ],
  C: [
    'ke toan', 'kiem toan', 'tai chinh', 'ngan hang', 'thong ke', 'he thong thong tin',
    'quan tri van phong', 'luu tru', 'thu vien', 'hanh chinh', 'hai quan', 'thue',
  ],
}

const COMBINATIONS: Record<string, SubjectKey[]> = {
  A00: ['toan', 'ly', 'hoa'],
  A01: ['toan', 'ly', 'anh'],
  A02: ['toan', 'ly', 'sinh'],
  A03: ['toan', 'ly', 'su'],
  A04: ['toan', 'ly', 'dia'],
  A05: ['toan', 'hoa', 'su'],
  A06: ['toan', 'hoa', 'dia'],
  A07: ['toan', 'su', 'dia'],
  A08: ['toan', 'su', 'gdcd'],
  A09: ['toan', 'dia', 'gdcd'],
  A10: ['toan', 'ly', 'gdcd'],
  A11: ['toan', 'hoa', 'gdcd'],
  B00: ['toan', 'hoa', 'sinh'],
  B01: ['toan', 'sinh', 'su'],
  B02: ['toan', 'sinh', 'dia'],
  B03: ['toan', 'sinh', 'van'],
  B04: ['toan', 'sinh', 'gdcd'],
  B08: ['toan', 'sinh', 'anh'],
  C00: ['van', 'su', 'dia'],
  C01: ['van', 'toan', 'ly'],
  C02: ['van', 'toan', 'hoa'],
  C03: ['van', 'toan', 'su'],
  C04: ['van', 'toan', 'dia'],
  C14: ['van', 'toan', 'gdcd'],
  C19: ['van', 'su', 'gdcd'],
  C20: ['van', 'dia', 'gdcd'],
  D01: ['van', 'toan', 'anh'],
  D07: ['toan', 'hoa', 'anh'],
  D08: ['toan', 'sinh', 'anh'],
  D09: ['toan', 'su', 'anh'],
  D10: ['toan', 'dia', 'anh'],
  D14: ['van', 'su', 'anh'],
  D15: ['van', 'dia', 'anh'],
  D66: ['van', 'gdcd', 'anh'],
  D84: ['toan', 'gdcd', 'anh'],
}

const CSV_HEADERS: (keyof AdmissionRow)[] = [
  'ma_truong',
  'ten_truong',
  'phuong_thuc',
  'ten_nganh',
  'to_hop_mon',
  'diem_chuan',
  'ghi_chu',
  'ma_nganh_chuan_bo_gddt',
  'nhom_riasec',
  'nganh_ra_lam_gi',
  'khu_vuc_truong',
  'loai_truong',
  'nguon_url',
  'thu_thap_luc',
  'source_sha256',
]

const PROGRAM_CSV_HEADERS: (keyof AdmissionProgramRow)[] = [
  'ma_truong',
  'ten_truong',
  'ma_nganh',
  'ten_nganh',
  'chi_tieu',
  'phuong_thuc_xet_tuyen',
  'to_hop_mon',
  'nguon_url',
  'thu_thap_luc',
  'source_sha256',
]

const TUITION_CSV_HEADERS: (keyof TuitionRow)[] = [
  'ma_truong',
  'ten_truong',
  'hoc_phi_raw',
  'nguon_url',
  'thu_thap_luc',
  'source_sha256',
]

const round2 = (value: number) => Math.round(value * 100) / 100
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function inferRiasecLabels(majorName: string): RiasecKey[] {
  const normalizedName = normalize(majorName)
  const searchableName = ` ${normalizedName} `
  const ranked = (Object.entries(RIASEC_KEYWORDS) as [RiasecKey, string[]][])
    .map(([key, keywords]) => ({
      key,
      score: keywords.reduce(
        (total, keyword) =>
          total + (searchableName.includes(` ${keyword} `) ? keyword.split(' ').length : 0),
        0,
      ),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranked.slice(0, 2).map(item => item.key)
}

function parseCsvValues(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function parseTypedCsv<T extends Record<string, string>>(
  text: string,
  headers: (keyof T)[],
): T[] {
  const rows = parseCsvValues(text)
  const sourceHeaders = (rows[0] ?? []).map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  )
  const sourceIndexes = new Map(
    sourceHeaders.map((header, index) => [header, index]),
  )

  return rows.slice(1).map(values => {
    const item = {} as T
    headers.forEach(header => {
      const index = sourceIndexes.get(String(header))
      item[header] = (index == null ? '' : values[index] ?? '').trim() as T[keyof T]
    })
    return item
  })
}

const hasVerifiedSource = (value: string) => /^https?:\/\/[^\s]+$/i.test(value.trim())

export function parseAdmissionCsv(text: string): AdmissionRow[] {
  return parseTypedCsv<AdmissionRow>(text, CSV_HEADERS).filter(row => {
    const score = Number.parseFloat(row.diem_chuan.replace(',', '.'))
    return Boolean(
      row.ten_truong
      && row.ten_nganh
      && row.phuong_thuc
      && Number.isFinite(score)
      && score > 0
      && score <= 1200
    )
  })
}

export function parseAdmissionProgramCsv(text: string): AdmissionProgramRow[] {
  return parseTypedCsv<AdmissionProgramRow>(text, PROGRAM_CSV_HEADERS)
    .filter(row => Boolean(row.ten_truong && row.ten_nganh))
}

export function parseTuitionCsv(text: string): TuitionRow[] {
  return parseTypedCsv<TuitionRow>(text, TUITION_CSV_HEADERS)
    .filter(row => Boolean(row.ten_truong && row.hoc_phi_raw && hasVerifiedSource(row.nguon_url)))
}

export function calculateCombinationScores(
  scores: SubjectScores,
  priorityScore: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(COMBINATIONS).flatMap(([code, subjects]) => {
      const values = subjects.map(subject => scores[subject])
      if (values.some(value => value == null || !Number.isFinite(value))) return []
      const total = values.reduce<number>((sum, value) => sum + Number(value), 0)
      return [[code, round2(Math.min(30, total + Math.max(0, priorityScore)))]]
    }),
  )
}

function extractYear(method: string): number {
  const match = method.match(/năm\s*(\d{4})/i)
  return match ? Number(match[1]) : 0
}

function methodType(method: string): 'thpt' | 'dgnl_hcm' | 'dgnl_hn' | null {
  const normalized = normalize(method)
  if (normalized.includes('diem thi thpt')) return 'thpt'
  if (normalized.includes('dgnl hcm')) return 'dgnl_hcm'
  if (normalized.includes('dgnl hn')) return 'dgnl_hn'
  return null
}

function parseRiasecLabels(value: string): RiasecKey[] {
  const matches = value.toUpperCase().match(/[RIASEC]/g) ?? []
  return [...new Set(matches)] as RiasecKey[]
}

function interestFit(
  labels: RiasecKey[],
  student: RiasecScores,
): { label: InterestFit; score: number | null } {
  const hasStudentResult = Object.values(student).some(value => value > 0)
  if (!labels.length || !hasStudentResult) return { label: 'khong_co_du_lieu', score: null }

  const score = labels.reduce((sum, label) => sum + student[label], 0) / labels.length / 10
  if (score >= 0.7) return { label: 'cao', score }
  if (score >= 0.4) return { label: 'trung_binh', score }
  return { label: 'thap', score }
}

function scoreFit(diff: number): number {
  if (diff >= 1) return Math.min(100, 85 + Math.min(diff, 5) * 3)
  if (diff >= -1) return 70 + (diff + 1) * 7.5
  return Math.max(20, 65 + diff * 8)
}

function classification(diff: number, interest: InterestFit): RecommendationCategory | null {
  if (diff >= 1) return 'an_toan'
  if (diff >= -1) return 'vua_suc'
  return interest === 'cao' ? 'thu_thach' : null
}

function latestRows(rows: AdmissionRow[]): AdmissionRow[] {
  const latest = new Map<string, AdmissionRow>()
  rows.forEach(row => {
    const type = methodType(row.phuong_thuc)
    if (!type || !row.ten_nganh || !row.ten_truong) return
    const key = `${normalize(row.ten_truong)}|${normalize(row.ten_nganh)}|${type}`
    const existing = latest.get(key)
    if (!existing || extractYear(row.phuong_thuc) > extractYear(existing.phuong_thuc)) {
      latest.set(key, row)
    }
  })
  return [...latest.values()]
}

function normalizeSchool(value: string): string {
  const normalized = normalize(value)
  return /^[A-Z0-9]{2,5}-/.test(value.trim())
    ? normalized.replace(/^[a-z0-9]{2,5}\s+/, '')
    : normalized
}

function normalizeMajor(value: string): string {
  return normalize(value).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
const MAJOR_GROUP_RULES: [string, string[]][] = [
  ['Công nghệ thông tin', ['cong nghe thong tin', 'cntt', 'tin hoc']],
  ['Khoa học máy tính', ['khoa hoc may tinh']],
  ['Kỹ thuật phần mềm', ['ky thuat phan mem', 'cong nghe phan mem']],
  ['Trí tuệ nhân tạo', ['tri tue nhan tao', 'artificial intelligence']],
  ['Khoa học dữ liệu', ['khoa hoc du lieu', 'phan tich du lieu', 'du lieu lon']],
  ['An toàn thông tin', ['an toan thong tin', 'an ninh mang', 'cyber security']],
  ['Hệ thống thông tin', ['he thong thong tin']],
  ['Mạng máy tính và truyền thông dữ liệu', ['mang may tinh', 'truyen thong du lieu']],
  ['Công nghệ kỹ thuật máy tính', ['cong nghe ky thuat may tinh', 'ky thuat may tinh']],
  ['Thương mại điện tử', ['thuong mai dien tu', 'kinh doanh so']],
  ['Marketing', ['marketing', 'quan tri thuong hieu', 'marketing so']],
  ['Quản trị kinh doanh', ['quan tri kinh doanh', 'khoi nghiep va phat trien kinh doanh']],
  ['Kinh doanh quốc tế', ['kinh doanh quoc te', 'thuong mai quoc te']],
  ['Logistics và quản lý chuỗi cung ứng', ['logistics', 'chuoi cung ung']],
  ['Tài chính - Ngân hàng', ['tai chinh ngan hang', 'tai chinh - ngan hang', 'cong nghe tai chinh']],
  ['Kế toán - Kiểm toán', ['ke toan', 'kiem toan']],
  ['Kinh tế', ['kinh te', 'quan ly kinh te']],
  ['Luật', ['luat']],
  ['Ngôn ngữ Anh', ['ngon ngu anh', 'tieng anh thuong mai']],
  ['Ngôn ngữ Trung Quốc', ['ngon ngu trung', 'tieng trung']],
  ['Ngôn ngữ Nhật', ['ngon ngu nhat', 'tieng nhat']],
  ['Ngôn ngữ Hàn Quốc', ['ngon ngu han', 'tieng han']],
  ['Du lịch - Khách sạn', ['du lich', 'lu hanh', 'khach san', 'nha hang']],
  ['Truyền thông - Quan hệ công chúng', ['truyen thong', 'quan he cong chung']],
  ['Thiết kế đồ họa - Mỹ thuật số', ['thiet ke do hoa', 'my thuat so']],
  ['Công nghệ kỹ thuật ô tô', ['ky thuat o to', 'cong nghe ky thuat o to']],
  ['Kỹ thuật điện - Điện tử', ['ky thuat dien', 'dien tu', 'vien thong']],
  ['Tự động hóa - Robot', ['tu dong hoa', 'robot']],
  ['Cơ khí - Cơ điện tử', ['co khi', 'co dien tu']],
  ['Xây dựng - Kiến trúc', ['xay dung', 'kien truc']],
  ['Công nghệ sinh học', ['cong nghe sinh hoc']],
  ['Công nghệ thực phẩm', ['cong nghe thuc pham']],
  ['Y - Dược', ['y khoa', 'duoc hoc', 'rang ham mat', 'dieu duong', 'xet nghiem y hoc']],
  ['Tâm lý học', ['tam ly hoc']],
  ['Sư phạm - Giáo dục', ['su pham', 'giao duc']],
]

const SCHOOL_ALIASES: Record<string, string[]> = {
  'truong dai hoc cong nghe thong tin va truyen thong viet han': ['vku'],
  'dai hoc kinh te quoc dan': ['neu'],
  'truong dai hoc kinh te quoc dan': ['neu'],
  'dai hoc bach khoa ha noi': ['hust', 'bka'],
  'truong dai hoc bach khoa da nang': ['dut', 'bku da nang'],
  'truong dai hoc bach khoa dai hoc da nang': ['dut', 'bku da nang'],
  'truong dai hoc bach khoa dai hoc quoc gia tphcm': ['hcmut', 'bku'],
  'truong dai hoc cong nghe thong tin dai hoc quoc gia tphcm': ['uit'],
  'truong dai hoc khoa hoc tu nhien tphcm': ['hcmus'],
  'truong dai hoc khoa hoc xa hoi va nhan van tphcm': ['hcmussh', 'ussh'],
  'truong dai hoc kinh te tphcm': ['ueh'],
  'truong dai hoc kinh te luat tphcm': ['uel'],
  'truong dai hoc ngoai thuong': ['ftu'],
  'truong dai hoc thuong mai': ['tmu'],
  'hoc vien ngan hang': ['hvnh', 'bav'],
  'hoc vien cong nghe buu chinh vien thong': ['ptit'],
  'truong dai hoc giao thong van tai tphcm': ['uth'],
  'truong dai hoc cong nghiep tphcm': ['iuh'],
  'truong dai hoc kinh te tai chinh tphcm': ['uef'],
  'truong dai hoc quoc te hong bang': ['hiu'],
  'dai hoc phenikaa': ['phenikaa', 'pka'],
  'truong dai hoc fpt': ['fptu', 'fpt'],
  'dai hoc can tho': ['ctu'],
}

function cleanMajorVariant(value: string): string {
  return value
    .replace(/^\s*(?:chương trình\s+)?chất lượng cao\s+/i, '')
    .replace(/^\s*CLC\s*[-:]?\s*/i, '')
    .replace(/\s*[-–]\s*thí sinh\s+(?:nam\s+|nữ\s+)?miền\s+(?:bắc|nam).*$/i, '')
    .replace(/\s*[-–]\s*thí sinh\s+(?:nam|nữ).*$/i, '')
    .replace(/\s*,?\s*chuyên ngành\s+.+$/i, '')
    .replace(/\s*\([^)]*(?:chất lượng cao|CLC|thí sinh miền)[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function majorGroupName(value: string): string {
  const cleaned = cleanMajorVariant(value)
  const normalized = normalize(cleaned)
  const match = MAJOR_GROUP_RULES.find(([, keywords]) =>
    keywords.some(keyword => normalized.includes(keyword)),
  )
  return match?.[0] ?? cleaned.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

export function schoolSearchTerms(schoolCode: string, schoolName: string): string {
  const normalizedName = normalizeSchool(schoolName)
  return [schoolCode, schoolName, ...(SCHOOL_ALIASES[normalizedName] ?? [])].join(' ')
}

function schoolMatchesQuery(row: AdmissionRow, query: string): boolean {
  if (!query) return true
  return normalize(schoolSearchTerms(row.ma_truong, row.ten_truong)).includes(query)
}

function schoolMajorKey(school: string, major: string): string {
  return `${normalizeSchool(school)}|${normalizeMajor(major)}`
}

function mergeDelimitedValues(...values: string[]): string {
  const items = values
    .flatMap(value => value.split(/[;,]/))
    .map(value => value.trim())
    .filter(Boolean)
  return [...new Set(items)].join(', ')
}

function buildProgramIndex(programs: AdmissionProgramRow[]): Map<string, AdmissionProgramRow> {
  const index = new Map<string, AdmissionProgramRow>()
  programs.forEach(program => {
    const key = schoolMajorKey(program.ten_truong, program.ten_nganh)
    const existing = index.get(key)
    if (!existing) {
      index.set(key, { ...program })
      return
    }
    index.set(key, {
      ...existing,
      ma_nganh: existing.ma_nganh || program.ma_nganh,
      chi_tieu: mergeDelimitedValues(existing.chi_tieu, program.chi_tieu),
      phuong_thuc_xet_tuyen: mergeDelimitedValues(
        existing.phuong_thuc_xet_tuyen,
        program.phuong_thuc_xet_tuyen,
      ),
      to_hop_mon: mergeDelimitedValues(existing.to_hop_mon, program.to_hop_mon),
    })
  })
  return index
}

function comparableDifference(
  type: 'thpt' | 'dgnl_hcm' | 'dgnl_hn',
  applicantScore: number,
  cutoff: number,
): number {
  const rawDifference = applicantScore - cutoff
  if (type === 'dgnl_hcm') return rawDifference / 40
  if (type === 'dgnl_hn') return rawDifference / 5
  return rawDifference
}

export function recommendAdmissions(
  rows: AdmissionRow[],
  input: RecommendationInput,
): RecommendationOutput {
  const combinationScores = calculateCombinationScores(input.subjectScores, input.priorityScore)
  const majorQuery = normalize(input.majorQuery ?? '')
  const schoolQuery = normalize(input.schoolQuery ?? '')
  const locationQuery = normalize(input.locationQuery ?? '')
  const hasExplicitMajorPreference = Boolean(majorQuery)
  const strategy = input.strategy ?? 'balanced'
  const programIndex = buildProgramIndex(input.programs ?? [])
  const tuitionIndex = new Map(
    (input.tuition ?? []).map(item => [normalizeSchool(item.ten_truong), item]),
  )

  const recommendations = latestRows(rows)
    .flatMap<AdmissionRecommendation>(row => {
      if (
        majorQuery
        && !normalize(row.ten_nganh).includes(majorQuery)
        && !normalize(majorGroupName(row.ten_nganh)).includes(majorQuery)
      ) return []
      if (!schoolMatchesQuery(row, schoolQuery)) return []
      if (
        locationQuery &&
        !normalize(`${row.khu_vuc_truong} ${row.ten_truong}`).includes(locationQuery)
      ) return []

      const cutoff = Number.parseFloat(row.diem_chuan.replace(',', '.'))
      const type = methodType(row.phuong_thuc)
      if (!Number.isFinite(cutoff) || cutoff <= 0 || !type) return []
      const program = programIndex.get(schoolMajorKey(row.ten_truong, row.ten_nganh))
      if (input.onlyCurrentPrograms && !program) return []
      const tuition = tuitionIndex.get(normalizeSchool(row.ten_truong))

      let applicantScore: number | null = null
      let usedCombination = ''

      if (type === 'thpt') {
        // Values above 30 use a school-specific weighted formula absent from this CSV.
        if (cutoff > 30) return []
        const currentCombinations = program?.to_hop_mon || row.to_hop_mon
        const accepted = currentCombinations
          .split(/[;,]/)
          .map(code => code.trim().toUpperCase())
          .filter(code => combinationScores[code] != null)
          .sort((a, b) => combinationScores[b] - combinationScores[a])
        usedCombination = accepted[0] ?? ''
        applicantScore = usedCombination ? combinationScores[usedCombination] : null
      } else if (type === 'dgnl_hcm') {
        applicantScore = input.dgnlHcm
        usedCombination = 'ĐGNL HCM'
      } else {
        applicantScore = input.dgnlHn
        usedCombination = 'ĐGNL HN'
      }

      if (applicantScore == null || !Number.isFinite(applicantScore)) return []

      const labels = parseRiasecLabels(row.nhom_riasec)
      const interest = interestFit(labels, input.riasec)
      const rawDiff = applicantScore - cutoff
      const diff = comparableDifference(type, applicantScore, cutoff)
      const category = classification(
        diff,
        hasExplicitMajorPreference && interest.label !== 'cao' ? 'cao' : interest.label,
      )
      if (!category) return []

      const academicFit = scoreFit(diff)
      let totalFit =
        interest.score == null ? academicFit : academicFit * 0.7 + interest.score * 100 * 0.3
      if (hasExplicitMajorPreference) totalFit += 10
      if (program) totalFit += 3
      if (strategy === 'ambitious') {
        totalFit += category === 'thu_thach' ? 22 : category === 'vua_suc' ? 12 : 0
        totalFit += Math.min(10, cutoff / 3)
      }
      if (strategy === 'safe') {
        totalFit += category === 'an_toan' ? 25 : category === 'vua_suc' ? 8 : -15
      }
      totalFit = Math.min(100, totalFit)
      const interestReason =
        hasExplicitMajorPreference
          ? 'Ngành khớp với lựa chọn bạn đang tìm.'
          : interest.label === 'khong_co_du_lieu'
          ? 'Chưa có dữ liệu sở thích cho ngành này.'
          : `Mức phù hợp RIASEC: ${interest.label.replace('_', ' ')}.`
      const scoreReason =
        category === 'an_toan'
          ? `Điểm cao hơn chuẩn ${round2(rawDiff)} điểm.`
          : category === 'vua_suc'
            ? `Chênh lệch ${round2(rawDiff)} điểm so với điểm chuẩn.`
            : `Điểm thấp hơn chuẩn ${round2(Math.abs(rawDiff))} điểm nhưng sở thích phù hợp cao.`

      return [{
        ma_nganh: program?.ma_nganh || row.ma_nganh_chuan_bo_gddt || null,
        ten_nganh: row.ten_nganh,
        ten_truong: row.ten_truong,
        to_hop_su_dung: usedCombination,
        to_hop_hien_tai: program?.to_hop_mon || null,
        diem_chuan_gan_nhat: round2(cutoff),
        diem_cua_ban: round2(applicantScore),
        phan_loai: category,
        do_phu_hop_so_thich: interest.label,
        do_phu_hop_tong_hop: round2(totalFit),
        ly_do: `${scoreReason} ${interestReason}`,
        nganh_ra_lam_gi: row.nganh_ra_lam_gi || null,
        chi_tieu: program?.chi_tieu || null,
        phuong_thuc_xet_tuyen: program?.phuong_thuc_xet_tuyen || null,
        hoc_phi_tham_khao: tuition?.hoc_phi_raw || null,
        co_du_lieu_nganh_hien_tai: Boolean(program),
        nguon_url: program?.nguon_url || row.nguon_url || tuition?.nguon_url || null,
        thu_thap_luc: program?.thu_thap_luc || row.thu_thap_luc || tuition?.thu_thap_luc || null,
      }]
    })

  const uniqueRecommendations = new Map<string, AdmissionRecommendation>()
  recommendations.forEach(item => {
    const key = normalize(majorGroupName(item.ten_nganh))
    const existing = uniqueRecommendations.get(key)
    if (!existing || item.do_phu_hop_tong_hop > existing.do_phu_hop_tong_hop) {
      uniqueRecommendations.set(key, item)
    }
  })

  const sortedRecommendations = [...uniqueRecommendations.values()]
    .sort((a, b) => {
      if (strategy === 'ambitious') {
        return (
          b.diem_chuan_gan_nhat - a.diem_chuan_gan_nhat ||
          b.do_phu_hop_tong_hop - a.do_phu_hop_tong_hop
        )
      }
      if (strategy === 'safe') {
        const rank: Record<RecommendationCategory, number> = {
          an_toan: 3,
          vua_suc: 2,
          thu_thach: 1,
        }
        return (
          rank[b.phan_loai] - rank[a.phan_loai] ||
          b.do_phu_hop_tong_hop - a.do_phu_hop_tong_hop
        )
      }
      return b.do_phu_hop_tong_hop - a.do_phu_hop_tong_hop
    })
    .slice(0, 10)

  return {
    diem_xet_tuyen_theo_to_hop: combinationScores,
    ket_qua: sortedRecommendations,
  }
}
