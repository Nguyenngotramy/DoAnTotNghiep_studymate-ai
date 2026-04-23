/**
 * StudyMate AI — MongoDB Large Seed Script
 * Chạy: node seed.js
 * Cần: npm install mongodb bcryptjs
 */

const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcryptjs')

const MONGO_URI = 'mongodb://localhost:27017'
const DB_NAME = 'studymate'

// ── Helpers ───────────────────────────────────────────────
const id = () => new ObjectId()
const now = () => new Date()
const daysAgo = n => new Date(Date.now() - n * 86400000)
const hoursAgo = n => new Date(Date.now() - n * 3600000)
const future = n => new Date(Date.now() + n * 86400000)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[rand(0, arr.length - 1)]
const chance = p => Math.random() < p
const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const sample = (arr, count) => shuffle(arr).slice(0, Math.min(count, arr.length))
const slug = s =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
const pad = n => String(n).padStart(2, '0')
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

const SUBJECTS = [
  'Toán',
  'Tiếng Anh',
  'Lập trình',
  'AI/ML',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'Lịch sử',
  'Địa lý',
  'TOEIC',
  'IELTS',
  'THPT',
  'CNTT',
]

const SKILL_COLORS = {
  Toán: '#6366f1',
  'Tiếng Anh': '#ec4899',
  'Lập trình': '#14b8a6',
  'AI/ML': '#8b5cf6',
  'Vật lý': '#3b82f6',
  'Hóa học': '#22c55e',
  'Sinh học': '#10b981',
  'Ngữ văn': '#f97316',
  'Lịch sử': '#f59e0b',
  'Địa lý': '#84cc16',
  TOEIC: '#f59e0b',
  IELTS: '#f97316',
  THPT: '#ef4444',
  CNTT: '#6366f1',
}

const COVER_COLORS = ['#6366f1', '#14b8a6', '#f97316', '#22c55e', '#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6']

const SCHOOLS = [
  'Đại học Bách khoa Đà Nẵng',
  'Đại học Kinh tế Đà Nẵng',
  'Đại học Ngoại ngữ Đà Nẵng',
  'Đại học Sư phạm Đà Nẵng',
  'Đại học Duy Tân',
  'Đại học FPT Đà Nẵng',
  'THPT Phan Châu Trinh',
  'THPT Hoàng Hoa Thám',
  'THPT Trần Phú',
  'THPT Chuyên Lê Quý Đôn',
]

const LOCATIONS = [
  'Đà Nẵng',
  'Huế',
  'Quảng Nam',
  'Quảng Ngãi',
  'Hà Nội',
  'TP.HCM',
  'Nghệ An',
  'Bình Định',
]

const GOALS = [
  'Cải thiện GPA học kỳ này',
  'Đạt IELTS 6.5',
  'Đạt TOEIC 750+',
  'Đỗ đại học',
  'Ôn thi cuối kỳ',
  'Tìm bạn học nhóm',
  'Hoàn thành đồ án tốt nghiệp',
  'Cải thiện kỹ năng lập trình',
]

const BIOS = [
  'Thích học nhóm và chia sẻ tài liệu',
  'Đang cố gắng cải thiện môn yếu của mình',
  'Muốn tìm bạn học chăm chỉ và nghiêm túc',
  'Yêu thích công nghệ và học tập hiệu quả',
  'Thường học buổi tối và cuối tuần',
  'Thích giải thích bài cho người khác',
  'Đang ôn thi nên rất cần nhóm học tốt',
  'Mục tiêu là học đều mỗi ngày',
]

