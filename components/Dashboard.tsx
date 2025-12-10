
import React, { useEffect, useState, useRef } from 'react';
import { 
  getAttendanceRecords, clearRecords, getSettings, saveSettings, 
  getStudents, saveStudent, updateStudent, deleteStudent, bulkImportStudents, updateAttendanceRecord,
  getTeachers, saveTeacher, updateTeacher, deleteTeacher, bulkDeleteTeachers, bulkImportTeachers,
  getSubjects, saveSubject, deleteSubject,
  getSchedule, saveScheduleItem, deleteScheduleItem,
  getMaterials, saveMaterial, deleteMaterial,
  getAssignments, saveAssignment, deleteAssignment,
  getGrades, saveGrade, deleteGrade,
  getClassAttendance, saveClassAttendance, deleteClassAttendance
} from '../services/storage';
import { AttendanceRecord, AppSettings, StudentInfo, TeacherInfo, Subject, ScheduleItem, LearningMaterial, Assignment, StudentGrade, ClassAttendanceSession } from '../types';
import { 
  MapPin, UserCheck, Search, Trash2, LogOut, Download, Settings, 
  LayoutDashboard, Lock, Save, AlertTriangle, Users, Plus, FileSpreadsheet, X, Filter, Calendar, MessageCircle, Send, Bell, Edit, Volume2, Play, Upload, BarChart as BarChartIcon, Clock, Image as ImageIcon,
  BookOpen, FileText, ClipboardList, GraduationCap, Clock as ClockIcon, Briefcase
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  onBack: () => void;
}

// Haversine formula to calculate distance in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Base64 Audio Placeholders
const PREDEFINED_SOUNDS = {
  // Simple "Ding"
  default: "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  // Soft Chime (Truncated for brevity, normally a real base64 string)
  chime: "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAAA",
  // Alert Beep
  alert: "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" 
};

