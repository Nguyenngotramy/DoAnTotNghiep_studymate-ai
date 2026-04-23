export const GPA4_TABLE = [
  { min: 9.0, gpa4: 4.0, label: 'Xuất sắc' },
  { min: 8.5, gpa4: 3.7, label: 'Giỏi' },
  { min: 8.0, gpa4: 3.5, label: 'Giỏi' },
  { min: 7.5, gpa4: 3.2, label: 'Khá' },
  { min: 7.0, gpa4: 3.0, label: 'Khá' },
  { min: 6.5, gpa4: 2.7, label: 'Trung bình khá' },
  { min: 6.0, gpa4: 2.5, label: 'Trung bình khá' },
  { min: 5.5, gpa4: 2.2, label: 'Trung bình' },
  { min: 5.0, gpa4: 2.0, label: 'Trung bình' },
  { min: 0,   gpa4: 1.0, label: 'Yếu' },
]

export const getGrade = (gpa10: number) =>
  GPA4_TABLE.find(g => gpa10 >= g.min) ?? GPA4_TABLE[GPA4_TABLE.length - 1]

export const KHOI_THI = [
  { id: 'A00', name: 'Khối A00', subjects: ['Toán','Vật lý','Hóa học'] },
  { id: 'A01', name: 'Khối A01', subjects: ['Toán','Vật lý','Tiếng Anh'] },
  { id: 'B00', name: 'Khối B00', subjects: ['Toán','Hóa học','Sinh học'] },
  { id: 'C00', name: 'Khối C00', subjects: ['Ngữ văn','Lịch sử','Địa lý'] },
  { id: 'D01', name: 'Khối D01', subjects: ['Toán','Ngữ văn','Tiếng Anh'] },
  { id: 'A16', name: 'Khối A16', subjects: ['Toán','Vật lý','Tin học'] },
]