const FIRST_NAMES = [
  'An', 'Bảo', 'Bình', 'Châu', 'Chi', 'Dũng', 'Đạt', 'Đức', 'Giang', 'Hà',
  'Hải', 'Hằng', 'Hiếu', 'Hoà', 'Hoàng', 'Hồng', 'Huy', 'Khánh', 'Khang', 'Lan',
  'Linh', 'Long', 'Mai', 'Minh', 'My', 'Nam', 'Ngân', 'Ngọc', 'Nhi', 'Nhung',
  'Phát', 'Phương', 'Quân', 'Quỳnh', 'Sơn', 'Thanh', 'Thảo', 'Thiên', 'Thu', 'Thư',
  'Tiến', 'Trâm', 'Trang', 'Trinh', 'Trí', 'Trung', 'Tú', 'Tuấn', 'Uyên', 'Vy',
]

const MIDDLE_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi', 'Phan', 'Đỗ',
  'Ngô', 'Hồ', 'Dương', 'Lý',
]

const LAST_NAMES = [
  'Văn', 'Thị', 'Minh', 'Gia', 'Anh', 'Bích', 'Thanh', 'Ngọc', 'Quang', 'Tấn',
]

const SAMPLE_IMAGES = [
  '/uploads/demo-study-1.jpg',
  '/uploads/demo-study-2.jpg',
  '/uploads/demo-study-3.jpg',
  '/uploads/demo-study-4.jpg',
  '/uploads/demo-study-5.jpg',
  '/uploads/demo-study-6.jpg',
  '/uploads/demo-study-7.jpg',
  '/uploads/demo-study-8.jpg',
]

const SAMPLE_VIDEOS = [
  'https://www.youtube.com/watch?v=ysz5S6PUM-U',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
]

function buildFullName(i) {
  const a = pick(MIDDLE_NAMES)
  const b = pick(LAST_NAMES)
  const c = pick(FIRST_NAMES)
  return `${a} ${b} ${c} ${i > 0 ? '' : ''}`.trim()
}

function buildEmail(fullName, i) {
  return `${slug(fullName)}${pad(i)}@demo.com`
}

function buildStudentCode(i) {
  return `SV${String(1000 + i)}`
}

function randomUserType() {
  return pick(['STUDENT', 'HIGHSCHOOL', 'TEACHER', 'OTHER'])
}

function buildSchedule() {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const slots = sample(days, rand(2, 4))
  return slots.map(d => ({
    dayOfWeek: d,
    startTime: pick(['06:00', '07:00', '08:00', '13:00', '15:00', '19:00']),
    endTime: pick(['08:00', '09:00', '10:00', '15:00', '17:00', '21:00']),
  }))
}

function buildSkills() {
  const subjects = sample(SUBJECTS, rand(2, 4))
  return subjects.map(s => ({
    subject: s,
    level: rand(1, 3),
    color: SKILL_COLORS[s] ?? '#6366f1',
  }))
}

function buildStrongWeak(skills) {
  const sorted = [...skills].sort((a, b) => b.level - a.level)
  return {
    strongSubjects: sorted.filter(s => s.level >= 2).slice(0, 2).map(s => s.subject),
    weakSubjects: sorted.filter(s => s.level === 1).slice(0, 2).map(s => s.subject),
  }
}

function makeComments(users, count = 2) {
  return sample(users, count).map(u => ({
    id: id().toString(),
    authorId: u._id.toString(),
    authorName: u.fullName,
    authorAvatar: u.avatar ?? null,
    content: pick([
      'Bài này hay quá!',
      'Cảm ơn bạn, mình hiểu hơn rồi.',
      'Mình đang cần đúng chủ đề này.',
      'Cho mình xin thêm tài liệu với nhé!',
      'Giải thích dễ hiểu thật sự.',
      'Mình sẽ áp dụng cách này thử.',
      'Đúng chủ đề mình đang học luôn.',
    ]),
    createdAt: daysAgo(rand(1, 7)),
  }))
}

function makeLikes(users, count = 4) {
  return sample(users, count).map(u => u._id.toString())
}

function makeSaved(users, count = 2) {
  return sample(users, count).map(u => u._id.toString())
}

