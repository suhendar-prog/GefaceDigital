
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  class?: string;
  parentWhatsapp?: string;
  telegramChatId?: string;
}

export interface TeacherInfo {
  id: string;
  nip: string; // Nomor Induk Pegawai
  name: string;
  subject?: string;
  phone?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: number;
  location: LocationData;
  selfieUrl: string; // Base64
  verificationStatus: 'verified' | 'pending' | 'rejected';
  verificationNote?: string;
}

export interface AppSettings {
  schoolName: string;
  schoolLat: number;
  schoolLng: number;
  radiusMeters: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  schoolLogo?: string; // Base64 image string
  telegramBotToken?: string;
  notificationTiming: 'immediate' | 'daily_summary';
  notificationTemplate: string;
  notificationSound: 'default' | 'chime' | 'alert' | 'custom';
  customSoundData?: string;
}

export enum AppView {
  LANDING = 'LANDING',
  STUDENT_CHECKIN = 'STUDENT_CHECKIN',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
}

// --- Learning Module Types ---

export interface Subject {
  id: string;
  name: string;
  code?: string;
}

export interface ScheduleItem {
  id: string;
  subjectId: string;
  className: string;
  day: string; // "Monday", "Tuesday", etc.
  startTime: string;
  endTime: string;
}

export interface LearningMaterial {
  id: string;
  subjectId: string;
  className: string;
  title: string;
  type: 'link' | 'file';
  content: string; // URL or Base64
  description?: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  className: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
}

export interface StudentGrade {
  id: string;
  studentId: string;
  subjectId: string;
  assignmentId?: string;
  type: 'daily' | 'assignment' | 'midterm' | 'final';
  score: number;
  date: string;
}

export interface ClassAttendanceSession {
  id: string;
  className: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  records: { studentId: string; status: 'H' | 'S' | 'I' | 'A' }[];
}
