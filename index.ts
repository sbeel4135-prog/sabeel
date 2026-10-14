export type UserCollege = 'كلية الشريعة' | 'قانون / أنظمة' | 'تخصص آخر';
export type UserRole = 'student' | 'supervisor';

export interface SecurityQuestions {
  fullName: string;
  birthYear: string;
  city: string;
  roleModel: string;
  favoriteBookOrSubject: string;
}

export interface User {
  id: string;
  username?: string;
  college?: UserCollege;
  name?: string;
  fullName?: string;
  gender?: 'ذكر' | 'أنثى';
  securityQuestions?: SecurityQuestions;
  email?: string;
  role?: UserRole;
  avatar?: string;
  studentId?: string;
  department?: string;
  term?: string;
  joinedDate?: string;
  createdAt?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  instructor: string;
  department: string;
  creditHours: number;
  description: string;
  color: string;
  progress: number;
  semester: string;
  booksCount: number;
  lecturesCount: number;
  examsCount: number;
  tags: string[];
}

export type FileCategory = 'book' | 'summary' | 'transcription' | 'audio' | 'questions';
export type FileFormat = 'pdf' | 'docx' | 'image' | 'audio';

export interface CourseFile {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  fileName: string;
  fileFormat: FileFormat;
  category: FileCategory;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  description?: string;
  downloadCount: number;
  previewText?: string;
  audioDuration?: string;
}

export interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

export interface Exam {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  questionsCount: number;
  availableUntil: string;
  questions: ExamQuestion[];
  createdAt: string;
  status: 'active' | 'upcoming' | 'closed';
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  timeSpentSeconds: number;
  answers: Record<string, number>; // questionId -> selectedIndex
}

export interface ScheduleItem {
  id: string;
  day: 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';
  time: string;
  title: string;
  courseCode: string;
  type: 'محاضرة' | 'حلقة نقاش' | 'اختبار' | 'مراجعة';
  location: string;
  instructor: string;
}

export interface StudyTask {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  completed: boolean;
  priority: 'عالية' | 'متوسطة' | 'عادية';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  important: boolean;
  category: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'exam' | 'file' | 'announcement' | 'system' | 'reminder';
}

export interface AdminLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  type: 'course' | 'file' | 'exam' | 'user' | 'system';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
}

export interface LectureItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  audioUrl?: string;
  videoUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  sourceType: 'recording' | 'upload' | 'video' | 'document';
  transcript?: string;
  summaryMode?: 'quick' | 'deep';
  summary?: {
    mainTopics: string[];
    scientificIssues: string[];
    benefitsAndRules: string[];
  };
  quickSummary?: {
    mainTopics: string[];
    scientificIssues: string[];
    benefitsAndRules: string[];
  };
  deepSummary?: {
    mainTopics: string[];
    scientificIssues: string[];
    benefitsAndRules: string[];
  };
}

export interface ActiveRecordingInfo {
  isRecording: boolean;
  isSummarizing?: boolean;
  summarizingStep?: string;
  lectureId?: string;
  courseId: string;
  courseTitle: string;
  customTitle: string;
  recordingSeconds: number;
  error: string | null;
}