function generatePostContent(type, subject) {
  const map = {
    text: [
      `Mình tổng hợp nhanh một số ý quan trọng về ${subject}. Cách học hiệu quả nhất với mình là chia nhỏ nội dung, học đều mỗi ngày và làm bài tập ngay sau khi học.`,
      `Nếu bạn đang học ${subject}, mình nghĩ điều quan trọng nhất là hiểu bản chất trước rồi mới học mẹo. Đừng học thuộc lòng quá nhiều ngay từ đầu.`,
      `Đây là vài kinh nghiệm mình rút ra khi học ${subject}: học theo chủ đề, ghi note ngắn, luyện bài tập đều và xem lại lỗi sai.`,
    ],
    image: [
      `Mình vừa làm xong sơ đồ/tổng hợp cho ${subject}, đăng lên đây để mọi người tham khảo nhé.`,
      `Share nhanh vài hình note ${subject} mình đã tự tổng hợp. Hy vọng giúp được mọi người.`,
      `Đây là mindmap ${subject} mình dùng để ôn trước kiểm tra.`,
    ],
    video: [
      `Mình quay một video ngắn giải thích ${subject} theo cách dễ hiểu hơn. Ai đang học phần này có thể xem thử.`,
      `Video ngắn về ${subject} — mình cố gắng giải thích theo kiểu dễ nhớ.`,
      `Mình record lại phần ${subject} mà nhiều bạn hay hỏi.`,
    ],
    short: [
      `Ai cần tài liệu ${subject} không?`,
      `Share nhanh nhé ✨`,
      `Mới note xong phần này.`,
      `Cái này cứu mình trước giờ kiểm tra 😭`,
    ],
  }

  return pick(map[type])
}

function generatePostTitle(type, subject) {
  const map = {
    text: [
      `Kinh nghiệm học ${subject} hiệu quả hơn`,
      `Tóm tắt nhanh ${subject} cho người mới`,
      `Những điều mình ước biết sớm khi học ${subject}`,
      `Cách mình cải thiện ${subject} trong 2 tuần`,
    ],
    image: [
      `Note ${subject} mình tự làm`,
      `Mindmap ${subject} siêu ngắn gọn`,
      `Tổng hợp hình ảnh ôn ${subject}`,
      `Sơ đồ ${subject} dễ nhớ`,
    ],
    video: [
      `Video ngắn giải thích ${subject}`,
      `Giải nhanh ${subject} trong vài phút`,
      `Mình quay nhanh phần ${subject} này`,
      `Clip ngắn về ${subject}`,
    ],
    short: [
      `Ai học ${subject} không?`,
      `Share nhanh ${subject}`,
      `Vừa ôn xong ${subject}`,
      `Tài liệu ${subject}`,
    ],
  }
  return pick(map[type])
}

