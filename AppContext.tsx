import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Course,
  CourseFile,
  Exam,
  ExamAttempt,
  ScheduleItem,
  StudyTask,
  Announcement,
  NotificationItem,
  AdminLog,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_COURSES,
  INITIAL_FILES,
  INITIAL_EXAMS,
  INITIAL_ATTEMPTS,
  INITIAL_SCHEDULE,
  INITIAL_TASKS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_LOGS,
} from '../data/initialData';

export type ActiveView =
  | 'home'
  | 'courses'
  | 'course-detail'
  | 'files'
  | 'exams'
  | 'take-exam'
  | 'exam-result'
  | 'schedule'
  | 'ai-assistant'
  | 'supervisor';

interface AppContextType {
  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  selectedExamId: string | null;
  setSelectedExamId: (id: string | null) => void;
  lastAttemptId: string | null;
  setLastAttemptId: (id: string | null) => void;
  previewFile: CourseFile | null;
  setPreviewFile: (file: CourseFile | null) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;

  // Auth & Roles
  currentUser: User | null;
  users: User[];
  login: (email: string, role?: 'student' | 'supervisor') => boolean;
  register: (data: Partial<User>) => boolean;
  logout: () => void;
  switchRole: () => void;
  requestPasswordReset: (email: string) => Promise<boolean>;

