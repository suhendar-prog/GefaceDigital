
import { AttendanceRecord, AppSettings, StudentInfo, TeacherInfo, Subject, ScheduleItem, LearningMaterial, Assignment, StudentGrade, ClassAttendanceSession } from '../types';

const STORAGE_KEY = 'geoface_attendance_records';
const SETTINGS_KEY = 'geoface_settings';
const STUDENTS_KEY = 'geoface_students';
const TEACHERS_KEY = 'geoface_teachers';

// Learning Keys
const SUBJECTS_KEY = 'geoface_subjects';
const SCHEDULE_KEY = 'geoface_schedule';
const MATERIALS_KEY = 'geoface_materials';
const ASSIGNMENTS_KEY = 'geoface_assignments';
const GRADES_KEY = 'geoface_grades';
const CLASS_ATTENDANCE_KEY = 'geoface_class_attendance';

// --- Attendance ---

export const saveAttendance = (record: AttendanceRecord): void => {
  const existing = getAttendanceRecords();
  const updated = [record, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateAttendanceRecord = (id: string, updates: Partial<AttendanceRecord>): void => {
  const existing = getAttendanceRecords();
  const index = existing.findIndex(r => r.id === id);
  if (index !== -1) {
    existing[index] = { ...existing[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
};

export const getAttendanceRecords = (): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearRecords = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// --- Students ---

export const getStudents = (): StudentInfo[] => {
  const data = localStorage.getItem(STUDENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveStudent = (student: StudentInfo): void => {
  const existing = getStudents();
  if (existing.find(s => s.id === student.id)) {
    throw new Error(`Student ID ${student.id} already exists.`);
  }
  const updated = [...existing, student];
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(updated));
};

export const updateStudent = (originalId: string, updatedStudent: StudentInfo): void => {
  const existing = getStudents();
  const index = existing.findIndex(s => s.id === originalId);
  
  if (index === -1) {
    throw new Error(`Student ID ${originalId} not found.`);
  }

  // Check collision if ID changed
  if (originalId !== updatedStudent.id && existing.some(s => s.id === updatedStudent.id)) {
       throw new Error(`Student ID ${updatedStudent.id} already exists.`);
  }

  existing[index] = updatedStudent;
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(existing));
};

export const deleteStudent = (id: string): void => {
  const existing = getStudents();
  const updated = existing.filter(s => s.id !== id);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(updated));
};

export const bulkImportStudents = (students: StudentInfo[]): number => {
  const existing = getStudents();
  const existingIds = new Set(existing.map(s => s.id));
  const newStudents: StudentInfo[] = [];

  students.forEach(s => {
    if (!existingIds.has(s.id)) {
      newStudents.push(s);
      existingIds.add(s.id);
    }
  });

  if (newStudents.length > 0) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify([...existing, ...newStudents]));
  }
  return newStudents.length;
};

// --- Teachers ---

export const getTeachers = (): TeacherInfo[] => {
  const data = localStorage.getItem(TEACHERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTeacher = (teacher: TeacherInfo): void => {
  const existing = getTeachers();
  if (existing.find(t => t.nip === teacher.nip)) {
    throw new Error(`Teacher NIP ${teacher.nip} already exists.`);
  }
  const updated = [...existing, teacher];
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(updated));
};

export const updateTeacher = (originalId: string, updatedTeacher: TeacherInfo): void => {
  const existing = getTeachers();
  const index = existing.findIndex(t => t.id === originalId);
  
  if (index === -1) {
    throw new Error(`Teacher not found.`);
  }

  // Check collision if NIP changed
  if (existing[index].nip !== updatedTeacher.nip && existing.some(t => t.nip === updatedTeacher.nip)) {
       throw new Error(`Teacher NIP ${updatedTeacher.nip} already exists.`);
  }

  existing[index] = updatedTeacher;
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(existing));
};

export const deleteTeacher = (id: string): void => {
  const existing = getTeachers();
  const updated = existing.filter(t => t.id !== id);
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(updated));
};

export const bulkDeleteTeachers = (ids: string[]): void => {
  const existing = getTeachers();
  const idSet = new Set(ids);
  const updated = existing.filter(t => !idSet.has(t.id));
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(updated));
};

export const bulkImportTeachers = (teachers: TeacherInfo[]): number => {
  const existing = getTeachers();
  const existingNips = new Set(existing.map(t => t.nip));
  const newTeachers: TeacherInfo[] = [];

  teachers.forEach(t => {
    if (!existingNips.has(t.nip)) {
      newTeachers.push(t);
      existingNips.add(t.nip);
    }
  });

  if (newTeachers.length > 0) {
    localStorage.setItem(TEACHERS_KEY, JSON.stringify([...existing, ...newTeachers]));
  }
  return newTeachers.length;
};

// --- Learning Module Storage Helpers ---

function getList<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveItem<T>(key: string, item: T): void {
  const list = getList<T>(key);
  // @ts-ignore
  const updated = [...list, item];
  localStorage.setItem(key, JSON.stringify(updated));
}

function deleteItem<T>(key: string, id: string): void {
  const list = getList<T>(key);
  // @ts-ignore
  const updated = list.filter(i => i.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));
}

// Subjects
export const getSubjects = () => getList<Subject>(SUBJECTS_KEY);
export const saveSubject = (item: Subject) => saveItem(SUBJECTS_KEY, item);
export const deleteSubject = (id: string) => deleteItem(SUBJECTS_KEY, id);

// Schedule
export const getSchedule = () => getList<ScheduleItem>(SCHEDULE_KEY);
export const saveScheduleItem = (item: ScheduleItem) => saveItem(SCHEDULE_KEY, item);
export const deleteScheduleItem = (id: string) => deleteItem(SCHEDULE_KEY, id);

