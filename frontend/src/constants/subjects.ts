export const SUBJECTS_CAP3 = [
  { id:'toan', name:'Toán',       weight:2 },
  { id:'van',  name:'Ngữ văn',    weight:1 },
  { id:'anh',  name:'Tiếng Anh',  weight:1 },
  { id:'ly',   name:'Vật lý',     weight:1 },
  { id:'hoa',  name:'Hóa học',    weight:1 },
  { id:'sinh', name:'Sinh học',   weight:1 },
  { id:'su',   name:'Lịch sử',    weight:1 },
  { id:'dia',  name:'Địa lý',     weight:1 },
  { id:'gdcd', name:'GDCD',       weight:1 },
  { id:'tin',  name:'Tin học',    weight:1 },
]

export const KHOI_THI = [
  { id:'A00', name:'Khối A00', subs:['toan','ly','hoa'], coeffs:[1,1,1] },
  { id:'A01', name:'Khối A01', subs:['toan','ly','anh'], coeffs:[1,1,1] },
  { id:'B00', name:'Khối B00', subs:['toan','hoa','sinh'], coeffs:[1,1,1] },
  { id:'C00', name:'Khối C00', subs:['van','su','dia'], coeffs:[1,1,1] },
  { id:'D01', name:'Khối D01', subs:['toan','van','anh'], coeffs:[1,1,1] },
  { id:'D07', name:'Khối D07', subs:['toan','hoa','anh'], coeffs:[1,1,1] },
  { id:'A16', name:'Khối A16', subs:['toan','ly','tin'], coeffs:[1,1,1] },
]

export const UU_TIEN_KV = [
  { value:0,    label:'Không (KV3)' },
  { value:0.25, label:'+0.25 (KV2)' },
  { value:0.5,  label:'+0.5 (KV2-NT)' },
  { value:0.75, label:'+0.75 (KV1)' },
]

export const UU_TIEN_DT = [
  { value:0,   label:'Không có' },
  { value:1.0, label:'+1.0 (ĐT1)' },
  { value:0.5, label:'+0.5 (ĐT2)' },
]

export const GPA_SCALE = [
  { min:9.0, gpa4:4.0, label:'Xuất sắc',      color:'#22c55e', threshold:9.0 },
  { min:8.0, gpa4:3.5, label:'Giỏi',           color:'#6366f1', threshold:8.0 },
  { min:7.0, gpa4:3.0, label:'Khá',            color:'#14b8a6', threshold:7.0 },
  { min:5.0, gpa4:2.0, label:'Trung bình',     color:'#f59e0b', threshold:5.0 },
  { min:0,   gpa4:1.0, label:'Yếu',            color:'#ef4444', threshold:0 },
]

export const UNIVERSITIES = [
  { name:'ĐH Bách Khoa HCM (CNTT)',  minScore:27.5, khoi:['A00','A01'],      region:'HCM' },
  { name:'ĐH KHTN HCM (CNTT)',       minScore:26.5, khoi:['A00','A01','D01'], region:'HCM' },
  { name:'ĐH Bách Khoa HN',          minScore:28.0, khoi:['A00','A01'],       region:'HN'  },
  { name:'ĐH Ngoại thương HCM',      minScore:26.5, khoi:['A01','D01'],       region:'HCM' },
  { name:'ĐH Kinh tế HCM',           minScore:24.0, khoi:['A00','D01'],       region:'HCM' },
  { name:'ĐH Y Dược HCM',            minScore:28.5, khoi:['B00'],             region:'HCM' },
  { name:'ĐH FPT (CNTT)',            minScore:22.0, khoi:['A00','A01','D01'], region:'HCM' },
  { name:'ĐH Tôn Đức Thắng',         minScore:21.5, khoi:['A00','A01'],       region:'HCM' },
  { name:'ĐH Luật HCM',              minScore:23.0, khoi:['C00','D01'],       region:'HCM' },
  { name:'ĐH Sư phạm HCM',           minScore:20.0, khoi:['A00','C00','D01'], region:'HCM' },
  { name:'ĐH Văn Lang',              minScore:18.0, khoi:['A00','A01','D01'], region:'HCM' },
  { name:'ĐH Công nghiệp HCM',       minScore:19.5, khoi:['A00','A01'],       region:'HCM' },
  { name:'ĐH Nông lâm HCM',          minScore:18.0, khoi:['A00','B00'],       region:'HCM' },
  { name:'ĐH RMIT Việt Nam',         minScore:24.0, khoi:['A01','D01'],       region:'HCM' },
  { name:'ĐH Công nghệ ĐHQG HN',    minScore:27.2, khoi:['A00','A01'],       region:'HN'  },
]