  // Data
  courses: Course[];
  files: CourseFile[];
  exams: Exam[];
  attempts: ExamAttempt[];
  schedule: ScheduleItem[];
  tasks: StudyTask[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  logs: AdminLog[];

  // Mutators (with role protection)
  addCourse: (course: Omit<Course, 'id' | 'progress' | 'booksCount' | 'lecturesCount' | 'examsCount'>) => boolean;
  updateCourse: (id: string, updates: Partial<Course>) => boolean;
  deleteCourse: (id: string) => boolean;

  addFile: (file: Omit<CourseFile, 'id' | 'uploadDate' | 'downloadCount'>) => boolean;
  deleteFile: (id: string) => boolean;
  incrementFileDownload: (id: string) => void;

  addExam: (exam: Omit<Exam, 'id' | 'createdAt' | 'status'>) => boolean;
  submitExamAttempt: (attemptData: Omit<ExamAttempt, 'id' | 'studentId' | 'studentName'>) => ExamAttempt | null;

  addTask: (task: Omit<StudyTask, 'id' | 'completed'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => boolean;
  markNotificationAsRead: (id: string) => void;

  // UI Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Storage helpers
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(`sharia_portal_${key}`);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveState = <T,>(key: string, val: T) => {
    try {
      localStorage.setItem(`sharia_portal_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  };

  // State
  const [users, setUsers] = useState<User[]>(() => loadState('users', INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = loadState<User | null>('currentUser', INITIAL_USERS[0]);
    return saved;
  });

  const [courses, setCourses] = useState<Course[]>(() => loadState('courses', INITIAL_COURSES));
  const [files, setFiles] = useState<CourseFile[]>(() => loadState('files', INITIAL_FILES));
  const [exams, setExams] = useState<Exam[]>(() => loadState('exams', INITIAL_EXAMS));
  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => loadState('attempts', INITIAL_ATTEMPTS));
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => loadState('schedule', INITIAL_SCHEDULE));
  const [tasks, setTasks] = useState<StudyTask[]>(() => loadState('tasks', INITIAL_TASKS));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadState('announcements', INITIAL_ANNOUNCEMENTS));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadState('notifications', INITIAL_NOTIFICATIONS));
  const [logs, setLogs] = useState<AdminLog[]>(() => loadState('logs', INITIAL_LOGS));

  // Navigation & modals
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<CourseFile | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sync to local storage
  useEffect(() => { saveState('users', users); }, [users]);
  useEffect(() => { saveState('currentUser', currentUser); }, [currentUser]);
  useEffect(() => { saveState('courses', courses); }, [courses]);
  useEffect(() => { saveState('files', files); }, [files]);
  useEffect(() => { saveState('exams', exams); }, [exams]);
  useEffect(() => { saveState('attempts', attempts); }, [attempts]);
  useEffect(() => { saveState('tasks', tasks); }, [tasks]);
  useEffect(() => { saveState('announcements', announcements); }, [announcements]);
  useEffect(() => { saveState('notifications', notifications); }, [notifications]);
  useEffect(() => { saveState('logs', logs); }, [logs]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const addLog = (action: string, details: string, type: AdminLog['type']) => {
    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      action,
      user: currentUser?.name || 'مستخدم النظام',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      details,
      type,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Auth actions
  const login = (email: string, targetRole?: 'student' | 'supervisor') => {
    let matched = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (!matched && targetRole) {
      matched = users.find((u) => u.role === targetRole);
    }
    if (!matched) {
      matched = users[0];
    }
    setCurrentUser(matched);
    showToast(`مرحبًا بك يا ${matched?.name || matched?.username || 'مستخدم'}`, 'success');
    return true;
  };

  const register = (data: Partial<User>) => {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name || 'طالب جديد',
      email: data.email || `student_${Date.now()}@sharia.edu.sa`,
      role: data.role || 'student',
      studentId: data.studentId || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      department: data.department || 'قسم الفقه وأصوله',
      term: data.term || 'المستوى الأول',
      joinedDate: new Date().toISOString().substring(0, 10),
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast('تم إنشاء الحساب بنجاح، أهلاً بك في بوابة طلاب العلم!', 'success');
    addLog('تسجيل حساب جديد', `تم تسجيل المستخدم: ${newUser.name} (${newUser.role})`, 'user');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveView('home');
    showToast('تم تسجيل الخروج بنجاح.', 'info');
  };

  const switchRole = () => {
    if (!currentUser) {
      setCurrentUser(INITIAL_USERS[0]);
      return;
    }
    const newRole = currentUser.role === 'student' ? 'supervisor' : 'student';
    const targetUser = users.find((u) => u.role === newRole) || {
      id: `usr_${newRole}_${Date.now()}`,
      name: newRole === 'supervisor' ? 'د. عبد الرحمن المشرف' : 'عبد الله القحطاني',
      email: `${newRole}@sharia.edu.sa`,
      role: newRole,
      department: 'قسم الفقه وأصوله',
      term: newRole === 'supervisor' ? 'مشرف أكاديمي' : 'المستوى الرابع',
      joinedDate: '2024-01-01',
    };
    setCurrentUser(targetUser);
    showToast(`تم التبديل إلى صلاحية: ${newRole === 'supervisor' ? 'مشرف أكاديمي' : 'طالب'}`, 'info');
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    showToast(`تم إرسال رابط استعادة كلمة المرور إلى البريد: ${email}`, 'success');
    return true;
  };

  // Course management
  const addCourse = (courseData: Omit<Course, 'id' | 'progress' | 'booksCount' | 'lecturesCount' | 'examsCount'>) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('عذرًا، إضافة المقررات متاحة فقط للمشرف الأكاديمي.', 'error');
      return false;
    }
    const newCourse: Course = {
      ...courseData,
      id: `crs_${Date.now()}`,
      progress: 0,
      booksCount: 0,
      lecturesCount: 0,
      examsCount: 0,
    };
    setCourses((prev) => [newCourse, ...prev]);
    showToast(`تمت إضافة مقرر "${newCourse.title}" بنجاح!`, 'success');
    addLog('إضافة مقرر جديد', `تمت إضافة مقرر: ${newCourse.title} (${newCourse.code})`, 'course');
    return true;
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('تعديل المقررات متاح للمشرفين فقط.', 'error');
      return false;
    }
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    showToast('تم تحديث بيانات المقرر بنجاح.', 'success');
    addLog('تعديل مقرر', `تم تحديث بيانات المقرر رقم: ${id}`, 'course');
    return true;
  };

  const deleteCourse = (id: string) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('حذف المقررات متاح للمشرفين فقط.', 'error');
      return false;
    }
    const target = courses.find((c) => c.id === id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    showToast(`تم حذف مقرر "${target?.title || ''}" بنجاح.`, 'info');
    addLog('حذف مقرر', `تم حذف المقرر: ${target?.title || id}`, 'course');
    return true;
  };

  // File management
  const addFile = (fileData: Omit<CourseFile, 'id' | 'uploadDate' | 'downloadCount'>) => {
    const newFile: CourseFile = {
      ...fileData,
      id: `fl_${Date.now()}`,
      uploadDate: new Date().toISOString().substring(0, 10),
      downloadCount: 0,
    };
    setFiles((prev) => [newFile, ...prev]);
    // update course files count
    setCourses((prev) =>
      prev.map((c) => (c.id === newFile.courseId ? { ...c, booksCount: c.booksCount + 1 } : c))
    );
    showToast(`تم رفع وتخزين ملف "${newFile.title}" بنجاح!`, 'success');
    addLog('رفع ملف أكاديمي', `تم رفع الملف: ${newFile.fileName} للمقرر ${newFile.courseTitle}`, 'file');
    return true;
  };

  const deleteFile = (id: string) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('حذف الملفات متاح للمشرفين فقط.', 'error');
      return false;
    }
    const target = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    showToast('تم حذف الملف بنجاح.', 'info');
    addLog('حذف ملف', `تم حذف الملف: ${target?.title || id}`, 'file');
    return true;
  };

  const incrementFileDownload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, downloadCount: f.downloadCount + 1 } : f))
    );
  };

  // Exam management & attempts
  const addExam = (examData: Omit<Exam, 'id' | 'createdAt' | 'status'>) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('إنشاء الاختبارات متاح للمشرفين فقط.', 'error');
      return false;
    }
    const newExam: Exam = {
      ...examData,
      id: `exm_${Date.now()}`,
      createdAt: new Date().toISOString().substring(0, 10),
      status: 'active',
    };
    setExams((prev) => [newExam, ...prev]);
    setCourses((prev) =>
      prev.map((c) => (c.id === newExam.courseId ? { ...c, examsCount: c.examsCount + 1 } : c))
    );
    showToast(`تم نشر اختبار "${newExam.title}" بنجاح!`, 'success');
    addLog('إنشاء اختبار', `تم إنشاء اختبار: ${newExam.title} (${newExam.questionsCount} سؤال)`, 'exam');
    return true;
  };

  const submitExamAttempt = (attemptData: Omit<ExamAttempt, 'id' | 'studentId' | 'studentName'>): ExamAttempt | null => {
    if (!currentUser) {
      showToast('الرجاء تسجيل الدخول أولاً لتسجيل المحاولة.', 'error');
      return null;
    }

    // Check if duplicate attempt already exists for this exam by this student
    const existing = attempts.find(
      (a) => a.examId === attemptData.examId && a.studentId === currentUser.id
    );
    if (existing) {
      showToast('لقد تم تسليم هذا الاختبار من قبل مسبقاً، ولا يمكن إعادة احتساب النتيجة مرتين.', 'info');
      return existing;
    }

    const newAttempt: ExamAttempt = {
      ...attemptData,
      id: `att_${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.name || currentUser.username || 'طالب',
    };

    setAttempts((prev) => [newAttempt, ...prev]);
    setLastAttemptId(newAttempt.id);
    showToast(`تم رصد نتيجتك بنجاح: ${newAttempt.score} من ${newAttempt.totalMarks}`, 'success');
    addLog('تسليم اختبار', `سجل الطالب ${currentUser.name || currentUser.username} درجة ${newAttempt.score}/${newAttempt.totalMarks} في ${newAttempt.examTitle}`, 'exam');
    return newAttempt;
  };

  // Tasks
  const addTask = (taskData: Omit<StudyTask, 'id' | 'completed'>) => {
    const newTask: StudyTask = {
      ...taskData,
      id: `tsk_${Date.now()}`,
      completed: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('تمت إضافة المهمة الدراسية بنجاح.', 'success');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Announcements
  const addAnnouncement = (data: Omit<Announcement, 'id' | 'date'>) => {
    if (currentUser?.role !== 'supervisor') {
      showToast('نشر الإعلانات متاح للمشرفين فقط.', 'error');
      return false;
    }
    const newAnc: Announcement = {
      ...data,
      id: `anc_${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
    };
    setAnnouncements((prev) => [newAnc, ...prev]);
    showToast('تم نشر الإعلان بنجاح لجميع طلاب البوابة.', 'success');
    addLog('نشر إعلان', `تم نشر إعلان: ${newAnc.title}`, 'system');
    return true;
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedCourseId,
        setSelectedCourseId,
        selectedExamId,
        setSelectedExamId,
        lastAttemptId,
        setLastAttemptId,
        previewFile,
        setPreviewFile,
        globalSearchQuery,
        setGlobalSearchQuery,

        currentUser,
        users,
        login,
        register,
        logout,
        switchRole,
        requestPasswordReset,

        courses,
        files,
        exams,
        attempts,
        schedule,
        tasks,
        announcements,
        notifications,
        logs,

        addCourse,
        updateCourse,
        deleteCourse,
        addFile,
        deleteFile,
        incrementFileDownload,
        addExam,
        submitExamAttempt,
        addTask,
        toggleTask,
        deleteTask,
        addAnnouncement,
        markNotificationAsRead,

        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
