// วิชา fallback สำหรับกรณียังไม่ได้ตั้งค่าโครงสร้างเวลาเรียน
export const FALLBACK_SUBJECTS = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "เศรษฐศาสตร์",
  "ประวัติศาสตร์",
  "พระพุทธศาสนา",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "ภาษาอังกฤษ",
  "ภาษาบาลี",
  "ภาษาอังกฤษเพื่อการสื่อสาร",
  "หน้าที่พลเมือง",
  "กระทู้ธรรม",
  "ป้องกันการทุจริต",
  "คอมพิวเตอร์",
  "ภูมิศาสตร์",
  "ล้านนา"
];

export const GRADES = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

export const TERMS = ["เทอม 1", "เทอม 2"];

// Helper: ดึงวิชาจาก curriculum data ตามเทอมที่เลือก (unique ชื่อวิชา)
export function getSubjectsByTerm(curriculum, term) {
  if (!curriculum || curriculum.length === 0) return FALLBACK_SUBJECTS;
  const filtered = curriculum.filter(row => row.เทอม === term);
  const unique = [...new Set(filtered.map(row => row.ชื่อวิชา))];
  return unique.length > 0 ? unique : FALLBACK_SUBJECTS;
}

// Helper: ดึงเทอมทั้งหมดจาก curriculum
export function getTermsFromCurriculum(curriculum) {
  if (!curriculum || curriculum.length === 0) return TERMS;
  const unique = [...new Set(curriculum.map(row => row.เทอม))];
  return unique.length > 0 ? unique.sort() : TERMS;
}

// Helper: ดึงวิชาทั้งหมด (unique) จาก curriculum
export function getAllSubjectsFromCurriculum(curriculum) {
  if (!curriculum || curriculum.length === 0) return FALLBACK_SUBJECTS;
  const unique = [...new Set(curriculum.map(row => row.ชื่อวิชา))];
  return unique.length > 0 ? unique : FALLBACK_SUBJECTS;
}