type TabType = 'overview' | 'attendance' | 'students' | 'teachers' | 'recap' | 'learning' | 'settings';
type LearningTabType = 'subjects' | 'schedule' | 'materials' | 'assignments' | 'grades' | 'attendance' | 'recap';

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeLearningTab, setActiveLearningTab] = useState<LearningTabType>('subjects');
  
  // Data State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  
  // Learning Data State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [classAttendance, setClassAttendance] = useState<ClassAttendanceSession[]>([]);

  // Student Management State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newParentWhatsapp, setNewParentWhatsapp] = useState('');
  const [newTelegramChatId, setNewTelegramChatId] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teacher Management State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [newTeacherNip, setNewTeacherNip] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  // Learning Inputs State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const [scheduleDay, setScheduleDay] = useState('Monday');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('09:30');
  const [scheduleClass, setScheduleClass] = useState('');

  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'link' | 'file'>('link');
  const [materialContent, setMaterialContent] = useState('');
  
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [gradeType, setGradeType] = useState<'daily' | 'assignment' | 'midterm' | 'final'>('daily');

  // Recap State
  const [recapMonth, setRecapMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Settings State
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);

  // Maps Modal
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);

  const refreshData = () => {
    setRecords(getAttendanceRecords());
    setStudents(getStudents());
    setTeachers(getTeachers());
    setSettings(getSettings());
    setTempSettings(getSettings());
    
    // Refresh Learning Data
    setSubjects(getSubjects());
    setSchedule(getSchedule());
    setMaterials(getMaterials());
    setAssignments(getAssignments());
    setGrades(getGrades());
    setClassAttendance(getClassAttendance());
    
    // Reset selections
    setSelectedTeacherIds(new Set());
  };

  useEffect(() => {
    refreshData();
    // Auto-refresh attendance records every 60 seconds
    const intervalId = setInterval(() => {
      setRecords(getAttendanceRecords());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Invalid Password');
    }
  };

  // --- Student Management Handlers ---

  const handleOpenStudentModal = (student?: StudentInfo) => {
    if (student) {
      setEditingId(student.id);
      setNewStudentId(student.id);
      setNewStudentName(student.name);
      setNewStudentClass(student.class || '');
      setNewParentWhatsapp(student.parentWhatsapp || '');
      setNewTelegramChatId(student.telegramChatId || '');
    } else {
      setEditingId(null);
      setNewStudentId('');
      setNewStudentName('');
      setNewStudentClass('');
      setNewParentWhatsapp('');
      setNewTelegramChatId('');
    }
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentId && newStudentName) {
      try {
        const studentData: StudentInfo = {
          id: newStudentId,
          name: newStudentName,
          class: newStudentClass,
          parentWhatsapp: newParentWhatsapp,
          telegramChatId: newTelegramChatId
        };

        if (editingId) {
          updateStudent(editingId, studentData);
        } else {
          saveStudent(studentData);
        }

        setIsStudentModalOpen(false);
        refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudent(id);
      refreshData();
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const importedStudents: StudentInfo[] = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const [id, name, className, whatsapp, telegram] = line.split(',');
            if (id && name) {
              importedStudents.push({
                id: id.trim(),
                name: name.trim(),
                class: className?.trim(),
                parentWhatsapp: whatsapp?.trim(),
                telegramChatId: telegram?.trim()
              });
            }
          }
        }
        const count = bulkImportStudents(importedStudents);
        alert(`Successfully imported ${count} new students.`);
        refreshData();
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Student ID,Full Name,Class,Parent WhatsApp,Telegram Chat ID\nSTU001,John Doe,12-IPA-1,628123456789,123456789";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Teacher Management Handlers ---

  const handleOpenTeacherModal = (teacher?: TeacherInfo) => {
    if (teacher) {
      setEditingTeacherId(teacher.id);
      setNewTeacherNip(teacher.nip);
      setNewTeacherName(teacher.name);
      setNewTeacherSubject(teacher.subject || '');
      setNewTeacherPhone(teacher.phone || '');
    } else {
      setEditingTeacherId(null);
      setNewTeacherNip('');
      setNewTeacherName('');
      setNewTeacherSubject('');
      setNewTeacherPhone('');
    }
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherNip && newTeacherName) {
      try {
        const teacherData: TeacherInfo = {
          id: editingTeacherId || uuidv4(),
          nip: newTeacherNip,
          name: newTeacherName,
          subject: newTeacherSubject,
          phone: newTeacherPhone
        };

        if (editingTeacherId) {
          updateTeacher(editingTeacherId, teacherData);
        } else {
          saveTeacher(teacherData);
        }

        setIsTeacherModalOpen(false);
        refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleDeleteTeacher = (id: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      deleteTeacher(id);
      refreshData();
    }
  };

  const handleSelectAllTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTeacherIds(new Set(teachers.map(t => t.id)));
    } else {
      setSelectedTeacherIds(new Set());
    }
  };

  const handleToggleTeacherSelection = (id: string) => {
    const newSet = new Set(selectedTeacherIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTeacherIds(newSet);
  };

  const handleBulkDeleteTeachers = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTeacherIds.size} teachers?`)) {
      bulkDeleteTeachers(Array.from(selectedTeacherIds));
      setSelectedTeacherIds(new Set());
      refreshData();
    }
  };

  const handleImportTeachersCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const importedTeachers: TeacherInfo[] = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const [nip, name, subject, phone] = line.split(',');
            if (nip && name) {
              importedTeachers.push({
                id: uuidv4(),
                nip: nip.trim(),
                name: name.trim(),
                subject: subject?.trim(),
                phone: phone?.trim()
              });
            }
          }
        }
        const count = bulkImportTeachers(importedTeachers);
        alert(`Successfully imported ${count} new teachers.`);
        refreshData();
      };
      reader.readAsText(file);
    }
    // Reset input
    if (teacherFileInputRef.current) teacherFileInputRef.current.value = '';
  };

  const handleDownloadTeacherTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,NIP,Full Name,Subject,Phone\n1234567890,Dr. Budi Santoso,Matematika,08123456789";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "teacher_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Attendance Handlers ---
  
  const handleUpdateStatus = (id: string, status: 'verified' | 'rejected') => {
    updateAttendanceRecord(id, { verificationStatus: status });
    refreshData();
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Name,Date,Time,Status,Is Late,Minutes Late,Distance,Link Photo\n";
    
    records.forEach(r => {
      const date = new Date(r.timestamp).toLocaleDateString();
      const time = new Date(r.timestamp).toLocaleTimeString();
      const dist = calculateDistance(r.location.latitude, r.location.longitude, settings.schoolLat, settings.schoolLng).toFixed(0);
      
      const recordTime = new Date(r.timestamp);
      const [startHour, startMinute] = settings.startTime.split(':').map(Number);
      const limitTime = new Date(recordTime);
      limitTime.setHours(startHour, startMinute, 0, 0);
      
      const isLate = recordTime > limitTime;
      const minutesLate = isLate ? Math.floor((recordTime.getTime() - limitTime.getTime()) / 60000) : 0;

      csvContent += `${r.studentId},${r.studentName},${date},${time},${r.verificationStatus},${isLate ? 'Yes' : 'No'},${minutesLate},${dist}m,${r.id}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRecap = () => {
    const [year, month] = recapMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Header Row
    let header = "Student ID,Name,Class";
    for(let d=1; d<=daysInMonth; d++) {
      header += `,${d}`;
    }
    header += ",Hadir,Sakit,Ijin,Alpa,Percent\n";

    let csvBody = "";

    const filteredRecapStudents = classFilter === 'All' 
      ? students 
      : students.filter(s => s.class === classFilter);

    filteredRecapStudents.forEach(s => {
      let row = `${s.id},${s.name},${s.class || '-'}`;
      let presentCount = 0;
      let workingDaysCount = 0;

      for(let d=1; d<=daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        
        if (!isWeekend) workingDaysCount++;

        const dateStr = dateObj.toLocaleDateString();
        const hasRecord = records.find(r => 
          r.studentId === s.id && 
          new Date(r.timestamp).toLocaleDateString() === dateStr &&
          r.verificationStatus === 'verified'
        );

        if (hasRecord) {
           row += ",v";
           presentCount++;
        } else {
           row += isWeekend ? ",-" : ",x";
        }
      }
      
      const alpa = workingDaysCount - presentCount; // Simplified logic
      const percent = workingDaysCount > 0 ? ((presentCount / workingDaysCount) * 100).toFixed(0) : "0";

      row += `,${presentCount},0,0,${alpa},${percent}%`;
      csvBody += row + "\n";
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + header + csvBody);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recap_${recapMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Settings Handlers ---

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(tempSettings);
    setSettings(tempSettings);
    setIsSettingsSaved(true);
    setTimeout(() => setIsSettingsSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        alert("Image too large. Max 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempSettings({...tempSettings, schoolLogo: ev.target?.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  // Sound handlers
  const handlePlaySound = (type: string) => {
    const soundSrc = 
      type === 'custom' ? tempSettings.customSoundData :
      // @ts-ignore
      PREDEFINED_SOUNDS[type] || PREDEFINED_SOUNDS['default'];

    if (soundSrc) {
      new Audio(soundSrc).play().catch(e => alert("Error playing sound"));
    } else {
      alert("No sound data available.");
    }
  };

  const handleSoundFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        alert("File too large. Max 500KB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setTempSettings({ ...tempSettings, customSoundData: result, notificationSound: 'custom' });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Learning Module Handlers ---

  const handleAddSubject = () => {
    if (newSubjectName) {
      saveSubject({ id: uuidv4(), name: newSubjectName, code: newSubjectCode });
      setNewSubjectName('');
      setNewSubjectCode('');
      refreshData();
    }
  };

  const handleDeleteSubject = (id: string) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      deleteSubject(id);
      refreshData();
    }
  };

  const handleAddSchedule = () => {
    if (selectedSubjectId && scheduleClass && scheduleStart && scheduleEnd) {
      saveScheduleItem({
        id: uuidv4(),
        subjectId: selectedSubjectId,
        className: scheduleClass,
        day: scheduleDay,
        startTime: scheduleStart,
        endTime: scheduleEnd
      });
      refreshData();
    }
  };

  const handleDeleteSchedule = (id: string) => {
    if (window.confirm("Delete this schedule item?")) {
      deleteScheduleItem(id);
      refreshData();
    }
  };

  const handleAddMaterial = () => {
     if(selectedSubjectId && scheduleClass && materialTitle && materialContent) {
        saveMaterial({
          id: uuidv4(),
          subjectId: selectedSubjectId,
          className: scheduleClass,
          title: materialTitle,
          type: materialType,
          content: materialContent
        });
        setMaterialTitle('');
        setMaterialContent('');
        refreshData();
     }
  };

  const handleDeleteMaterial = (id: string) => {
     if(window.confirm("Delete this material?")) {
       deleteMaterial(id);
       refreshData();
     }
  };

  const handleAddAssignment = () => {
    if(selectedSubjectId && scheduleClass && assignmentTitle && assignmentDeadline) {
      saveAssignment({
        id: uuidv4(),
        subjectId: selectedSubjectId,
        className: scheduleClass,
        title: assignmentTitle,
        description: assignmentDesc,
        deadline: assignmentDeadline
      });
      setAssignmentTitle('');
      setAssignmentDesc('');
      setAssignmentDeadline('');
      refreshData();
    }
  };

  const handleDeleteAssignment = (id: string) => {
    if(window.confirm("Delete this assignment?")) {
      deleteAssignment(id);
      refreshData();
    }
  };

  const handleDeleteGrade = (id: string) => {
    if(window.confirm("Delete this grade record?")) {
      deleteGrade(id);
      refreshData();
    }
  }

  const handleDeleteClassAttendance = (id: string) => {
    if(window.confirm("Delete this attendance session?")) {
      deleteClassAttendance(id);
      refreshData();
    }
  }

  const handleSaveClassAttendance = () => {
    if (classFilter !== 'All' && selectedSubjectId && selectedDate) {
      const filteredSt = students.filter(s => s.class === classFilter);
      const records = filteredSt.map(s => {
        // @ts-ignore - Find existing status from DOM or State map. For simplicity, we grab radio value
        const el = document.querySelector(`input[name="status-${s.id}"]:checked`) as HTMLInputElement;
        return { studentId: s.id, status: (el?.value || 'H') as 'H'|'S'|'I'|'A' };
      });

      saveClassAttendance({
        id: uuidv4(),
        className: classFilter,
        subjectId: selectedSubjectId,
        date: selectedDate,
        records
      });
      alert("Class Attendance Saved");
      refreshData();
    }
  };

  const handleSaveGrades = () => {
    if (classFilter !== 'All' && selectedSubjectId && selectedDate) {
      const filteredSt = students.filter(s => s.class === classFilter);
      filteredSt.forEach(s => {
        const el = document.getElementById(`grade-${s.id}`) as HTMLInputElement;
        if(el && el.value) {
          saveGrade({
            id: uuidv4(),
            studentId: s.id,
            subjectId: selectedSubjectId,
            score: parseFloat(el.value),
            date: selectedDate,
            type: gradeType
          });
        }
      });
      alert("Grades Saved");
      refreshData();
    }
  };

  // --- Render Helpers ---

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return {
        date: i + 1,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      };
    });
  };

  // --- Derived Data ---
  const uniqueClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean)));
  
  const filteredStudents = students.filter(s => {
    const matchesFilter = classFilter === 'All' || s.class === classFilter;
    const matchesSearch = true; // Simplified for now, can add text search state if needed
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: records.length,
    verified: records.filter(r => r.verificationStatus === 'verified').length,
    pending: records.filter(r => r.verificationStatus === 'pending').length,
    rejected: records.filter(r => r.verificationStatus === 'rejected').length,
  };

  // Chart Data: Last 7 days
  const chartData = Array.from({length: 7}, (_, i) => {
     const d = new Date();
     d.setDate(d.getDate() - (6 - i));
     const dateStr = d.toLocaleDateString();
     const count = records.filter(r => new Date(r.timestamp).toLocaleDateString() === dateStr).length;
     return { name: d.toLocaleDateString('en-US', {weekday: 'short'}), count };
  });


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 overflow-hidden">
              {settings.schoolLogo ? (
                <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Lock size={32} />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Admin Portal</h2>
            <p className="text-slate-500 text-sm">Please login to continue</p>
          </div>
          <div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95">
            Login
          </button>
          <button type="button" onClick={onBack} className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm">
            Back to Home
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
             {settings.schoolLogo ? (
               <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-cover" />
             ) : (
               <LayoutDashboard className="text-purple-400" size={18} />
             )}
          </div>
          <span className="text-lg font-bold text-white truncate">{settings.schoolName || "GeoFace Admin"}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <BarChartIcon size={20} />
            <span>Overview</span>
          </button>
          <button onClick={() => setActiveTab('attendance')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <UserCheck size={20} />
            <span>Attendance Logs</span>
          </button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'students' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <Users size={20} />
            <span>Student Data</span>
          </button>
           <button onClick={() => setActiveTab('teachers')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'teachers' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <Briefcase size={20} />
            <span>Teachers (Guru)</span>
          </button>
          <button onClick={() => setActiveTab('recap')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'recap' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <Calendar size={20} />
            <span>Monthly Recap</span>
          </button>
           <button onClick={() => setActiveTab('learning')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'learning' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <BookOpen size={20} />
            <span>Pembelajaran</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
            <Settings size={20} />
            <span>System Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onBack} className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 h-screen">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
             <header className="mb-8">
               <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
               <p className="text-slate-500">Welcome back, Administrator.</p>
             </header>

             {/* Stats Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
                  <p className="text-sm text-slate-500 mt-1">Records Found</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><UserCheck size={24} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Verified</span>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.verified}</h3>
                  <p className="text-sm text-slate-500 mt-1">Confirmed Present</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><AlertTriangle size={24} /></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Pending</span>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.pending}</h3>
                  <p className="text-sm text-slate-500 mt-1">Needs Review</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <div className="h-24 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#7c3aed" />
                            ))}
                          </Bar>
                          <Tooltip cursor={{fill: 'transparent'}} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <p className="text-center text-xs text-slate-400 mt-2">Weekly Trend</p>
                </div>
             </div>
          </div>
        )}

        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div className="space-y-6 max-w-7xl mx-auto">
             <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800">Teacher Data (Data Guru)</h1>
                  <p className="text-slate-500 text-sm">Manage school faculty members</p>
               </div>
               <div className="flex items-center space-x-3">
                  {selectedTeacherIds.size > 0 && (
                    <button onClick={handleBulkDeleteTeachers} className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-200 transition-colors shadow-sm">
                      <Trash2 size={18} />
                      <span>Delete ({selectedTeacherIds.size})</span>
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={teacherFileInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleImportTeachersCSV} 
                  />
                  <button onClick={() => teacherFileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                    <FileSpreadsheet size={18} />
                    <span>Import</span>
                  </button>
                  <button onClick={handleDownloadTeacherTemplate} className="p-2 text-slate-500 hover:text-purple-600" title="Download Template">
                    <Download size={18} />
                  </button>
                  <button onClick={() => handleOpenTeacherModal()} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg">
                    <Plus size={18} />
                    <span>Add Teacher</span>
                  </button>
               </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 w-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        checked={teachers.length > 0 && selectedTeacherIds.size === teachers.length}
                        onChange={handleSelectAllTeachers}
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NIP</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          checked={selectedTeacherIds.has(t.id)}
                          onChange={() => handleToggleTeacherSelection(t.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">{t.nip}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{t.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{t.subject || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{t.phone || '-'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => handleOpenTeacherModal(t)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                         <button onClick={() => handleDeleteTeacher(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Teacher Modal */}
            {isTeacherModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{editingTeacherId ? 'Edit Teacher' : 'Add New Teacher'}</h3>
                    <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveTeacher} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                      <input 
                        required
                        type="text" 
                        value={newTeacherNip}
                        onChange={(e) => setNewTeacherNip(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: 19850101..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: Dr. Budi Santoso"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject Specialty</label>
                      <input 
                        type="text" 
                        value={newTeacherSubject}
                        onChange={(e) => setNewTeacherSubject(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: Matematika"
                      />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                       <input 
                         type="text" 
                         value={newTeacherPhone}
                         onChange={(e) => setNewTeacherPhone(e.target.value)}
                         className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                         placeholder="Ex: 08123456789"
                       />
                    </div>
                    
                    <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg mt-2">
                      {editingTeacherId ? 'Save Changes' : 'Add Teacher'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEARNING TAB */}
        {activeTab === 'learning' && (
          <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="mb-4">
               <h1 className="text-2xl font-bold text-slate-800">Pembelajaran (Learning)</h1>
               <p className="text-slate-500 text-sm">Manage subjects, schedule, and class activities.</p>
            </header>

            {/* Learning Sub-Nav */}
            <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-2 mb-4 border-b border-slate-200">
              {['subjects', 'schedule', 'materials', 'assignments', 'grades', 'attendance', 'recap'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveLearningTab(tab as LearningTabType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeLearningTab === tab 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Learning Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              
              {/* SUBJECTS */}
              {activeLearningTab === 'subjects' && (
                <div className="space-y-4">
                  <div className="flex gap-2 items-end border-b border-slate-100 pb-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Name</label>
                      <input 
                        className="w-full border border-slate-200 rounded p-2 text-sm" 
                        placeholder="e.g. Matematika"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code</label>
                      <input 
                         className="w-full border border-slate-200 rounded p-2 text-sm" 
                         placeholder="e.g. MTK"
                         value={newSubjectCode}
                         onChange={e => setNewSubjectCode(e.target.value)}
                      />
                    </div>
                    <button onClick={handleAddSubject} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700">
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                          <th className="p-3">Code</th>
                          <th className="p-3">Subject Name</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subjects.map(sub => (
                          <tr key={sub.id}>
                            <td className="p-3 font-mono">{sub.code || '-'}</td>
                            <td className="p-3 font-medium">{sub.name}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => handleDeleteSubject(sub.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SCHEDULE */}
              {activeLearningTab === 'schedule' && (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end border-b border-slate-100 pb-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Day</label>
                        <select className="w-full border border-slate-200 rounded p-2 text-sm" value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                         <input className="w-full border border-slate-200 rounded p-2 text-sm" list="class-list" value={scheduleClass} onChange={e => setScheduleClass(e.target.value)} placeholder="Class" />
                         <datalist id="class-list">{uniqueClasses.map(c => <option key={c} value={c} />)}</datalist>
                      </div>
                       <div className="md:col-span-1">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                         <select className="w-full border border-slate-200 rounded p-2 text-sm" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                            <option value="">Select...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                      </div>
                       <div className="md:col-span-1">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                         <div className="flex gap-1">
                           <input type="time" className="w-full border border-slate-200 rounded p-1 text-sm" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} />
                           <input type="time" className="w-full border border-slate-200 rounded p-1 text-sm" value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} />
                         </div>
                      </div>
                      <button onClick={handleAddSchedule} className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 w-full">
                        Add
                      </button>
                   </div>
                   
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                           <tr>
                             <th className="p-3">Day</th>
                             <th className="p-3">Time</th>
                             <th className="p-3">Class</th>
                             <th className="p-3">Subject</th>
                             <th className="p-3 text-right">Action</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {schedule.map(s => {
                             const sub = subjects.find(sub => sub.id === s.subjectId);
                             return (
                               <tr key={s.id}>
                                 <td className="p-3 font-medium">{s.day}</td>
                                 <td className="p-3 text-slate-500">{s.startTime} - {s.endTime}</td>
                                 <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{s.className}</span></td>
                                 <td className="p-3 text-purple-600 font-medium">{sub?.name || 'Unknown'}</td>
                                 <td className="p-3 text-right">
                                   <button onClick={() => handleDeleteSchedule(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                 </td>
                               </tr>
                             )
                           })}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
              
              {/* MATERIALS */}
              {activeLearningTab === 'materials' && (
                 <div className="space-y-4">
                   <div className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-4">
                      <div className="w-48">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                         <input className="w-full border border-slate-200 rounded p-2 text-sm" list="class-list" value={scheduleClass} onChange={e => setScheduleClass(e.target.value)} placeholder="Class" />
                      </div>
                      <div className="w-48">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                         <select className="w-full border border-slate-200 rounded p-2 text-sm" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                            <option value="">Select...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                        <input className="w-full border border-slate-200 rounded p-2 text-sm" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} placeholder="Material Title" />
                      </div>
                      <div className="w-32">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                         <select className="w-full border border-slate-200 rounded p-2 text-sm" value={materialType} onChange={e => setMaterialType(e.target.value as any)}>
                            <option value="link">Link</option>
                            <option value="file">File (Stub)</option>
                         </select>
                      </div>
                       <div className="w-full">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content / URL</label>
                         <input className="w-full border border-slate-200 rounded p-2 text-sm" value={materialContent} onChange={e => setMaterialContent(e.target.value)} placeholder="https://..." />
                      </div>
                      <button onClick={handleAddMaterial} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mt-2">
                        Add Material
                      </button>
                   </div>
                   
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                           <tr>
                             <th className="p-3">Title</th>
                             <th className="p-3">Subject</th>
                             <th className="p-3">Class</th>
                             <th className="p-3">Type</th>
                             <th className="p-3 text-right">Action</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {materials.map(m => {
                              const sub = subjects.find(s => s.id === m.subjectId);
                              return (
                               <tr key={m.id}>
                                 <td className="p-3 font-medium">
                                   <a href={m.content} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{m.title}</a>
                                 </td>
                                 <td className="p-3 text-slate-500">{sub?.name}</td>
                                 <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{m.className}</span></td>
                                 <td className="p-3 text-xs uppercase">{m.type}</td>
                                 <td className="p-3 text-right">
                                   <button onClick={() => handleDeleteMaterial(m.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                 </td>
                               </tr>
                              )
                           })}
                         </tbody>
                      </table>
                   </div>
                 </div>
              )}

              {/* ASSIGNMENTS */}
              {activeLearningTab === 'assignments' && (
                <div className="space-y-4">
                   <div className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-4">
                      <div className="w-48">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                         <input className="w-full border border-slate-200 rounded p-2 text-sm" list="class-list" value={scheduleClass} onChange={e => setScheduleClass(e.target.value)} placeholder="Class" />
                      </div>
                      <div className="w-48">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                         <select className="w-full border border-slate-200 rounded p-2 text-sm" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                            <option value="">Select...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                        <input className="w-full border border-slate-200 rounded p-2 text-sm" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder="Assignment Title" />
                      </div>
                      <div className="w-40">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deadline</label>
                         <input type="date" className="w-full border border-slate-200 rounded p-2 text-sm" value={assignmentDeadline} onChange={e => setAssignmentDeadline(e.target.value)} />
                      </div>
                      <div className="w-full">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                         <textarea className="w-full border border-slate-200 rounded p-2 text-sm" value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)} placeholder="Details..." rows={2} />
                      </div>
                      <button onClick={handleAddAssignment} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mt-2">
                        Create Assignment
                      </button>
                   </div>

                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                           <tr>
                             <th className="p-3">Title</th>
                             <th className="p-3">Subject</th>
                             <th className="p-3">Class</th>
                             <th className="p-3">Deadline</th>
                             <th className="p-3 text-right">Action</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {assignments.map(a => {
                              const sub = subjects.find(s => s.id === a.subjectId);
                              return (
                               <tr key={a.id}>
                                 <td className="p-3 font-medium">
                                   {a.title}
                                   <div className="text-xs text-slate-400 truncate w-48">{a.description}</div>
                                 </td>
                                 <td className="p-3 text-slate-500">{sub?.name}</td>
                                 <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{a.className}</span></td>
                                 <td className="p-3 text-xs">{a.deadline}</td>
                                 <td className="p-3 text-right">
                                   <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                 </td>
                               </tr>
                              )
                           })}
                         </tbody>
                      </table>
                   </div>
                 </div>
              )}

              {/* GRADES */}
              {activeLearningTab === 'grades' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 items-end border-b border-slate-100 pb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                      <select className="border border-slate-200 rounded p-2 text-sm w-32" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                        <option value="All">Select Class</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                      <select className="border border-slate-200 rounded p-2 text-sm w-40" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                         <option value="">Select Subject</option>
                         {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                       <input type="date" className="border border-slate-200 rounded p-2 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                     <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                      <select className="border border-slate-200 rounded p-2 text-sm w-32" value={gradeType} onChange={e => setGradeType(e.target.value as any)}>
                         <option value="daily">Daily</option>
                         <option value="assignment">Assignment</option>
                         <option value="midterm">Midterm</option>
                         <option value="final">Final</option>
                      </select>
                    </div>
                  </div>

                  {classFilter !== 'All' && selectedSubjectId ? (
                    <div className="space-y-4">
                       <h3 className="font-bold text-slate-700">Input Grades: {subjects.find(s => s.id === selectedSubjectId)?.name} - {classFilter}</h3>
                       <div className="bg-slate-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStudents.map(s => (
                              <div key={s.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                                 <div>
                                   <p className="font-medium text-sm text-slate-800">{s.name}</p>
                                   <p className="text-xs text-slate-400">{s.id}</p>
                                 </div>
                                 <input 
                                   id={`grade-${s.id}`}
                                   type="number" 
                                   className="w-20 border border-slate-200 rounded p-1 text-right font-mono" 
                                   placeholder="0-100"
                                   min="0" max="100"
                                 />
                              </div>
                            ))}
                          </div>
                          <button onClick={handleSaveGrades} className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700">
                             Save Grades
                          </button>
                       </div>

                       {/* Recent Grades List with Delete */}
                       <div className="mt-6">
                          <h4 className="font-bold text-slate-700 mb-2">Recent Recorded Grades</h4>
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                             <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                 <tr>
                                   <th className="p-2">Date</th>
                                   <th className="p-2">Student</th>
                                   <th className="p-2">Type</th>
                                   <th className="p-2">Score</th>
                                   <th className="p-2 text-right">Action</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {grades
                                    .filter(g => g.subjectId === selectedSubjectId && students.find(s => s.id === g.studentId)?.class === classFilter)
                                    .slice(0, 10) // Show last 10
                                    .map(g => {
                                      const st = students.find(s => s.id === g.studentId);
                                      return (
                                       <tr key={g.id} className="border-t border-slate-100">
                                          <td className="p-2 text-xs">{g.date}</td>
                                          <td className="p-2 font-medium">{st?.name}</td>
                                          <td className="p-2 text-xs uppercase">{g.type}</td>
                                          <td className="p-2 font-bold">{g.score}</td>
                                          <td className="p-2 text-right">
                                             <button onClick={() => handleDeleteGrade(g.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                          </td>
                                       </tr>
                                      )
                                    })
                                 }
                               </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400">Please select Class and Subject</div>
                  )}
                </div>
              )}

              {/* CLASS ATTENDANCE (MANUAL) */}
              {activeLearningTab === 'attendance' && (
                <div className="space-y-4">
                   <div className="flex flex-wrap gap-4 items-end border-b border-slate-100 pb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                      <select className="border border-slate-200 rounded p-2 text-sm w-32" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                        <option value="All">Select Class</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                      <select className="border border-slate-200 rounded p-2 text-sm w-40" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                         <option value="">Select Subject</option>
                         {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                       <input type="date" className="border border-slate-200 rounded p-2 text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                  </div>

                  {classFilter !== 'All' && selectedSubjectId ? (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-700">Class Attendance: {subjects.find(s => s.id === selectedSubjectId)?.name}</h3>
                          <div className="flex gap-2 text-xs">
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Hadir</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Sakit</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Ijin</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Alpa</span>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                  <th className="p-3">Student</th>
                                  <th className="p-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map(s => (
                                  <tr key={s.id}>
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 flex justify-center gap-4">
                                       <label className="cursor-pointer flex items-center gap-1">
                                          <input type="radio" name={`status-${s.id}`} value="H" defaultChecked className="accent-green-500" /> H
                                       </label>
                                       <label className="cursor-pointer flex items-center gap-1">
                                          <input type="radio" name={`status-${s.id}`} value="S" className="accent-yellow-500" /> S
                                       </label>
                                       <label className="cursor-pointer flex items-center gap-1">
                                          <input type="radio" name={`status-${s.id}`} value="I" className="accent-blue-500" /> I
                                       </label>
                                       <label className="cursor-pointer flex items-center gap-1">
                                          <input type="radio" name={`status-${s.id}`} value="A" className="accent-red-500" /> A
                                       </label>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                           </table>
                        </div>
                        <button onClick={handleSaveClassAttendance} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
                           Submit Attendance
                        </button>

                         {/* Recorded Sessions List */}
                         <div className="mt-8">
                             <h4 className="font-bold text-slate-700 mb-2">Attendance History (Sessions)</h4>
                             <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                   <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                     <tr>
                                       <th className="p-2">Date</th>
                                       <th className="p-2">Class</th>
                                       <th className="p-2">Subject</th>
                                       <th className="p-2 text-right">Action</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {classAttendance.map(sess => {
                                        const sub = subjects.find(s => s.id === sess.subjectId);
                                        return (
                                          <tr key={sess.id} className="border-t border-slate-100">
                                             <td className="p-2">{sess.date}</td>
                                             <td className="p-2"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{sess.className}</span></td>
                                             <td className="p-2 text-purple-600">{sub?.name}</td>
                                             <td className="p-2 text-right">
                                                <button onClick={() => handleDeleteClassAttendance(sess.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                             </td>
                                          </tr>
                                        )
                                     })}
                                   </tbody>
                                </table>
                             </div>
                         </div>

                     </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400">Please select Class, Subject and Date</div>
                  )}
                </div>
              )}

              {/* RECAP (LEARNING) */}
              {activeLearningTab === 'recap' && (
                 <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-end border-b border-slate-100 pb-4">
                       <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class</label>
                        <select className="border border-slate-200 rounded p-2 text-sm w-32" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                          <option value="All">Select Class</option>
                          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                        <select className="border border-slate-200 rounded p-2 text-sm w-40" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                           <option value="">Select Subject</option>
                           {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Month</label>
                         <input type="month" className="border border-slate-200 rounded p-2 text-sm" value={recapMonth} onChange={e => setRecapMonth(e.target.value)} />
                      </div>
                    </div>

                    {classFilter !== 'All' && selectedSubjectId ? (
                       <div className="overflow-x-auto">
                           <h3 className="font-bold text-slate-700 mb-4">Recap: {subjects.find(s => s.id === selectedSubjectId)?.name} ({recapMonth})</h3>
                           <table className="w-full text-xs text-left border-collapse border border-slate-200">
                             <thead>
                               <tr className="bg-slate-50">
                                 <th className="p-2 border border-slate-200">Student</th>
                                 {getDaysInMonth(recapMonth).map(d => (
                                   <th key={d.date} className="p-1 border border-slate-200 text-center w-8">
                                     {d.date}
                                   </th>
                                 ))}
                                 <th className="p-2 border border-slate-200 bg-yellow-50">Total A</th>
                               </tr>
                             </thead>
                             <tbody>
                               {filteredStudents.map(s => {
                                 let alphaCount = 0;
                                 return (
                                   <tr key={s.id}>
                                     <td className="p-2 border border-slate-200 font-medium">{s.name}</td>
                                     {getDaysInMonth(recapMonth).map(d => {
                                        const dateStr = new Date(parseInt(recapMonth.split('-')[0]), parseInt(recapMonth.split('-')[1])-1, d.date).toISOString().slice(0, 10);
                                        // Find class attendance session for this date/subject/class
                                        const session = classAttendance.find(sess => 
                                          sess.date === dateStr && 
                                          sess.subjectId === selectedSubjectId && 
                                          sess.className === classFilter
                                        );
                                        const status = session?.records.find(r => r.studentId === s.id)?.status || '-';
                                        
                                        if(status === 'A') alphaCount++;

                                        let color = 'text-slate-300';
                                        if(status === 'H') color = 'text-green-600 font-bold';
                                        if(status === 'S') color = 'text-yellow-600 font-bold';
                                        if(status === 'I') color = 'text-blue-600 font-bold';
                                        if(status === 'A') color = 'text-red-600 font-bold';

                                        return (
                                          <td key={d.date} className={`p-1 border border-slate-200 text-center ${color}`}>
                                            {status}
                                          </td>
                                        )
                                     })}
                                     <td className="p-2 border border-slate-200 text-center font-bold">{alphaCount}</td>
                                   </tr>
                                 )
                               })}
                             </tbody>
                           </table>
                       </div>
                    ) : (
                       <div className="text-center py-10 text-slate-400">Please select filters to view recap</div>
                    )}
                 </div>
              )}

            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800">Attendance Logs</h1>
                  <p className="text-slate-500 text-sm">Real-time check-in records</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button onClick={handleExportCSV} className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                    <Download size={18} />
                    <span>Export CSV</span>
                  </button>
                  <button onClick={refreshData} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg">
                    <span>Refresh</span>
                  </button>
               </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Verification</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No records found</td></tr>
                      ) : records.map((record) => {
                        const dist = calculateDistance(record.location.latitude, record.location.longitude, settings.schoolLat, settings.schoolLng);
                        const isOutOfRange = dist > settings.radiusMeters;
                        
                        // Time Check logic
                        const recordTime = new Date(record.timestamp);
                        const [startHour, startMinute] = settings.startTime.split(':').map(Number);
                        const limitTime = new Date(recordTime);
                        limitTime.setHours(startHour, startMinute, 0, 0);
                        const isLate = recordTime > limitTime;

                        return (
                          <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <img src={record.selfieUrl} alt="Selfie" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                <div>
                                  <p className="font-bold text-slate-800">{record.studentName}</p>
                                  <p className="text-xs text-slate-500">{record.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700 font-medium">
                                  {new Date(record.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleDateString()}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isLate ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {isLate ? 'Late' : 'On Time'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOutOfRange ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {isOutOfRange ? 'Out of Range' : 'In Range'}
                                  </span>
                                  <span className="text-xs text-slate-400">({Math.round(dist)}m)</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                record.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {record.verificationStatus.toUpperCase()}
                              </span>
                              {record.verificationNote && <p className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">{record.verificationNote}</p>}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                               {record.verificationStatus === 'pending' && (
                                 <>
                                  <button 
                                    onClick={() => handleUpdateStatus(record.id, 'verified')}
                                    className="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-xs font-bold"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(record.id, 'rejected')}
                                    className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold"
                                  >
                                    Reject
                                  </button>
                                 </>
                               )}
                               <button 
                                onClick={() => setSelectedLocation({lat: record.location.latitude, lng: record.location.longitude})}
                                className="text-blue-500 hover:text-blue-700" title="View Map"
                               >
                                 <MapPin size={18} />
                               </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-7xl mx-auto">
             <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800">Student Data</h1>
                  <p className="text-slate-500 text-sm">Manage enrolled students</p>
               </div>
               <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="All">All Classes</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleImportCSV} 
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                    <FileSpreadsheet size={18} />
                    <span>Import</span>
                  </button>
                  <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:text-purple-600" title="Download Template">
                    <Download size={18} />
                  </button>
                  <button onClick={() => handleOpenStudentModal()} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg">
                    <Plus size={18} />
                    <span>Add Student</span>
                  </button>
               </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacts</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{s.class || '-'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 space-y-1">
                        {s.parentWhatsapp && <div className="flex items-center gap-1"><MessageCircle size={12} className="text-green-500" /> {s.parentWhatsapp}</div>}
                        {s.telegramChatId && <div className="flex items-center gap-1"><Send size={12} className="text-blue-500" /> {s.telegramChatId}</div>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => handleOpenStudentModal(s)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                         <button onClick={() => handleDeleteStudent(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Student Modal */}
            {isStudentModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Edit Student' : 'Add New Student'}</h3>
                    <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                      <input 
                        required
                        type="text" 
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: STU001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                      <input 
                        type="text"
                        list="class-suggestions" 
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Ex: 12-IPA-1"
                      />
                      <datalist id="class-suggestions">
                        {uniqueClasses.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Parent WA</label>
                          <input 
                            type="text" 
                            value={newParentWhatsapp}
                            onChange={(e) => setNewParentWhatsapp(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="628..."
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tele Chat ID</label>
                          <input 
                            type="text" 
                            value={newTelegramChatId}
                            onChange={(e) => setNewTelegramChatId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="12345..."
                          />
                       </div>
                    </div>
                    
                    <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg mt-2">
                      {editingId ? 'Save Changes' : 'Add Student'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECAP TAB (MAIN) */}
        {activeTab === 'recap' && (
           <div className="space-y-6 max-w-[95vw] mx-auto">
             <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800">Monthly Recap</h1>
                  <p className="text-slate-500 text-sm">Attendance Matrix ({classFilter})</p>
               </div>
               <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="All">All Classes</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input 
                    type="month" 
                    value={recapMonth}
                    onChange={(e) => setRecapMonth(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button onClick={handleExportRecap} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg">
                    <Download size={18} />
                    <span>Export Report</span>
                  </button>
               </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
               <table className="w-full text-left text-xs border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 font-bold text-slate-500 uppercase min-w-[150px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Student Name</th>
                        {getDaysInMonth(recapMonth).map(day => (
                           <th key={day.date} className={`p-2 font-bold text-center border-r border-slate-100 min-w-[30px] ${day.isWeekend ? 'bg-red-100 text-red-600' : 'text-slate-600'}`}>
                             <div>{day.date}</div>
                             <div className="text-[9px] opacity-70">{day.dayName}</div>
                           </th>
                        ))}
                        <th className="p-2 text-center bg-blue-50 text-blue-800 font-bold border-r border-slate-200" title="Hadir">H</th>
                        <th className="p-2 text-center bg-yellow-50 text-yellow-800 font-bold border-r border-slate-200" title="Sakit">S</th>
                        <th className="p-2 text-center bg-indigo-50 text-indigo-800 font-bold border-r border-slate-200" title="Ijin">I</th>
                        <th className="p-2 text-center bg-red-50 text-red-800 font-bold border-r border-slate-200" title="Alpa">A</th>
                        <th className="p-2 text-center bg-slate-100 text-slate-800 font-bold" title="Percentage">%</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredStudents.map(s => {
                        const days = getDaysInMonth(recapMonth);
                        let presentCount = 0;
                        let workingDaysCount = 0;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                             <td className="p-3 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                               {s.name} <span className="text-[10px] text-slate-400 block">{s.id}</span>
                             </td>
                             {days.map(day => {
                                const isWeekend = day.isWeekend;
                                if(!isWeekend) workingDaysCount++;

                                const dateStr = new Date(parseInt(recapMonth.split('-')[0]), parseInt(recapMonth.split('-')[1])-1, day.date).toLocaleDateString();
                                const record = records.find(r => 
                                  r.studentId === s.id && 
                                  new Date(r.timestamp).toLocaleDateString() === dateStr &&
                                  r.verificationStatus === 'verified'
                                );
                                
                                if (record) presentCount++;

                                return (
                                  <td key={day.date} className={`p-1 text-center border-r border-slate-100 ${isWeekend ? 'bg-red-50' : ''}`}>
                                     {record ? (
                                        <div className="mx-auto w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white">
                                          <UserCheck size={12} />
                                        </div>
                                     ) : isWeekend ? (
                                        <span className="text-red-300">-</span>
                                     ) : (
                                        <span className="text-slate-200">·</span>
                                     )}
                                  </td>
                                );
                             })}
                             {/* Summary Columns */}
                             <td className="p-2 text-center font-bold text-slate-700 bg-blue-50/30 border-r border-slate-100">{presentCount}</td>
                             <td className="p-2 text-center font-bold text-slate-700 bg-yellow-50/30 border-r border-slate-100">0</td>
                             <td className="p-2 text-center font-bold text-indigo-50/30 border-r border-slate-100">0</td>
                             <td className="p-2 text-center font-bold text-red-600 bg-red-50/30 border-r border-slate-100">{workingDaysCount - presentCount}</td>
                             <td className="p-2 text-center font-bold text-slate-900 bg-slate-50/50">
                               {workingDaysCount > 0 ? ((presentCount/workingDaysCount)*100).toFixed(0) : 0}%
                             </td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
           </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl mx-auto pb-10">
             <header className="mb-6">
               <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
               <p className="text-slate-500">Configure geolocation and notifications</p>
             </header>

             <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* School Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-purple-600"/> School Profile</h3>
                  
                  {/* Logo Upload */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                     <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {tempSettings.schoolLogo ? (
                          <img src={tempSettings.schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={32} />
                        )}
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">School Logo</label>
                        <p className="text-xs text-slate-400 mb-2">Recommended: Square PNG/JPG, Max 500KB</p>
                        <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-2 text-sm text-slate-700">
                           <Upload size={14} />
                           Upload Logo
                           <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                     </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                    <input 
                      type="text" 
                      value={tempSettings.schoolName}
                      onChange={e => setTempSettings({...tempSettings, schoolName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                      <input 
                        type="number" step="any"
                        value={tempSettings.schoolLat}
                        onChange={e => setTempSettings({...tempSettings, schoolLat: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                     </div>
                     <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                      <input 
                        type="number" step="any"
                        value={tempSettings.schoolLng}
                        onChange={e => setTempSettings({...tempSettings, schoolLng: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                     </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Allowed Radius (meters)</label>
                    <input 
                      type="number" 
                      value={tempSettings.radiusMeters}
                      onChange={e => setTempSettings({...tempSettings, radiusMeters: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Students must be within this distance to check in.</p>
                  </div>
                </div>

                {/* School Hours */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Clock size={20} className="text-purple-600"/> School Hours (Waktu Sekolah)</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Entry Time (Masuk)</label>
                      <input 
                        type="time"
                        value={tempSettings.startTime}
                        onChange={e => setTempSettings({...tempSettings, startTime: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                     </div>
                     <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Exit Time (Pulang)</label>
                      <input 
                        type="time"
                        value={tempSettings.endTime}
                        onChange={e => setTempSettings({...tempSettings, endTime: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                     </div>
                  </div>
                  <p className="text-xs text-slate-400">Attendance recorded after Entry Time will be marked as "Late".</p>
                </div>

                {/* Notifications */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Bell size={20} className="text-purple-600"/> Notification Settings</h3>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Bot Token</label>
                      <input 
                        type="password"
                        value={tempSettings.telegramBotToken || ''}
                        onChange={e => setTempSettings({...tempSettings, telegramBotToken: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      />
                      <p className="text-xs text-slate-400 mt-1">Required for automated Telegram messages.</p>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Timing</label>
                      <select 
                         value={tempSettings.notificationTiming}
                         onChange={e => setTempSettings({...tempSettings, notificationTiming: e.target.value as any})}
                         className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                         <option value="immediate">Immediately upon Check-in</option>
                         <option value="daily_summary">Daily Summary (End of Day)</option>
                      </select>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message Template</label>
                      <textarea 
                        rows={3}
                        value={tempSettings.notificationTemplate}
                        onChange={e => setTempSettings({...tempSettings, notificationTemplate: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                      />
                      <p className="text-xs text-slate-400 mt-1">Variables: {'{student_name}'}, {'{school_name}'}, {'{time}'}, {'{date}'}</p>
                   </div>
                </div>

                {/* Sound Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Volume2 size={20} className="text-purple-600"/> Sound Alerts</h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notification Sound</label>
                        <select 
                           value={tempSettings.notificationSound}
                           onChange={e => setTempSettings({...tempSettings, notificationSound: e.target.value as any})}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                           <option value="default">Default Ding</option>
                           <option value="chime">Soft Chime</option>
                           <option value="alert">Alert Beep</option>
                           <option value="custom">Custom Upload...</option>
                        </select>
                     </div>
                     <div className="flex items-end">
                        <button 
                          type="button"
                          onClick={() => handlePlaySound(tempSettings.notificationSound)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium"
                        >
                          <Play size={16} /> Preview Sound
                        </button>
                     </div>
                   </div>

                   {tempSettings.notificationSound === 'custom' && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                         <label className="block text-sm font-medium text-slate-700 mb-2">Upload Audio (Max 500KB)</label>
                         <div className="flex items-center gap-3">
                            <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 text-sm text-slate-700">
                               <Upload size={16} />
                               Choose File
                               <input type="file" accept="audio/*" onChange={handleSoundFileUpload} className="hidden" />
                            </label>
                            {tempSettings.customSoundData && <span className="text-xs text-green-600 font-medium">Custom sound loaded</span>}
                         </div>
                      </div>
                   )}
                </div>

                <div className="sticky bottom-4">
                   <button 
                    type="submit" 
                    disabled={isSettingsSaved}
                    className={`w-full py-4 rounded-xl font-bold shadow-xl transition-all flex items-center justify-center space-x-2 ${isSettingsSaved ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                   >
                     {isSettingsSaved ? <CheckCircle size={20} /> : <Save size={20} />}
                     <span>{isSettingsSaved ? 'Settings Saved!' : 'Save All Settings'}</span>
                   </button>
                </div>
             </form>
          </div>
        )}

      </main>

      {/* Map Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
            <button 
              onClick={() => setSelectedLocation(null)}
              className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-md hover:bg-slate-100"
            >
              <X size={20} />
            </button>
            <div className="h-64 bg-slate-100 flex items-center justify-center relative">
               {/* Mock Map Visual */}
               <div className="absolute inset-0 opacity-50 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=40.714728,-73.998672&zoom=12&size=600x300&key=YOUR_API_KEY')] bg-cover bg-center"></div>
               <div className="relative z-0 flex flex-col items-center">
                  <MapPin size={48} className="text-red-500 drop-shadow-lg" />
                  <span className="bg-white px-2 py-1 rounded shadow text-xs font-bold mt-1">Student Here</span>
               </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg mb-2">Location Details</h3>
              <p className="text-slate-600 text-sm mb-4">
                Recorded coordinates for this check-in. In a production app, this would be an interactive Google Map.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="block text-slate-400 text-xs uppercase">Latitude</span>
                  <span className="font-mono text-slate-800">{selectedLocation.lat}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <span className="block text-slate-400 text-xs uppercase">Longitude</span>
                  <span className="font-mono text-slate-800">{selectedLocation.lng}</span>
                </div>
              </div>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`} 
                target="_blank" 
                rel="noreferrer"
                className="block mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-xl font-bold transition-colors"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon for Save State
const CheckCircle = ({size}: {size: number}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default Dashboard;