// Materials
export const getMaterials = () => getList<LearningMaterial>(MATERIALS_KEY);
export const saveMaterial = (item: LearningMaterial) => saveItem(MATERIALS_KEY, item);
export const deleteMaterial = (id: string) => deleteItem(MATERIALS_KEY, id);

// Assignments
export const getAssignments = () => getList<Assignment>(ASSIGNMENTS_KEY);
export const saveAssignment = (item: Assignment) => saveItem(ASSIGNMENTS_KEY, item);
export const deleteAssignment = (id: string) => deleteItem(ASSIGNMENTS_KEY, id);

// Grades
export const getGrades = () => getList<StudentGrade>(GRADES_KEY);
export const saveGrade = (item: StudentGrade) => saveItem(GRADES_KEY, item);
export const deleteGrade = (id: string) => deleteItem(GRADES_KEY, id);

// Class Attendance
export const getClassAttendance = () => getList<ClassAttendanceSession>(CLASS_ATTENDANCE_KEY);
export const deleteClassAttendance = (id: string) => deleteItem(CLASS_ATTENDANCE_KEY, id);
export const saveClassAttendance = (item: ClassAttendanceSession) => {
  const list = getClassAttendance();
  // Update if exists (same date/class/subject)
  const index = list.findIndex(s => s.id === item.id || (s.date === item.date && s.className === item.className && s.subjectId === item.subjectId));
  if (index !== -1) {
    list[index] = { ...item, id: list[index].id };
    localStorage.setItem(CLASS_ATTENDANCE_KEY, JSON.stringify(list));
  } else {
    saveItem(CLASS_ATTENDANCE_KEY, item);
  }
};

// --- Settings ---

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) return JSON.parse(data);
  
  // Default Settings (Example: Monas, Jakarta)
  return {
    schoolName: "Sekolah Digital Indonesia",
    schoolLat: -6.175392,
    schoolLng: 106.827153,
    radiusMeters: 200,
    startTime: "07:00",
    endTime: "15:00",
    schoolLogo: '',
    telegramBotToken: '', // Empty by default
    notificationTiming: 'immediate',
    notificationTemplate: "Hello, this is to inform you that {student_name} has arrived at {school_name} at {time} on {date}.",
    notificationSound: 'default',
    customSoundData: ''
  };
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- Seeding ---

export const seedDatabase = () => {
  // Seed Attendance
  if (getAttendanceRecords().length === 0) {
    const settings = getSettings();
    const dummyData: AttendanceRecord[] = [
      {
        id: 'rec_1',
        studentId: 'STU001',
        studentName: 'Ahmad Santoso',
        timestamp: Date.now() - 3600000,
        location: { 
          latitude: settings.schoolLat, 
          longitude: settings.schoolLng, 
          accuracy: 10, 
          timestamp: Date.now() 
        },
        selfieUrl: 'https://picsum.photos/200/200',
        verificationStatus: 'verified',
        verificationNote: 'Face match confirmed'
      },
      {
        id: 'rec_2',
        studentId: 'STU002',
        studentName: 'Siti Aminah',
        timestamp: Date.now() - 7200000,
        location: { 
          latitude: settings.schoolLat + 0.002, 
          longitude: settings.schoolLng + 0.002, 
          accuracy: 15, 
          timestamp: Date.now() 
        },
        selfieUrl: 'https://picsum.photos/201/201',
        verificationStatus: 'pending',
        verificationNote: 'Low lighting'
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dummyData));
  }

  // Seed Students
  if (getStudents().length === 0) {
    const dummyStudents: StudentInfo[] = [
      { id: 'STU001', name: 'Ahmad Santoso', class: '12-IPA-1', parentWhatsapp: '628123456789', telegramChatId: '12345' },
      { id: 'STU002', name: 'Siti Aminah', class: '12-IPA-1' },
      { id: 'STU003', name: 'Budi Hartono', class: '12-IPS-2', parentWhatsapp: '628987654321' },
      { id: 'STU004', name: 'Dewi Sartika', class: '11-IPA-3' },
    ];
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(dummyStudents));
  }

  // Seed Teachers
  if (getTeachers().length === 0) {
    const dummyTeachers: TeacherInfo[] = [
      { id: 'TCH001', nip: '198501012010011001', name: 'Dr. Budi Santoso', subject: 'Matematika', phone: '08123456789' },
      { id: 'TCH002', nip: '199002022015022002', name: 'Sari Indah, S.Pd', subject: 'Bahasa Indonesia', phone: '08198765432' },
      { id: 'TCH003', nip: '198803032012031003', name: 'Joko Widodo, M.Si', subject: 'Fisika' },
    ];
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(dummyTeachers));
  }

  // Seed Learning Module
  if (getSubjects().length === 0) {
    const dummySubjects: Subject[] = [
      { id: 'SUB01', name: 'Matematika', code: 'MTK' },
      { id: 'SUB02', name: 'Bahasa Indonesia', code: 'BIND' },
      { id: 'SUB03', name: 'Fisika', code: 'FIS' },
      { id: 'SUB04', name: 'Bahasa Inggris', code: 'BING' }
    ];
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(dummySubjects));

    const dummySchedule: ScheduleItem[] = [
      { id: 'SCH01', subjectId: 'SUB01', className: '12-IPA-1', day: 'Monday', startTime: '08:00', endTime: '09:30' },
      { id: 'SCH02', subjectId: 'SUB03', className: '12-IPA-1', day: 'Monday', startTime: '10:00', endTime: '11:30' }
    ];
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(dummySchedule));
  }
};