async function seed() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  console.log('✅ Kết nối MongoDB thành công')

  const db = client.db(DB_NAME)

  await Promise.all([
    db.collection('users').deleteMany({ role: { $ne: 'ADMIN' } }),
    db.collection('groups').deleteMany({}),
    db.collection('tasks').deleteMany({}),
    db.collection('chat_messages').deleteMany({}),
    db.collection('posts').deleteMany({}),
    db.collection('direct_messages').deleteMany({}),
    db.collection('friendships').deleteMany({}),
    db.collection('notifications').deleteMany({}),
    db.collection('documents').deleteMany({}),
  ])
  console.log('🗑️  Đã xóa data cũ')

  const pw = await bcrypt.hash('Demo@2024!', 10)

  // ── USERS ─────────────────────────────────────────────
  const users = []

  for (let i = 1; i <= 140; i++) {
    const fullName = buildFullName(i)
    const skills = buildSkills()
    const { strongSubjects, weakSubjects } = buildStrongWeak(skills)
    const userType = randomUserType()

    users.push({
      _id: id(),
      email: buildEmail(fullName, i),
      password: pw,
      fullName,
      studentCode: buildStudentCode(i),
      avatar: chance(0.35) ? `/uploads/avatar-${(i % 10) + 1}.jpg` : null,
      coverImage: chance(0.18) ? `/uploads/cover-${(i % 6) + 1}.jpg` : null,
      bio: pick(BIOS),
      location: pick(LOCATIONS),
      school: pick(SCHOOLS),
      role: 'USER',
      locked: false,
      xp: rand(0, 3500),
      streak: rand(0, 40),
      skills,
      onboardingDone: chance(0.85),
      userType,
      goal: pick(GOALS),
      strongSubjects,
      weakSubjects,
      availableSchedule: buildSchedule(),
      interests: sample(SUBJECTS, rand(2, 5)),
      tagViewCount: {},
      viewedPostIds: [],
      settings: {
        darkMode: chance(0.7),
        lang: pick(['vi', 'en']),
      },
      createdAt: daysAgo(rand(1, 120)),
      updatedAt: daysAgo(rand(0, 7)),
    })
  }

  await db.collection('users').insertMany(users)
  console.log(`👥 Đã tạo ${users.length} users`)

  const usersById = new Map(users.map(u => [u._id.toString(), u]))

  // ── FRIENDSHIPS ───────────────────────────────────────
  const friendshipSet = new Set()
  const friendships = []

  const addFriendship = (a, b, status) => {
    if (a._id.toString() === b._id.toString()) return
    const key = [a._id.toString(), b._id.toString()].sort().join('_')
    if (friendshipSet.has(key)) return
    friendshipSet.add(key)

    friendships.push({
      _id: id(),
      requesterId: a._id.toString(),
      receiverId: b._id.toString(),
      status,
      createdAt: daysAgo(rand(1, 30)),
    })
  }

  for (let i = 0; i < 220; i++) {
    const [a, b] = sample(users, 2)
    addFriendship(a, b, chance(0.75) ? 'ACCEPTED' : 'PENDING')
  }

  await db.collection('friendships').insertMany(friendships)
  console.log(`🤝 Đã tạo ${friendships.length} friendships`)

  // ── GROUPS ────────────────────────────────────────────
  const groupBlueprints = [
    ['Nhóm CNTT K22', 'Nhóm học lập trình và làm đồ án tốt nghiệp', 'CNTT'],
    ['Ôn thi Tiếng Anh', 'Luyện IELTS và kỹ năng Speaking', 'Tiếng Anh'],
    ['Toán Cao Cấp HK2', 'Ôn tập giữa kỳ và cuối kỳ môn Toán', 'Toán'],
    ['Hóa Sinh Y Dược', 'Học nhóm Hóa học và Sinh học', 'Hóa học'],
    ['Ôn thi THPT QG', 'Ôn tập toàn diện cho kỳ thi THPT', 'THPT'],
    ['CLB AI/ML', 'Chia sẻ kiến thức học máy và dự án', 'AI/ML'],
    ['Frontend React Team', 'Cùng luyện React và UI', 'Lập trình'],
    ['Backend Spring Boot', 'API, Security, JWT, MongoDB', 'Lập trình'],
    ['Nhóm IELTS 6.5+', 'Lộ trình luyện thi IELTS', 'IELTS'],
    ['TOEIC Study Room', 'Ôn TOEIC nghe đọc', 'TOEIC'],
    ['Nhóm Vật lý đại cương', 'Bài tập và lý thuyết Vật lý', 'Vật lý'],
    ['Lịch sử 12', 'Ôn thi và tóm tắt sự kiện', 'Lịch sử'],
    ['Ngữ văn nghị luận', 'Luyện viết và phân tích tác phẩm', 'Ngữ văn'],
    ['Sinh học ôn thi', 'Di truyền, sinh thái, tế bào', 'Sinh học'],
    ['Data Structure & Algorithm', 'Giải DSA và luyện code', 'Lập trình'],
    ['Nhóm Đồ án AI', 'Làm đồ án có tích hợp AI', 'AI/ML'],
    ['Nhóm CSDL MongoDB', 'Schema, query, indexing', 'CNTT'],
    ['Speaking Club', 'Luyện phản xạ giao tiếp tiếng Anh', 'Tiếng Anh'],
    ['Nhóm học cuối tuần', 'Học chung vào cuối tuần', 'THPT'],
    ['Team học đêm', 'Những người hay học sau 9 giờ tối', 'CNTT'],
    ['Nhóm Kinh tế vi mô', 'Trao đổi bài tập và lý thuyết', 'Đại học'],
    ['Nhóm xác suất thống kê', 'Ôn tập xác suất và thống kê', 'Toán'],
    ['Nhóm bài tập Java', 'Chữa bài tập Java OOP', 'Lập trình'],
    ['Nhóm học nhóm lớp 12A1', 'Chia sẻ tài liệu và lịch kiểm tra', 'THPT'],
  ]

  const groups = groupBlueprints.map((g, idx) => {
    const leader = pick(users)
    const memberPool = users.filter(u => u._id.toString() !== leader._id.toString())
    const members = [
      {
        userId: leader._id.toString(),
        fullName: leader.fullName,
        role: 'LEADER',
        joinedAt: daysAgo(rand(10, 100)),
      },
      ...sample(memberPool, rand(6, 18)).map(u => ({
        userId: u._id.toString(),
        fullName: u.fullName,
        role: 'MEMBER',
        joinedAt: daysAgo(rand(1, 70)),
      })),
    ]

    const rawCode = `${slug(g[0]).slice(0, 4).toUpperCase()}${pad(idx + 1)}`
    const inviteCode = rawCode.length >= 6 ? rawCode.slice(0, 6) : `${rawCode}${String(100 + idx).slice(-2)}`

    return {
      _id: id(),
      name: g[0],
      description: g[1],
      subject: g[2],
      coverColor: pick(COVER_COLORS),
      publicVisible: chance(0.65),
      inviteCode,
      members,
      createdAt: daysAgo(rand(5, 120)),
      updatedAt: daysAgo(rand(0, 10)),
    }
  })

  await db.collection('groups').insertMany(groups)
  console.log(`🏠 Đã tạo ${groups.length} groups`)

  // ── TASKS ─────────────────────────────────────────────
  const TASK_TITLES = {
    CNTT: ['Thiết kế database schema', 'Viết API đăng nhập', 'Tối ưu query MongoDB', 'Cấu hình JWT Auth', 'Deploy lên VPS'],
    'Lập trình': ['Code giao diện', 'Sửa bug component', 'Làm bài DSA', 'Viết README', 'Test responsive'],
    'AI/ML': ['Train model', 'Chuẩn hóa dữ liệu', 'Tuning hyperparameters', 'Đánh giá accuracy', 'Tích hợp API AI'],
    'Tiếng Anh': ['Luyện Speaking', 'Viết Task 2', 'Học 50 từ mới', 'Mock test Listening', 'Chữa bài Writing'],
    IELTS: ['Làm đề Reading', 'Ôn collocations', 'Chữa Speaking Part 2', 'Viết essay band 6.5', 'Nghe BBC 30 phút'],
    TOEIC: ['Làm mini test', 'Ôn part 5', 'Luyện nghe part 2', 'Đọc bài báo ngắn', 'Tổng hợp từ vựng'],
    Toán: ['Làm 20 bài tích phân', 'Ôn xác suất', 'Tổng hợp công thức', 'Chữa đề thi thử', 'Học ma trận'],
    'Vật lý': ['Ôn công thức điện xoay chiều', 'Giải bài dao động', 'Tóm tắt lý thuyết', 'Làm đề thử', 'Chữa bài tập'],
    'Hóa học': ['Ôn phản ứng hữu cơ', 'Làm bài tập este', 'Sơ đồ phản ứng', 'Tổng hợp lý thuyết', 'Chữa đề kiểm tra'],
    'Sinh học': ['Ôn di truyền', 'Làm câu hỏi trắc nghiệm', 'Tổng hợp sơ đồ', 'Học sinh thái', 'Ôn tế bào'],
    'Ngữ văn': ['Viết đoạn nghị luận', 'Học tác phẩm trọng tâm', 'Phân tích nhân vật', 'Luyện mở bài', 'Chữa bài viết'],
    'Lịch sử': ['Tóm tắt mốc thời gian', 'Làm đề trắc nghiệm', 'Ôn chuyên đề', 'Tổng hợp sự kiện', 'Học sơ đồ tư duy'],
    THPT: ['Lập kế hoạch ôn thi', 'Làm đề tổng hợp', 'Chia môn yếu', 'Ôn 1 chương', 'Chữa đề'],
    'Đại học': ['Làm bài tập nhóm', 'Soạn slide', 'Viết báo cáo', 'Chuẩn bị thuyết trình', 'Tìm tài liệu'],
  }

  const tasks = []

  for (const g of groups) {
    const subjectTasks = TASK_TITLES[g.subject] || TASK_TITLES['Đại học']
    const count = rand(6, 12)

    for (let i = 0; i < count; i++) {
      const assignedMember = chance(0.8) ? pick(g.members) : null
      const status = pick(['TODO', 'IN_PROGRESS', 'DONE'])
      const label = pick(['Frontend', 'Backend', 'AI/ML', 'Ôn tập', 'Writing', 'Báo cáo', 'Thảo luận'])
      const labelColor = pick(COVER_COLORS)

      tasks.push({
        _id: id(),
        groupId: g._id.toString(),
        title: pick(subjectTasks),
        description: `Nhiệm vụ dành cho nhóm ${g.name}. Hoàn thành đúng hạn để theo dõi tiến độ chung.`,
        status,
        priority: pick(['LOW', 'MEDIUM', 'HIGH']),
        label,
        labelColor,
        assigneeId: assignedMember?.userId ?? null,
        assigneeName: assignedMember?.fullName ?? null,
        deadline: chance(0.8) ? future(rand(1, 15)) : daysAgo(rand(1, 8)),
        createdById: g.members[0].userId,
        comments: [],
        createdAt: daysAgo(rand(1, 30)),
      })
    }
  }

  await db.collection('tasks').insertMany(tasks)
  console.log(`✅ Đã tạo ${tasks.length} tasks`)

  // ── CHAT MESSAGES ─────────────────────────────────────
  const chats = []
  const AI_CONTENT = [
    'Mình gợi ý chia task theo mức độ khó để nhóm dễ theo dõi hơn.',
    'Bạn có thể bắt đầu từ phần nền tảng rồi mới làm bài nâng cao.',
    'Đây là tóm tắt ngắn của tài liệu vừa được hỏi trong nhóm.',
    'Hãy thử áp dụng phương pháp học Pomodoro 25-5.',
  ]

  for (const g of groups) {
    const count = rand(12, 24)
    for (let i = 0; i < count; i++) {
      const isAI = chance(0.15)
      if (isAI) {
        chats.push({
          _id: id(),
          groupId: g._id.toString(),
          senderId: 'AI',
          senderName: 'StudyMate AI',
          content: pick(AI_CONTENT),
          type: 'AI',
          createdAt: hoursAgo(rand(1, 200)),
        })
      } else {
        const sender = pick(g.members)
        chats.push({
          _id: id(),
          groupId: g._id.toString(),
          senderId: sender.userId,
          senderName: sender.fullName,
          content: pick([
            'Team ơi tối nay học không?',
            'Mình vừa upload tài liệu lên rồi nha.',
            'Phần này ai hiểu giải thích giúp mình với.',
            'Deadline task sắp tới rồi nhé mọi người.',
            'Mình vừa làm xong phần của mình.',
            'Cuối tuần mình họp nhóm được không?',
            'Ai rảnh chữa bài này giúp mình.',
          ]),
          type: 'USER',
          createdAt: hoursAgo(rand(1, 240)),
        })
      }
    }
  }

  await db.collection('chat_messages').insertMany(chats)
  console.log(`💬 Đã tạo ${chats.length} chat messages`)

  // ── DIRECT MESSAGES ───────────────────────────────────
  const dms = []
  for (let i = 0; i < 260; i++) {
    const [a, b] = sample(users, 2)
    dms.push({
      _id: id(),
      senderId: a._id.toString(),
      receiverId: b._id.toString(),
      content: pick([
        'Bạn ơi mình thấy bạn học môn này ổn, giúp mình với được không?',
        'Tối nay có học không?',
        'Mình gửi bạn tài liệu rồi nha.',
        'Bạn có muốn vào nhóm học của mình không?',
        'Mình đang cần partner luyện Speaking.',
        'Bài này mình làm chưa ra 😭',
        'Cảm ơn bạn nhiều nhé!',
      ]),
      type: 'TEXT',
      readAt: chance(0.7) ? hoursAgo(rand(1, 48)) : null,
      createdAt: hoursAgo(rand(1, 200)),
    })
  }

  await db.collection('direct_messages').insertMany(dms)
  console.log(`📩 Đã tạo ${dms.length} direct messages`)

  // ── POSTS ─────────────────────────────────────────────
  const posts = []
  const postTypes = ['text', 'image', 'video', 'short']

  for (let i = 0; i < 120; i++) {
    const author = pick(users)
    const type = pick(postTypes)
    const subject = pick(author.strongSubjects?.length ? author.strongSubjects : SUBJECTS)
    const likedCount = rand(0, 18)
    const savedCount = rand(0, 8)
    const commentCount = rand(0, 5)
    const hasSummary = chance(0.35)

    let imageUrls = []
    let videoUrl = ''
    let coverImage = ''

    if (type === 'image') {
      imageUrls = sample(SAMPLE_IMAGES, rand(1, 3))
    } else if (type === 'video') {
      videoUrl = pick(SAMPLE_VIDEOS)
    } else if (type === 'short' && chance(0.5)) {
      imageUrls = sample(SAMPLE_IMAGES, 1)
    }

    if (!imageUrls.length && !videoUrl && chance(0.12)) {
      coverImage = pick(SAMPLE_IMAGES)
    }

    posts.push({
      _id: id(),
      authorId: author._id.toString(),
      authorName: author.fullName,
      authorAvatar: author.avatar ?? null,
      title: generatePostTitle(type, subject),
      content: generatePostContent(type, subject),
      summary: hasSummary
        ? pick([
            `Tóm tắt ngắn về ${subject}: bài viết chia sẻ cách học, tài liệu hoặc kinh nghiệm thực tế.`,
            `Bài viết nói về ${subject} theo hướng dễ nhớ và dễ áp dụng.`,
            `Nội dung tập trung vào mẹo học ${subject} và cách ôn hiệu quả hơn.`,
          ])
        : '',
      tags: sample(
        [...new Set([subject, ...sample(SUBJECTS, rand(1, 3))])],
        rand(1, 4),
      ),
      imageUrls,
      videoUrl,
      coverImage,
      likedBy: makeLikes(users, likedCount),
      savedBy: makeSaved(users, savedCount),
      views: rand(30, 3000),
      comments: makeComments(users, commentCount),
      published: true,
      createdAt: hoursAgo(rand(2, 24 * 25)),
      updatedAt: hoursAgo(rand(1, 48)),
    })
  }

  await db.collection('posts').insertMany(posts)
  console.log(`📝 Đã tạo ${posts.length} posts`)

  // ── DOCUMENTS ─────────────────────────────────────────
  const documents = []
  for (const g of sample(groups, 16)) {
    const count = rand(2, 5)
    for (let i = 0; i < count; i++) {
      const uploader = pick(g.members)
      documents.push({
        _id: id(),
        groupId: g._id.toString(),
        uploadedBy: uploader.userId,
        uploadedByName: uploader.fullName,
        fileName: pick([
          `slides-${slug(g.subject)}-${i + 1}.pdf`,
          `note-${slug(g.subject)}-${i + 1}.docx`,
          `summary-${slug(g.subject)}-${i + 1}.pdf`,
        ]),
        fileUrl: `/uploads/doc-${slug(g.subject)}-${i + 1}.pdf`,
        fileType: pick(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
        size: rand(150000, 3500000),
        createdAt: daysAgo(rand(1, 20)),
      })
    }
  }

  if (documents.length) {
    await db.collection('documents').insertMany(documents)
  }
  console.log(`📄 Đã tạo ${documents.length} documents`)

  // ── NOTIFICATIONS ─────────────────────────────────────
  const notifications = []
  const notifTypes = ['TASK_DONE', 'CHAT_MESSAGE', 'FRIEND_REQUEST', 'POST_LIKED', 'TASK_DEADLINE']

  for (const u of sample(users, 90)) {
    const count = rand(2, 7)
    for (let i = 0; i < count; i++) {
      notifications.push({
        _id: id(),
        userId: u._id.toString(),
        title: pick([
          'Có người vừa thích bài viết của bạn',
          'Bạn có tin nhắn mới',
          'Task sắp đến hạn',
          'Có lời mời kết bạn mới',
          'Một thành viên đã hoàn thành task',
        ]),
        body: pick([
          'Kiểm tra ngay để không bỏ lỡ cập nhật mới.',
          'Một hoạt động mới vừa diễn ra liên quan đến bạn.',
          'Bạn nên vào hệ thống để xem chi tiết.',
          'Nhóm của bạn vừa có cập nhật mới.',
          'Có người vừa tương tác với nội dung của bạn.',
        ]),
        type: pick(notifTypes),
        read: chance(0.55),
        createdAt: hoursAgo(rand(1, 120)),
      })
    }
  }

  await db.collection('notifications').insertMany(notifications)
  console.log(`🔔 Đã tạo ${notifications.length} notifications`)

  // ── INDEXES ────────────────────────────────────────────
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('groups').createIndex({ inviteCode: 1 }, { unique: true })
  await db.collection('groups').createIndex({ publicVisible: 1, createdAt: -1 })
  await db.collection('groups').createIndex({ 'members.userId': 1 })
  await db.collection('tasks').createIndex({ groupId: 1, status: 1 })
  await db.collection('chat_messages').createIndex({ groupId: 1, createdAt: -1 })
  await db.collection('direct_messages').createIndex({ senderId: 1, receiverId: 1, createdAt: -1 })
  await db.collection('posts').createIndex({ published: 1, createdAt: -1 })
  await db.collection('posts').createIndex({ tags: 1 })
  await db.collection('posts').createIndex({ likedBy: 1 })
  await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 })
  console.log('🔍 Đã tạo indexes')

  await client.close()

  console.log('\n🎉 SEED HOÀN THÀNH!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`👥 ${users.length} users`)
  console.log(`🤝 ${friendships.length} friendships`)
  console.log(`🏠 ${groups.length} groups`)
  console.log(`✅ ${tasks.length} tasks`)
  console.log(`💬 ${chats.length} chat messages`)
  console.log(`📩 ${dms.length} direct messages`)
  console.log(`📝 ${posts.length} blog posts`)
  console.log(`📄 ${documents.length} documents`)
  console.log(`🔔 ${notifications.length} notifications`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Tất cả user password: Demo@2024!')
  console.log('Admin: admin@studymate.com / Admin@2024!')
}

seed().catch(err => {
  console.error('❌ Lỗi seed:', err)
  process.exit(1)
})