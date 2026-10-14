import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Volume2,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Copy,
  Check,
  Award,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Flame,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  Loader2,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { Course, LectureItem, ActiveRecordingInfo, User } from '../../types';
import { exportSummaryAsAcademicPdf } from '../../utils/pdfExport';
import { playCelebrationSound } from '../../utils/soundEffects';
import { InteractiveBookViewer } from '../InteractiveBookViewer';
import { CourseAIAssistant } from '../CourseAIAssistant';
import {
  storeBookPdfFile,
  getStoredBookPdfFile,
  deleteStoredBookPdfFile,
  getCachedBookPdfUrl,
} from '../../utils/bookStorage';
import {
  loadPdfDocument,
  extractTextFromPdfDoc,
  extractAllPagesText,
  cleanDestroyPdf,
  renderPdfPageToBase64Jpeg,
  getRepresentativeContentPage,
} from '../../utils/pdfViewerHelper';
import {
  arrayBufferToBase64,
  getSupportedAudioMimeType,
  getAudioMediaStream,
} from '../../utils/audioHelper';

interface CourseDetailViewProps {
  course: Course;
  onBack: () => void;
  onOpenAssistant: (initialQuestion?: string) => void;
  currentUser?: User | null;
  onEditCourseTitle?: (courseId: string, newTitle: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  activeRecording?: ActiveRecordingInfo;
  onStartGlobalRecording?: (course: Course, customTitle: string) => Promise<void>;
  onStopGlobalRecording?: () => void;
  onUpdateRecordingTitle?: (newTitle: string) => void;
  lecturesRevision?: number;
}


interface QuestionItem {
  id: string;
  questionType: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export interface AttachedBookData {
  fileName: string;
  uploadDate: string;
  fileSize: string;
  extractedText?: string;
  totalPages?: number;
  summary?: {
    mainTopics: string[];
    scientificIssues: string[];
    benefitsAndRules: string[];
  };
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  onBack,
  onOpenAssistant,
  currentUser,
  activeRecording,
  onStartGlobalRecording,
  onStopGlobalRecording,
  onUpdateRecordingTitle,
  lecturesRevision,
}) => {
  // 3 Primary Tabs
  const [activeTab, setActiveTab] = useState<'book' | 'lectures' | 'quiz'>('book');

  // User Gender & Greeting
  const userGender =
    currentUser?.gender ||
    (() => {
      try {
        const raw = localStorage.getItem('sabeel_current_user');
        return raw ? JSON.parse(raw)?.gender : 'أنثى';
      } catch {
        return 'أنثى';
      }
    })() ||
    'أنثى';
  const isMale = userGender === 'ذكر';
  const courseGreeting = isMale
    ? `السلام عليكم ورحمة الله وبركاته، أهلاً بكَ في مساعد سَبيل لمقرر ${course.title}`
    : `السلام عليكم ورحمة الله وبركاته، أهلاً بكِ في مساعد سَبيل لمقرر ${course.title}`;
  const congratulationText = isMale ? 'أحسنتَ بارك الله فيكَ!' : 'أحسنتِ بارك الله فيكِ!';

  // Total pages detected for book
  const [bookTotalPages, setBookTotalPages] = useState<number>(30);

  // Course AI Assistant State
  const [aiKnowledgeSource, setAiKnowledgeSource] = useState<'book' | 'lectures'>('book');
  const [aiBookSubMode, setAiBookSubMode] = useState<'qa' | 'pages' | 'fast_quiz' | 'deep_quiz'>('qa');

  // اسأل عن مسألة
  const [aiQuestionInput, setAiQuestionInput] = useState('');
  const [aiQuestionAnswer, setAiQuestionAnswer] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiQuestionError, setAiQuestionError] = useState<string | null>(null);

  // تلخيص واختبار الصفحات
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(2);
  const [rangeDepth, setRangeDepth] = useState<'سريع' | 'عميق'>('سريع');
  const [rangeSummaryResult, setRangeSummaryResult] = useState<any>(null);
  const [isGeneratingRangeSummary, setIsGeneratingRangeSummary] = useState(false);

  // Lecture Mode State in Assistant
  const [aiSelectedLectureId, setAiSelectedLectureId] = useState<string>('');
  const [aiLectureQaInput, setAiLectureQaInput] = useState('');
  const [aiLectureQaAnswer, setAiLectureQaAnswer] = useState<string | null>(null);
  const [isAskingLectureQa, setIsAskingLectureQa] = useState(false);

  // Attached Book State (persisted per course - starts empty until user attaches a book)
  const bookStorageKey = `sabeel_book_v3_${course.id}`;
  const loadBookFromStorage = (): AttachedBookData | null => {
    try {
      const saved = localStorage.getItem(bookStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const [attachedBook, setAttachedBook] = useState<AttachedBookData | null>(() =>
    loadBookFromStorage()
  );
  const [bookPdfUrl, setBookPdfUrl] = useState<string | null>(null);
  const [bookPdfBase64, setBookPdfBase64] = useState<string>('');
  const [bookPdfMimeType, setBookPdfMimeType] = useState<string>('application/pdf');
  const [lectureSummaryMode, setLectureSummaryMode] = useState<'quick' | 'deep'>('quick');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSummarizingBook, setIsSummarizingBook] = useState(false);
  const [bookSummaryError, setBookSummaryError] = useState<string | null>(null);
  const [copiedBookSummary, setCopiedBookSummary] = useState(false);
  const [isExportingBookPdf, setIsExportingBookPdf] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 3000);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadBookFromStorage();
    setAttachedBook(loaded);

    // Instant memory cache lookup to prevent white screen flash when switching courses!
    const cachedUrl = getCachedBookPdfUrl(course.id);
    if (cachedUrl) {
      setBookPdfUrl(cachedUrl);
    } else {
      setBookPdfUrl(null);
    }
    setBookPdfBase64('');

    // Restore PDF blob from IndexedDB if saved
    let active = true;
    getStoredBookPdfFile(course.id)
      .then(async (blob) => {
        if (!active || !blob) return;
        const objectUrl = getCachedBookPdfUrl(course.id) || URL.createObjectURL(blob);
        setBookPdfUrl(objectUrl);
        setBookPdfMimeType(blob.type || 'application/pdf');
        if (blob.size < 18 * 1024 * 1024) {
          const b64 = await blobToBase64(blob);
          if (active) setBookPdfBase64(b64);
        }

        // If book text was not yet extracted, extract in background now for Strict Grounding
        if (loaded && !loaded.extractedText) {
          try {
            const arrayBuf = await blob.arrayBuffer();
            const doc = await loadPdfDocument(arrayBuf);
            const extractRes = await extractTextFromPdfDoc(doc, 45);
            if (extractRes.hasEnoughText && active) {
              const updated = { ...loaded, extractedText: extractRes.text };
              setAttachedBook(updated);
              try {
                localStorage.setItem(bookStorageKey, JSON.stringify(updated));
              } catch (e) {}
            }
            cleanDestroyPdf(doc);
          } catch (err) {
            console.warn('Background text extraction fallback:', err);
          }
        }
      })
      .catch((e) => console.error('Error restoring book from storage:', e));

    return () => {
      active = false;
    };
  }, [course.id]);

  const saveBookToStorage = (data: AttachedBookData | null) => {
    setAttachedBook(data);
    try {
      if (data) {
        localStorage.setItem(bookStorageKey, JSON.stringify(data));
      } else {
        localStorage.removeItem(bookStorageKey);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Audio Recording & Upload State
  const [localIsRecording, setLocalIsRecording] = useState(false);
  const [localRecordingSeconds, setLocalRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Custom recording title input state
  const [customRecordingTitle, setCustomRecordingTitle] = useState<string>(
    activeRecording?.isRecording && activeRecording.courseId === course.id
      ? activeRecording.customTitle
      : ''
  );

  // Inline editing state for saved lecture titles
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editingLectureTitleValue, setEditingLectureTitleValue] = useState<string>('');

  const isGlobalRecordingThisCourse =
    Boolean(activeRecording?.isRecording && activeRecording.courseId === course.id);
  const isRecording = onStartGlobalRecording ? isGlobalRecordingThisCourse : localIsRecording;
  const recordingSeconds = onStartGlobalRecording
    ? activeRecording?.recordingSeconds || 0
    : localRecordingSeconds;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);

  // Lectures list persisted per course
  const storageKey = `sabeel_lectures_v2_${course.id}`;
  const loadLecturesFromStorage = (): LectureItem[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const [lectures, setLectures] = useState<LectureItem[]>(() => loadLecturesFromStorage());
  const [selectedLecture, setSelectedLecture] = useState<LectureItem | null>(() => {
    const initial = loadLecturesFromStorage();
    return initial.length > 0 ? initial[0] : null;
  });
  const [localIsSummarizing, setLocalIsSummarizing] = useState(false);
  const [localSummarizingStep, setLocalSummarizingStep] = useState<string>('');
  const isGlobalSummarizingThisCourse = Boolean(
    activeRecording?.isSummarizing && activeRecording.courseId === course.id
  );
  const isSummarizing = localIsSummarizing || isGlobalSummarizingThisCourse;
  const activeSummarizingStep =
    (isGlobalSummarizingThisCourse ? activeRecording?.summarizingStep : localSummarizingStep) ||
    'جاري تفريغ المحاضرة واستخلاص المحاور العلمية بالذكاء الاصطناعي...';

  // Sync lectures when global recording completes or course changes
  useEffect(() => {
    const fresh = loadLecturesFromStorage();
    setLectures((prev) => {
      // Preserve in-memory blob URLs (audioUrl / videoUrl / audioBase64) from current session
      return fresh.map((item) => {
        const inMem = prev.find((p) => p.id === item.id);
        return inMem
          ? {
              ...item,
              audioUrl: item.audioUrl || inMem.audioUrl,
              videoUrl: item.videoUrl || inMem.videoUrl,
              audioBase64: item.audioBase64 || inMem.audioBase64,
            }
          : item;
      });
    });
    if (fresh.length > 0) {
      setSelectedLecture((prev) => {
        if (!prev) return fresh[0];
        const updatedPrev = fresh.find((f) => f.id === prev.id);
        if (updatedPrev) {
          return {
            ...updatedPrev,
            audioUrl: updatedPrev.audioUrl || prev.audioUrl,
            videoUrl: updatedPrev.videoUrl || prev.videoUrl,
            audioBase64: updatedPrev.audioBase64 || prev.audioBase64,
          };
        }
        return fresh[0];
      });
    } else {
      setSelectedLecture(null);
    }
  }, [course.id, lecturesRevision]);

  // Save lectures to localStorage safely (excluding transient blob URLs and large base64 strings)
  useEffect(() => {
    try {
      const serializable = lectures.map(({ audioBase64, audioUrl, videoUrl, ...rest }) => rest);
      localStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.error(e);
    }
  }, [lectures, storageKey]);

  // Cleanup local fallback recording stream on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);


  // Question Bank State (On-demand only, never shown automatically)
  const [quizMode, setQuizMode] = useState<'mixed' | 'deep' | 'fast'>('mixed');
  const [quizSourceFilter, setQuizSourceFilter] = useState<'all' | 'book' | 'lectures'>('all');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionItem[]>([]);
  const [isQuizVisible, setIsQuizVisible] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [previousQuestionsHistory, setPreviousQuestionsHistory] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredState, setAnsweredState] = useState<'none' | 'correct' | 'wrong'>('none');
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showFloatingSuccess, setShowFloatingSuccess] = useState(false);

  // Reset quiz visibility when switching courses so questions are only shown on demand
  useEffect(() => {
    setGeneratedQuestions([]);
    setIsQuizVisible(false);
    setQuizError(null);
    setPreviousQuestionsHistory([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnsweredState('none');
    setScore(0);
    setTotalAnswered(0);
  }, [course.id]);

  const activeQuestion = generatedQuestions[currentQuestionIndex] || null;

  // Confetti and celebratory audio/visual trigger helper
  const triggerCelebration = () => {
    // 1. Confetti burst
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24', '#3b82f6', '#ec4899'],
      });
      // Second staggered wave for festive feel
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.2, y: 0.6 },
          colors: ['#10b981', '#34d399', '#fbbf24'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.8, y: 0.6 },
          colors: ['#10b981', '#34d399', '#fbbf24'],
        });
      }, 250);
    } catch (e) {
      console.warn('Confetti error', e);
    }

    // 2. Play celebratory firecracker crackles & fanfare sound synchronously
    playCelebrationSound();

    // 3. Trigger floating motivational text ("أحسنت بارك الله فيك!")
    setShowFloatingSuccess(true);
    setTimeout(() => {
      setShowFloatingSuccess(false);
    }, 2800);
  };

  // Convert Blob to base64 helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle PDF book upload (without automatic summarization - On-Demand only)
  const handleBookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setBookPdfUrl(objectUrl);

    // Save PDF file in IndexedDB for persistent browsing across reloads and navigation
    storeBookPdfFile(course.id, file).catch((err) =>
      console.warn('Could not store book in IndexedDB:', err)
    );

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const uploadDate = new Date().toLocaleDateString('ar-SA');

    let base64Data = '';
    if (file.size < 18 * 1024 * 1024) {
      try {
        base64Data = await blobToBase64(file);
        setBookPdfBase64(base64Data);
        setBookPdfMimeType(file.type || 'application/pdf');
      } catch (err) {}
    }

    const initialBook: AttachedBookData = {
      fileName: file.name,
      uploadDate,
      fileSize: sizeMB,
    };
    saveBookToStorage(initialBook);
    setBookSummaryError(null);
    e.target.value = '';

    // Asynchronously extract text in background non-blockingly so the UI remains 100% fluid
    setTimeout(async () => {
      try {
        const arrayBuf = await file.arrayBuffer();
        const doc = await loadPdfDocument(arrayBuf);
        const extractRes = await extractTextFromPdfDoc(doc, 35);
        if (extractRes.hasEnoughText) {
          const updated: AttachedBookData = {
            ...initialBook,
            extractedText: extractRes.text,
          };
          saveBookToStorage(updated);
        }
        cleanDestroyPdf(doc);
      } catch (extractErr) {
        console.warn('Background text extraction note:', extractErr);
      }
    }, 50);
  };

  // Resilient PDF document loader from memory or IndexedDB
  const resolveCurrentPdfDoc = async (): Promise<{ doc: any; cleanUp: () => void } | null> => {
    let doc: any = null;
    if (bookPdfUrl) {
      try {
        doc = await loadPdfDocument(bookPdfUrl);
      } catch (e) {
        console.warn('Could not load doc from bookPdfUrl:', e);
      }
    }
    if (!doc) {
      try {
        const blob = await getStoredBookPdfFile(course.id);
        if (blob) {
          const arrayBuf = await blob.arrayBuffer();
          doc = await loadPdfDocument(arrayBuf);
          if (!bookPdfUrl) {
            setBookPdfUrl(URL.createObjectURL(blob));
          }
        }
      } catch (storageErr) {
        console.warn('Could not load doc from IndexedDB storage:', storageErr);
      }
    }
    if (!doc) return null;
    return {
      doc,
      cleanUp: () => cleanDestroyPdf(doc),
    };
  };

  // Explicit On-Demand Summarization («تلخيص الدرس / تلخيص المحتوى»)
  const handleTriggerBookSummarize = async () => {
    if (!attachedBook) return;
    setIsSummarizingBook(true);
    setBookSummaryError(null);

    try {
      let extractedText = attachedBook.extractedText || '';
      let pageImageBase64: string | undefined = undefined;

      // Extract full text across all pages if not already extracted or incomplete
      if (!extractedText || extractedText.trim().length < 30) {
        const pdfResolved = await resolveCurrentPdfDoc();
        if (pdfResolved) {
          try {
            const extractRes = await extractAllPagesText(pdfResolved.doc);
            if (extractRes.hasEnoughText) {
              extractedText = extractRes.text;
              const updatedBook: AttachedBookData = {
                ...attachedBook,
                extractedText,
              };
              saveBookToStorage(updatedBook);
            } else {
              // Scanned PDF fallback
              const targetPage = getRepresentativeContentPage(pdfResolved.doc);
              pageImageBase64 = await renderPdfPageToBase64Jpeg(pdfResolved.doc, targetPage, 1.6);
            }
          } finally {
            pdfResolved.cleanUp();
          }
        }
      }

      const hasEnoughText = Boolean(extractedText && extractedText.trim().length >= 30);

      if (!hasEnoughText && !pageImageBase64) {
        setBookSummaryError(
          'عذراً، لم يتم العثور على نص مقروء كافٍ أو صورة لصفحة هذا الكتاب لإعداد التلخيص. يُرجى التأكد من وضوح ملف PDF.'
        );
        setIsSummarizingBook(false);
        return;
      }

      const res = await fetch('/api/gemini/summarize-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: bookPdfBase64 || undefined,
          mimeType: bookPdfMimeType || 'application/pdf',
          fileName: attachedBook.fileName,
          courseTitle: course.title,
          textContent: hasEnoughText ? extractedText : undefined,
          pageImageBase64: !hasEnoughText ? pageImageBase64 : undefined,
          summaryType: 'balanced',
          scope: 'all',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `[خطأ ${res.status}] تعذر إعداد التلخيص في الوقت الحالي.`);
      }

      const summarizedBook: AttachedBookData = {
        ...attachedBook,
        extractedText: extractedText || attachedBook.extractedText,
        summary: data.summary,
      };
      saveBookToStorage(summarizedBook);
    } catch (err: any) {
      console.warn('[CourseDetailView] Error in on-demand book summarization:', err);
      setBookSummaryError(err?.message || 'حدث خطأ أثناء إعداد الملخص الأكاديمي.');
    } finally {
      setIsSummarizingBook(false);
    }
  };

  const handleCopyBookSummary = () => {
    if (!attachedBook?.summary) return;
    const parts: string[] = [];
    parts.push(`ملخص كتاب: ${attachedBook.fileName} (${course.title} - ${attachedBook.uploadDate})`);
    parts.push(`\n1) أبرز المحاور:\n- ${attachedBook.summary.mainTopics.join('\n- ')}`);
    parts.push(`\n2) المسائل العلمية والفقهية المذكورة:\n- ${attachedBook.summary.scientificIssues.join('\n- ')}`);
    parts.push(`\n3) الفوائد والضوابط المستنبطة:\n- ${attachedBook.summary.benefitsAndRules.join('\n- ')}`);
    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedBookSummary(true);
    setTimeout(() => setCopiedBookSummary(false), 2000);
  };

  const handleExportBookSummaryPdf = async () => {
    if (!attachedBook?.summary) return;
    setIsExportingBookPdf(true);
    try {
      const pseudoLecture: LectureItem = {
        id: `book_${course.id}`,
        title: `تلخيص كتاب: ${attachedBook.fileName.replace(/\.[^/.]+$/, '')}`,
        date: attachedBook.uploadDate,
        duration: 'الكتاب المقرر',
        sourceType: 'upload',
        summary: attachedBook.summary,
      };
      await exportSummaryAsAcademicPdf(course, pseudoLecture);
    } catch (err) {
      console.error('Book PDF export error:', err);
    } finally {
      setIsExportingBookPdf(false);
    }
  };

  // Pick supported audio mimeType for MediaRecorder dynamically
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  // Default lecture title helper: محاضرة [اسم المقرر] - [التاريخ]
  const getDefaultLectureTitle = () => {
    const todayStr = new Date().toLocaleDateString('ar-SA');
    return `محاضرة ${course.title} - ${todayStr}`;
  };

  // Start Mic Recording directly on click
  const handleStartRecording = async () => {
    setRecordingError(null);
    if (onStartGlobalRecording) {
      await onStartGlobalRecording(course, customRecordingTitle.trim());
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRecordingError('متصفحك الحالي لا يدعم ميزة تسجيل الصوت المباشر. يمكنك رفع ملف صوتي جاهز.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setLocalRecordingSeconds(0);

      const mimeType = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find(
        (type) =>
          typeof MediaRecorder !== 'undefined' &&
          typeof MediaRecorder.isTypeSupported === 'function' &&
          MediaRecorder.isTypeSupported(type)
      );

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const totalSecs = Math.max(1, recordingSecondsRef.current);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

        let base64Data = '';
        try {
          base64Data = await blobToBase64(audioBlob);
        } catch (err) {
          console.error('Error converting audio blob to base64:', err);
        }

        const finalTitle = customRecordingTitle.trim() || getDefaultLectureTitle();

        const newLec: LectureItem = {
          id: `rec_${Date.now()}`,
          title: finalTitle,
          date: new Date().toLocaleDateString('ar-SA'),
          duration: durStr,
          audioUrl,
          audioBase64: base64Data,
          mimeType: finalMimeType,
          sourceType: 'recording',
        };

        setLectures((prev) => [newLec, ...prev]);
        setSelectedLecture(newLec);
        setLocalIsRecording(false);
        setLocalRecordingSeconds(0);
        setCustomRecordingTitle('');
      };

      // Request data chunks every 500ms so buffer is always populated
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setLocalIsRecording(true);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setLocalRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err?.name, err?.message);
      setLocalIsRecording(false);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setRecordingError(
        isPermissionDenied
          ? 'تعذر الوصول إلى الميكروفون. يرجى السماح بإذن استخدام الميكروفون في المتصفح ثم المحاولة مرة أخرى.'
          : (err?.message || 'تعذر تشغيل الميكروفون.')
      );
    }
  };

  // Stop Mic Recording and Save Audio
  const handleStopRecording = () => {
    if (onStopGlobalRecording && isGlobalRecordingThisCourse) {
      onStopGlobalRecording();
      setCustomRecordingTitle('');
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setLocalIsRecording(false);
    }
  };

  // Handle editing saved lecture title
  const startEditingLectureTitle = (lec: LectureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLectureId(lec.id);
    setEditingLectureTitleValue(lec.title);
  };

  const saveEditedLectureTitle = (lecId: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = editingLectureTitleValue.trim() || getDefaultLectureTitle();
    setLectures((prev) =>
      prev.map((l) => (l.id === lecId ? { ...l, title: trimmed } : l))
    );
    if (selectedLecture?.id === lecId) {
      setSelectedLecture((prev) => (prev ? { ...prev, title: trimmed } : null));
    }
    setEditingLectureId(null);
    setEditingLectureTitleValue('');
  };

  const cancelEditingLectureTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLectureId(null);
    setEditingLectureTitleValue('');
  };

  // Copy formatted summary to clipboard
  const handleCopySummaryText = (lec: LectureItem) => {
    const parts: string[] = [];
    parts.push(`ملخص محاضرة: ${lec.title} (${course.title} - ${lec.date})`);
    if (lec.summary) {
      parts.push(`\n1) أبرز المحاور:\n- ${lec.summary.mainTopics.join('\n- ')}`);
      parts.push(`\n2) المسائل العلمية والفقهية المذكورة:\n- ${lec.summary.scientificIssues.join('\n- ')}`);
      parts.push(`\n3) الفوائد والضوابط المستنبطة:\n- ${lec.summary.benefitsAndRules.join('\n- ')}`);
    }
    if (lec.transcript) {
      parts.push(`\nالنص المفرّغ:\n${lec.transcript}`);
    }
    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedSummary(true);
    setToastMessage('تم نسخ التلخيص بنجاح');
    setTimeout(() => {
      setCopiedSummary(false);
      setToastMessage(null);
    }, 2500);
  };

  // Export Summary as Academic PDF
  const handleExportPdf = async (lec: LectureItem) => {
    setIsExportingPdf(true);
    try {
      await exportSummaryAsAcademicPdf(course, lec);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };


  // Extract compact audio/media base64 safely (avoids browser crash on large video/audio files)
  const safeMediaToBase64 = async (file: File): Promise<string> => {
    // If file is <= 28MB, convert directly
    if (file.size <= 28 * 1024 * 1024) {
      return await blobToBase64(file);
    }
    // If file is larger than 28MB, take the first 22MB slice so browser & server never crash
    const sliced = file.slice(0, 22 * 1024 * 1024, file.type);
    return await blobToBase64(sliced);
  };

  // Handle Lecture File Upload (Video: mp4, mov, webm | Audio: mp3, m4a, wav | Document: pdf, txt)
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordingError(null);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isPdfOrDoc =
      ext === 'pdf' ||
      ext === 'txt' ||
      file.type === 'application/pdf' ||
      file.type === 'text/plain';

    const isVideoFile =
      file.type.startsWith('video/') ||
      ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi'].includes(ext);

    if (isPdfOrDoc) {
      let base64Data = '';
      try {
        if (file.size < 20 * 1024 * 1024) {
          base64Data = await blobToBase64(file);
        }
      } catch (err) {
        console.error('Failed to read uploaded lecture document:', err);
      }

      const newLec: LectureItem = {
        id: `doc_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        date: new Date().toLocaleDateString('ar-SA'),
        duration: `ملف محاضرة (${ext?.toUpperCase() || 'PDF'})`,
        sourceType: 'document',
      };

      setLectures((prev) => [newLec, ...prev]);
      setSelectedLecture(newLec);
      e.target.value = '';
      return;
    }

    const mediaObjectUrl = URL.createObjectURL(file);
    let base64Data = '';
    try {
      base64Data = await safeMediaToBase64(file);
    } catch (err) {
      console.error('Failed to read uploaded media file:', err);
    }

    // Determine MIME type accurately for video (mp4, mov, webm) and audio (mp3, m4a, wav)
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (isVideoFile) {
        if (ext === 'webm') mimeType = 'video/webm';
        else mimeType = 'video/mp4';
      } else {
        if (ext === 'mp3') mimeType = 'audio/mp3';
        else if (ext === 'm4a') mimeType = 'audio/mp4';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else mimeType = 'audio/mpeg';
      }
    } else if (mimeType === 'video/quicktime') {
      mimeType = 'video/mp4';
    } else if (mimeType === 'audio/x-m4a' || mimeType === 'audio/m4a') {
      mimeType = 'audio/mp4';
    }

    const newLec: LectureItem = {
      id: `${isVideoFile ? 'vid' : 'aud'}_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      date: new Date().toLocaleDateString('ar-SA'),
      duration: isVideoFile
        ? `مقطع فيديو (${ext.toUpperCase() || 'MP4'})`
        : `ملف صوتي (${ext.toUpperCase() || 'AUDIO'})`,
      audioUrl: !isVideoFile ? mediaObjectUrl : undefined,
      videoUrl: isVideoFile ? mediaObjectUrl : undefined,
      audioBase64: base64Data,
      mimeType,
      sourceType: isVideoFile ? 'video' : 'upload',
    };

    setLectures((prev) => [newLec, ...prev]);
    setSelectedLecture(newLec);
    e.target.value = '';
  };

  // Delete a lecture item
  const handleDeleteLecture = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLectures((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      if (selectedLecture?.id === id) {
        setSelectedLecture(updated[0] || null);
      }
      return updated;
    });
  };

  // Transcribe & Summarize Lecture via AI strictly from speaker audio/video with Smart Retry
  const handleSummarizeLecture = async (
    lec: LectureItem,
    overrideBase64?: string,
    overrideMimeType?: string,
    overrideSummaryMode?: 'quick' | 'deep'
  ) => {
    const targetMode = overrideSummaryMode || lectureSummaryMode;
    setLocalIsSummarizing(true);
    setLocalSummarizingStep('جاري قراءة ملف المحاضرة واستدعاء الذكاء الاصطناعي...');
    setRecordingError(null);
    try {
      let base64ToUse = overrideBase64 || lec.audioBase64 || '';
      const mimeToUse = overrideMimeType || lec.mimeType || 'audio/webm';

      // If base64 isn't in memory but audioUrl or videoUrl blob exists, read it safely
      const mediaUrl = lec.audioUrl || lec.videoUrl;
      if (!base64ToUse && mediaUrl && !lec.transcript) {
        try {
          const blobRes = await fetch(mediaUrl);
          const blob = await blobRes.blob();
          const sliced = blob.size > 25 * 1024 * 1024 ? blob.slice(0, 20 * 1024 * 1024, blob.type) : blob;
          base64ToUse = await blobToBase64(sliced);
        } catch {
          // ignore
        }
      }

      const maxAttempts = 3;
      let data: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            setLocalSummarizingStep(
              `إعادة المحاولة الذكية (${attempt} من ${maxAttempts}) للاتصال بـ Gemini...`
            );
            await new Promise((res) => setTimeout(res, attempt * 1200));
          } else {
            setLocalSummarizingStep(
              targetMode === 'deep'
                ? 'جاري تفريغ الصوت وإعداد التلخيص العلمي العميق والمفصل...'
                : 'جاري تفريغ الصوت واستخلاص المحاور واللباب السريع...'
            );
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000);

          const res = await fetch('/api/gemini/transcribe-and-summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64ToUse || undefined,
              mimeType: mimeToUse,
              existingTranscript: lec.transcript || undefined,
              lectureTitle: lec.title,
              courseTitle: course.title,
              summaryMode: targetMode,
              gender: currentUser?.gender,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            const parsed = await res.json().catch(() => null);
            if (parsed && (parsed.summary || parsed.transcript)) {
              data = parsed;
              break;
            }
          }
        } catch (attemptErr) {
          console.warn(`handleSummarizeLecture attempt ${attempt} failed:`, attemptErr);
        }
      }

      const updatedLec: LectureItem = {
        ...lec,
        transcript:
          data?.transcript ||
          lec.transcript ||
          'تم حفظ التسجيل بنجاح. تعذر استخراج النص الكامل آلياً، يمكنك المحاولة مجدداً عبر زر «إعادة التلخيص».',
        summary: {
          mainTopics: data?.summary?.mainTopics || [`محاضرة: ${lec.title}`],
          scientificIssues:
            data?.summary?.scientificIssues || ['لم تُذكر مسائل علمية أو فقهية في التسجيل.'],
          benefitsAndRules:
            data?.summary?.benefitsAndRules || ['لم ترد فوائد أو ضوابط في التسجيل.'],
        },
      };

      setLectures((prev) => prev.map((l) => (l.id === lec.id ? updatedLec : l)));
      setSelectedLecture(updatedLec);
    } catch (err) {
      console.error(err);
      setRecordingError(
        'حدث خطأ أثناء تفريغ وتلخيص المحاضرة. يرجى التأكد من وضوح الصوت أو الفيديو والمحاولة مجدداً.'
      );
    } finally {
      setLocalIsSummarizing(false);
      setLocalSummarizingStep('');
    }
  };

  // Build source material string from attached book and/or lectures
  const buildQuizSourceMaterial = (
    sourceChoice: 'all' | 'book' | 'lectures',
    overrideBookText?: string
  ): string => {
    const chunks: string[] = [];
    chunks.push(`اسم المقرر الدراسي: ${course.title}`);

    if ((sourceChoice === 'all' || sourceChoice === 'book') && attachedBook) {
      chunks.push(`=== الكتاب الدراسي المرفق: ${attachedBook.fileName} ===`);
      const bookText = overrideBookText || attachedBook.extractedText;
      if (bookText) {
        chunks.push(
          `نص صفحات ومسائل الكتاب المقرر المعتمد:\n"""\n${bookText.slice(0, 25000)}\n"""`
        );
      }
      if (attachedBook.summary) {
        chunks.push(`أبرز المحاور:\n- ${attachedBook.summary.mainTopics.join('\n- ')}`);
        chunks.push(
          `المسائل العلمية والفقهية:\n- ${attachedBook.summary.scientificIssues.join('\n- ')}`
        );
        chunks.push(
          `الفوائد والضوابط المستنبطة:\n- ${attachedBook.summary.benefitsAndRules.join('\n- ')}`
        );
      }
    }

    if ((sourceChoice === 'all' || sourceChoice === 'lectures') && lectures.length > 0) {
      lectures.forEach((lec, idx) => {
        chunks.push(`=== المحاضرة (${idx + 1}): ${lec.title} (${lec.date}) ===`);
        if (lec.transcript) {
          chunks.push(`النص المفرغ للمحاضرة:\n${lec.transcript}`);
        }
        if (lec.summary) {
          chunks.push(`أبرز المحاور:\n- ${lec.summary.mainTopics.join('\n- ')}`);
          chunks.push(
            `المسائل العلمية والفقهية:\n- ${lec.summary.scientificIssues.join('\n- ')}`
          );
          chunks.push(
            `الفوائد والضوابط المستنبطة:\n- ${lec.summary.benefitsAndRules.join('\n- ')}`
          );
        }
      });
    }

    return chunks.join('\n\n');
  };

  // Request on-demand varied questions from the attached book / lectures
  const handleRequestQuestions = async (overrideMode?: 'mixed' | 'deep' | 'fast') => {
    const targetMode = overrideMode || quizMode;
    setQuizError(null);

    const hasBook = Boolean(attachedBook);
    const hasLectures = lectures.length > 0;

    if (!hasBook && !hasLectures) {
      setQuizError('يرجى إرفاق الكتاب الدراسي أو تسجيل/إرفاق محاضرة أولاً لتوليد الأسئلة منها.');
      return;
    }

    const effectiveSource =
      quizSourceFilter === 'book' && !hasBook
        ? 'lectures'
        : quizSourceFilter === 'lectures' && !hasLectures
        ? 'book'
        : quizSourceFilter;

    setIsGeneratingQuiz(true);

    try {
      let pageImageBase64: string | undefined = undefined;
      let currentBookText = attachedBook?.extractedText || '';

      // Check if we need to extract book text or provide multimodal fallback for scanned PDFs
      if (hasBook && (effectiveSource === 'book' || effectiveSource === 'all')) {
        if (!currentBookText || currentBookText.trim().length < 30) {
          // Attempt on-demand deep text extraction from the PDF document
          const pdfResolved = await resolveCurrentPdfDoc();
          if (pdfResolved) {
            try {
              const extractRes = await extractTextFromPdfDoc(pdfResolved.doc, 60);
              if (extractRes.hasEnoughText) {
                currentBookText = extractRes.text;
                const updatedBook: AttachedBookData = {
                  ...attachedBook!,
                  extractedText: currentBookText,
                };
                saveBookToStorage(updatedBook);
              } else {
                // Scanned PDF (image-based): Fallback to Multimodal Image Input
                const targetPage = getRepresentativeContentPage(pdfResolved.doc);
                pageImageBase64 = await renderPdfPageToBase64Jpeg(pdfResolved.doc, targetPage, 1.6);
              }
            } finally {
              pdfResolved.cleanUp();
            }
          }
        }
      }

      // Build text context if we have text
      let sourceText = '';
      if (!pageImageBase64 || effectiveSource === 'lectures' || effectiveSource === 'all') {
        sourceText = buildQuizSourceMaterial(effectiveSource, currentBookText);
      }

      const hasEnoughSource = Boolean(sourceText && sourceText.trim().length >= 30);
      if (!hasEnoughSource && !pageImageBase64) {
        throw new Error(
          'عذراً، لم يتم العثور على محتوى كافٍ في صفحات هذا الكتاب لتوليد الأسئلة. يُرجى التأكد من وضوح ملف PDF أو تسجيل محاضرة.'
        );
      }

      const includeBookPdf =
        (effectiveSource === 'all' || effectiveSource === 'book') && bookPdfBase64
          ? bookPdfBase64
          : undefined;

      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.title,
          quizMode: targetMode,
          sourceText: pageImageBase64 && !hasEnoughSource ? undefined : sourceText,
          pageImageBase64: !hasEnoughSource ? pageImageBase64 : undefined,
          pdfBase64: includeBookPdf,
          pdfMimeType: bookPdfMimeType,
          previousQuestions: previousQuestionsHistory,
          count: 5,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `[خطأ ${res.status}] تعذر توليد الأسئلة في الوقت الحالي.`);
      }

      const newQuestions: QuestionItem[] = Array.isArray(data?.questions) ? data.questions : [];

      if (newQuestions.length === 0) {
        throw new Error('لم يتمكن النظام من استخراج أسئلة كافية، يرجى المحاولة مرة أخرى.');
      }

      setGeneratedQuestions(newQuestions);
      setIsQuizVisible(true);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setAnsweredState('none');
      setPreviousQuestionsHistory((prev) => [
        ...prev,
        ...newQuestions.map((q) => q.question),
      ]);
    } catch (err: any) {
      console.warn('[CourseDetailView] Quiz generation error:', err);
      setQuizError(err?.message || 'حدث خطأ أثناء توليد الأسئلة من المحتوى المرفق.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle Question Answer
  const handleAnswerSelect = (optionIdx: number) => {
    if (!activeQuestion || answeredState !== 'none') return;
    setSelectedAnswer(optionIdx);

    const isCorrect = optionIdx === activeQuestion.correctIndex;
    if (isCorrect) {
      setAnsweredState('correct');
      setScore((s) => s + 1);
      triggerCelebration();
    } else {
      setAnsweredState('wrong');
    }
    setTotalAnswered((t) => t + 1);
  };

  const handleNextQuestion = () => {
    if (generatedQuestions.length === 0) return;
    setSelectedAnswer(null);
    setAnsweredState('none');
    setCurrentQuestionIndex((prev) => (prev + 1) % generatedQuestions.length);
  };

  const handlePrevQuestion = () => {
    if (generatedQuestions.length === 0) return;
    setSelectedAnswer(null);
    setAnsweredState('none');
    setCurrentQuestionIndex((prev) =>
      prev - 1 < 0 ? generatedQuestions.length - 1 : prev - 1
    );
  };

  const handleModeSwitch = (mode: 'mixed' | 'deep' | 'fast') => {
    setQuizMode(mode);
    if (isQuizVisible) {
      handleRequestQuestions(mode);
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in max-w-5xl mx-auto w-full px-2 sm:px-4">
      {/* Top Breadcrumb & Return to main */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#2e493b] transition-colors cursor-pointer group"
        >
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          <span>العودة للمقررات</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAssistant(`عندي سؤال واستفسار بخصوص مقرر: ${course.title}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8eee9] hover:bg-[#dfe6df] text-[#2e493b] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3a5d4a]" />
            <span>اسأل المساعد في هذا المقرر</span>
          </button>
        </div>
      </div>

      {/* Course Title Banner (Clean: Course Name + Optional Hours + Optional Instructor) */}
      <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 sm:p-7 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {course.creditHours && course.creditHours > 0 ? (
            <span className="text-xs font-bold text-[#2e493b] bg-[#e8eee9] px-3 py-0.5 rounded-full">
              {course.creditHours} ساعات معتمدة
            </span>
          ) : null}
          {course.instructor ? (
            <span className="text-xs text-stone-600 font-semibold bg-stone-100 px-3 py-0.5 rounded-full">
              دكتور المقرر: {course.instructor}
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20352a] font-cairo">
          {course.title}
        </h1>
      </div>

      {/* 3 Main Sections Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-200/60 rounded-2xl border border-stone-300/60 text-center font-bold text-xs sm:text-sm">
        {/* Tab 1: الكتاب الدراسي */}
        <button
          onClick={() => setActiveTab('book')}
          className={`py-3 px-2 sm:px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'book'
              ? 'bg-white text-[#2e493b] shadow-xs font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#3a5d4a]" />
          <span>1. الكتاب الدراسي</span>
        </button>

        {/* Tab 2: المحاضرات */}
        <button
          onClick={() => setActiveTab('lectures')}
          className={`py-3 px-2 sm:px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'lectures'
              ? 'bg-white text-[#2e493b] shadow-xs font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Volume2 className="w-4 h-4 text-[#3a5d4a]" />
          <span>2. المحاضرات</span>
        </button>

        {/* Tab 3: المساعد الذكي للمقرر */}
        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-3 px-2 sm:px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-white text-[#2e493b] shadow-xs font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Bot className="w-4 h-4 text-[#3a5d4a]" />
          <span>3. المساعد الذكي للمقرر</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. قسم «الكتاب الدراسي»: يظهر التلخيص فقط بعد إرفاق ملف الكتاب (PDF)        */}
      {/* ========================================================================= */}
      {activeTab === 'book' && (
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleBookUpload}
          />

          {!attachedBook ? (
            /* Empty State before attaching any book — No automatic summary! */
            <div className="bg-white rounded-3xl border-2 border-dashed border-[#2e493b]/25 p-8 sm:p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center mx-auto shadow-2xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-[#20352a]">
                  لم يتم إرفاق كتاب لهذا المقرر بعد
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  لا يظهر أي تلخيص تلقائي عند الدخول للمقرر؛ قومي بإرفاق ملف الكتاب الدراسي (PDF) ليتم عرضه وتوليد التلخيص العلمي المنهجي له، أو انتقلي لتبويب «المحاضرات» لتسجيل أو إرفاق محاضرة.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>إرفاق الكتاب الدراسي (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('lectures')}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-[#20352a] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Mic className="w-4 h-4 text-[#2e493b]" />
                  <span>تسجيل أو إرفاق محاضرة</span>
                </button>
              </div>
            </div>
          ) : (
            /* Attached Book Info, PDF Preview & Generated Summary */
            <div className="space-y-6">
              {/* Attached Book Top Bar */}
              <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#20352a]">
                        {attachedBook.fileName}
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300/60">
                        جاهز للتصفح والتوصيف المباشر
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      تم الإرفاق بتاريخ: {attachedBook.uploadDate} · الحجم: {attachedBook.fileSize}
                      {attachedBook.extractedText && ' · تم استخراج النص والربط الذكي بنجاح'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-[#e8eee9] hover:bg-[#2e493b] text-[#2e493b] hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>تغيير الكتاب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveBookToStorage(null);
                      setBookPdfUrl(null);
                      deleteStoredBookPdfFile(course.id).catch(console.error);
                    }}
                    className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="حذف الكتاب المرفق"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Book Viewer & Editor (Highlighting, Writing Notes, Bookmarks & Auto-save) */}
              <InteractiveBookViewer
                fileName={attachedBook.fileName}
                fileSize={attachedBook.fileSize}
                uploadDate={attachedBook.uploadDate}
                bookPdfUrl={bookPdfUrl}
                courseId={course.id}
                courseTitle={course.title}
                onExtractedText={(text) => {
                  if (attachedBook && (!attachedBook.extractedText || attachedBook.extractedText.length < 50)) {
                    const updated = { ...attachedBook, extractedText: text };
                    saveBookToStorage(updated);
                  }
                }}
                onAskAiAboutBook={(selectedText) => {
                  onOpenAssistant(`عندي سؤال واستفسار من كتاب مقرر ${course.title}:\n"${selectedText}"`);
                }}
                onBack={onBack}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. قسم «المحاضرات»: تسجيل الصوت مباشرة أو رفع ملف وتلخيص ذكي تلقائي        */}
      {/* ========================================================================= */}
      {activeTab === 'lectures' && (
        <div className="space-y-6">
          {/* Recording & Uploading Action Card */}
          <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#20352a] mb-1">
                تسجيل أو رفع محاضرة صوتية وتفريغها وتلخيصها
              </h3>
              <p className="text-xs text-stone-500">
                سجّل المحاضرة مباشرة عبر الميكروفون أو ارفع ملفاً صوتياً جاهزاً (MP3, M4A, WAV)، ليتم تفريغ الصوت إلى نص مطابق تماماً لكلام المحاضر دون أي زيادة، وتقسيم الملخص إلى (أبرز المحاور، المسائل العلمية والفقهية، والفوائد والضوابط المستنبطة).
              </p>
            </div>

            {(recordingError || activeRecording?.error) && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{recordingError || activeRecording?.error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Recorder Option */}
              <div
                className={`p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-3.5 ${
                  isRecording
                    ? 'border-rose-400 bg-rose-50/40 shadow-sm'
                    : 'border-[#2e493b]/25 bg-[#f7f9f7]'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white shadow-md scale-105'
                        : 'bg-[#e8eee9] text-[#2e493b]'
                    }`}
                  >
                    <Mic className="w-7 h-7" />
                  </div>
                  {isRecording && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 w-full">
                  <h4 className="text-sm font-bold text-[#20352a]">
                    {isRecording ? 'الميكروفون يسجل المحاضرة الآن...' : 'تسجيل صوتي مباشر من الميكروفون'}
                  </h4>

                  {/* Clear Pulsing Red Dot + Timer Indicator */}
                  {isRecording && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 shadow-2xs">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-80" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                      </span>
                      <span className="text-base font-mono font-extrabold text-rose-600 tracking-wider">
                        {Math.floor(recordingSeconds / 60) < 10 ? '0' : ''}
                        {Math.floor(recordingSeconds / 60)}:
                        {recordingSeconds % 60 < 10 ? '0' : ''}
                        {recordingSeconds % 60}
                      </span>
                      <span className="text-[11px] font-bold text-rose-700">قيد التسجيل</span>
                    </div>
                  )}

                  {/* Custom Lecture Title Input Field */}
                  <div className="pt-1 max-w-xs mx-auto w-full text-right">
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      عنوان المحاضرة (اختياري):
                    </label>
                    <input
                      type="text"
                      value={customRecordingTitle}
                      onChange={(e) => {
                        setCustomRecordingTitle(e.target.value);
                        if (isRecording && onUpdateRecordingTitle) {
                          onUpdateRecordingTitle(e.target.value);
                        }
                      }}
                      placeholder={`مثال: أصول الفقه - باب القياس (الافتراضي: ${getDefaultLectureTitle()})`}
                      className="w-full py-2 px-3 text-xs bg-white border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] placeholder-stone-400"
                    />
                  </div>

                  <p className="text-[11px] text-stone-500">
                    {isRecording
                      ? 'يمكنك التنقل بحرية داخل الموقع أثناء التسجيل، أو الضغط أدناه لإيقاف وحفظ الصوت وتلخيصه'
                      : 'في حال ترك الحقل فارغاً سيُحفظ تلقائياً باسم: (' + getDefaultLectureTitle() + ')'}
                  </p>
                </div>

                {isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>إيقاف وحفظ الصوت وتلخيص المحاضرة</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                  >
                    <Mic className="w-4 h-4" />
                    <span>بدء تسجيل المحاضرة</span>
                  </button>
                )}
              </div>

              {/* Lecture File Upload Option (Video, Audio, or PDF/Text) */}
              <div className="p-5 rounded-2xl border-2 border-dashed border-stone-200 bg-[#fdfdfc] flex flex-col items-center justify-center text-center space-y-3.5">
                <div className="w-14 h-14 rounded-full bg-stone-100 text-[#2e493b] flex items-center justify-center">
                  <Volume2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#20352a]">
                    إرفاق محاضرة (مقطع فيديو أو صوت أو ملف PDF)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    يدعم مقاطع الفيديو والملفات الصوتية والمستندات: <span className="font-mono font-bold text-[#2e493b]">MP4, MOV, WebM, MP3, M4A, WAV, PDF</span>
                  </p>
                </div>
                <input
                  ref={audioUploadRef}
                  type="file"
                  accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.m4a,.wav,.pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={handleAudioUpload}
                />
                <button
                  type="button"
                  onClick={() => audioUploadRef.current?.click()}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-[#e8eee9] text-[#20352a] hover:text-[#2e493b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>إرفاق مقطع فيديو أو صوت للمحاضرة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lectures List & AI Summary Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <h4 className="text-xs font-bold text-stone-600 px-1">
                المحاضرات والتسجيلات المحفوظة ({lectures.length})
              </h4>
              {lectures.length > 0 ? (
                <div className="space-y-2">
                  {lectures.map((lec) => {
                    const isEditingThisLec = editingLectureId === lec.id;
                    return (
                      <div
                        key={lec.id}
                        onClick={() => {
                          if (!isEditingThisLec) setSelectedLecture(lec);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                          selectedLecture?.id === lec.id
                            ? 'bg-white border-[#2e493b] shadow-xs ring-1 ring-[#2e493b]'
                            : 'bg-white/70 border-stone-200 hover:bg-white'
                        }`}
                      >
                        {isEditingThisLec ? (
                          <form
                            onSubmit={(e) => saveEditedLectureTitle(lec.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="space-y-2"
                          >
                            <label className="block text-[10px] font-bold text-[#2e493b]">
                              تعديل عنوان التسجيل:
                            </label>
                            <input
                              type="text"
                              value={editingLectureTitleValue}
                              onChange={(e) => setEditingLectureTitleValue(e.target.value)}
                              autoFocus
                              className="w-full py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] font-bold"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={cancelEditingLectureTitle}
                                className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>إلغاء</span>
                              </button>
                              <button
                                type="submit"
                                className="px-2.5 py-1 rounded-lg bg-[#2e493b] hover:bg-[#385947] text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>حفظ الاسم</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-[#20352a] truncate">
                                  {lec.title}
                                </p>
                                {isSummarizing &&
                                  (activeRecording?.lectureId === lec.id ||
                                    activeRecording?.customTitle === lec.title ||
                                    (selectedLecture?.id === lec.id && !lec.summary)) && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300/60 animate-pulse">
                                      <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                      <span>جاري التلخيص...</span>
                                    </span>
                                  )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                                <span>{lec.date}</span>
                                <span>·</span>
                                <span className="font-mono">{lec.duration}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => startEditingLectureTitle(lec, e)}
                                title="تعديل اسم التسجيل"
                                className="px-2 py-1.5 text-stone-500 hover:text-[#2e493b] hover:bg-[#e8eee9] rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLecture(lec.id, e)}
                                title="حذف التسجيل"
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-stone-200 text-center space-y-2">
                  <Mic className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-600">لا توجد تسجيلات صوتية بعد</p>
                  <p className="text-[11px] text-stone-400">
                    ابدأ بتسجيل محاضرة جديدة أو ارفع ملفاً صوتياً (MP3, M4A, WAV) ليظهر تفريغه وتلخيصه هنا.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Lecture Details, Verbatim Transcript & 3-Section AI Summary (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-5">
              {selectedLecture ? (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#3a5d4a] bg-[#e8eee9] px-2.5 py-0.5 rounded-full">
                        {selectedLecture.sourceType === 'recording'
                          ? 'تسجيل ميكروفون مباشر'
                          : selectedLecture.sourceType === 'video'
                          ? 'مقطع فيديو مرفق'
                          : selectedLecture.sourceType === 'document'
                          ? 'ملف محاضرة نصي / PDF'
                          : 'ملف صوتي مرفوع'}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <h3 className="text-base font-bold text-[#20352a]">
                          {selectedLecture.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => startEditingLectureTitle(selectedLecture, e)}
                          title="تعديل عنوان المحاضرة"
                          className="p-1 text-stone-400 hover:text-[#2e493b] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        المدة: {selectedLecture.duration} · التاريخ: {selectedLecture.date}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSummarizing}
                      onClick={() => handleSummarizeLecture(selectedLecture)}
                      className="px-3.5 py-1.5 bg-[#e8eee9] hover:bg-[#dfe6df] text-[#2e493b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#3a5d4a]" />
                      <span>{isSummarizing ? 'جاري المعالجة...' : 'إعادة التفريغ والتلخيص'}</span>
                    </button>
                  </div>

                  {/* Video or Audio Player if present */}
                  {selectedLecture.videoUrl && (
                    <div className="bg-[#f7f9f7] p-3 rounded-2xl border border-[#2e493b]/10 space-y-2">
                      <span className="text-[11px] font-bold text-[#2e493b] block px-1">
                        مشاهدة مقطع فيديو المحاضرة المرفق:
                      </span>
                      <video
                        controls
                        src={selectedLecture.videoUrl}
                        className="w-full max-h-72 rounded-xl bg-black"
                      />
                    </div>
                  )}

                  {selectedLecture.audioUrl && (
                    <div className="bg-[#f7f9f7] p-3 rounded-2xl border border-[#2e493b]/10 space-y-1.5">
                      <span className="text-[11px] font-bold text-[#2e493b] block px-1">
                        الاستماع للتسجيل الصوتي المحفوظ:
                      </span>
                      <audio controls src={selectedLecture.audioUrl} className="w-full h-9" />
                    </div>
                  )}

                  {/* AI Verbatim Transcript & 3-Section Summary Box */}
                  <div className="space-y-4">
                    {isSummarizing ? (
                      <div className="py-8 px-5 rounded-3xl bg-gradient-to-b from-[#f7f9f7] to-[#f4f7f5] border border-[#2e493b]/20 shadow-xs space-y-6 text-center animate-fade-in">
                        <div className="relative inline-flex items-center justify-center">
                          <div className="w-16 h-16 rounded-3xl bg-[#2e493b]/10 text-[#2e493b] flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-[#2e493b] animate-pulse" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2e493b] text-white flex items-center justify-center shadow-md">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        </div>

                        <div className="space-y-2 max-w-md mx-auto">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#2e493b]/10 text-[#2e493b] border border-[#2e493b]/20">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>المعالجة والتلخيص بالذكاء الاصطناعي (Gemini)</span>
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                            {activeSummarizingStep}
                          </h4>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            يقوم المساعد الذكي بتفريغ كلام المحاضر حرفياً واستخراج المسائل والفوائد والضوابط العلمية دون أي اختلاق، مع آلية إعادة المحاولة التلقائية عند الحاجة.
                          </p>
                        </div>

                        {/* Skeleton Preview of the 3 Sections */}
                        <div className="space-y-3 pt-2 text-right max-w-lg mx-auto">
                          <div className="p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 space-y-2 animate-pulse">
                            <div className="h-3 bg-[#2e493b]/20 rounded-md w-1/3" />
                            <div className="h-2.5 bg-stone-200 rounded-md w-5/6" />
                            <div className="h-2.5 bg-stone-200 rounded-md w-2/3" />
                          </div>
                          <div className="p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 space-y-2 animate-pulse delay-100">
                            <div className="h-3 bg-[#3a5d4a]/20 rounded-md w-2/5" />
                            <div className="h-2.5 bg-stone-200 rounded-md w-4/5" />
                          </div>
                          <div className="p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 space-y-2 animate-pulse delay-200">
                            <div className="h-3 bg-emerald-700/20 rounded-md w-1/4" />
                            <div className="h-2.5 bg-stone-200 rounded-md w-3/4" />
                          </div>
                        </div>
                      </div>
                    ) : selectedLecture.summary || selectedLecture.transcript ? (
                      <div className="space-y-5 text-xs leading-relaxed text-[#20352a]">
                        {/* Verbatim Transcript Section */}
                        {selectedLecture.transcript && (
                          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#20352a] flex items-center gap-1.5 text-xs">
                                <FileText className="w-4 h-4 text-[#2e493b]" />
                                <span>النص المفرّغ للمحاضرة (مطابق لكلام المحاضر فقط):</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedLecture.transcript || '');
                                  setCopiedTranscript(true);
                                  setTimeout(() => setCopiedTranscript(false), 2000);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-[11px] font-semibold text-stone-600 hover:text-[#2e493b] flex items-center gap-1 cursor-pointer"
                              >
                                {copiedTranscript ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>نسخ النص</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-stone-700 whitespace-pre-line font-amiri text-sm sm:text-base leading-loose bg-white p-3.5 rounded-xl border border-stone-100">
                              {selectedLecture.transcript}
                            </p>
                          </div>
                        )}

                        {/* Structured 3-Part Summary */}
                        {selectedLecture.summary && (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200/80">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#2e493b] text-white flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <h4 className="text-xs sm:text-sm font-bold text-[#2e493b]">
                                  {lectureSummaryMode === 'deep'
                                    ? 'التلخيص العميق والمفصل (شامل لكافة المسائل والفوائد)'
                                    : 'التلخيص السريع (أبرز المحاور واللباب المكثف)'}
                                </h4>
                              </div>

                              {/* Two Summary Modes: Quick Summary vs Deep Summary */}
                              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLectureSummaryMode('quick');
                                    handleSummarizeLecture(selectedLecture, undefined, undefined, 'quick');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    lectureSummaryMode === 'quick'
                                      ? 'bg-white text-[#2e493b] shadow-2xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                  title="تلخيص سريع: أبرز المحاور واللباب المركز"
                                >
                                  تلخيص سريع
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLectureSummaryMode('deep');
                                    handleSummarizeLecture(selectedLecture, undefined, undefined, 'deep');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    lectureSummaryMode === 'deep'
                                      ? 'bg-white text-[#2e493b] shadow-2xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                  title="تلخيص عميق: تدوين تفصيلي ومسائل علمية وأدلة"
                                >
                                  تلخيص عميق
                                </button>
                              </div>
                            </div>

                            {/* 1) أبرز المحاور */}
                            <div className="p-4 rounded-2xl bg-[#f7f9f7] border border-[#2e493b]/15 space-y-2">
                              <p className="font-bold text-[#2e493b] text-xs sm:text-sm flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-[#2e493b] text-white text-[11px] flex items-center justify-center">
                                  1
                                </span>
                                <span>أبرز المحاور:</span>
                              </p>
                              <ul className="space-y-1.5 list-disc list-inside text-stone-700 pr-1">
                                {selectedLecture.summary.mainTopics.map((topic, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {topic}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* 2) المسائل العلمية والفقهية المذكورة */}
                            <div className="p-4 rounded-2xl bg-[#fdfdfc] border border-stone-200/90 space-y-2">
                              <p className="font-bold text-[#20352a] text-xs sm:text-sm flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-[#3a5d4a] text-white text-[11px] flex items-center justify-center">
                                  2
                                </span>
                                <span>المسائل العلمية والفقهية المذكورة:</span>
                              </p>
                              <ul className="space-y-1.5 list-disc list-inside text-stone-700 pr-1">
                                {selectedLecture.summary.scientificIssues.map((issue, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* 3) الفوائد والضوابط المستنبطة */}
                            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                              <p className="font-bold text-[#14532d] text-xs sm:text-sm flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] flex items-center justify-center">
                                  3
                                </span>
                                <span>الفوائد والضوابط المستنبطة:</span>
                              </p>
                              <ul className="space-y-1.5 list-disc list-inside text-emerald-950 pr-1">
                                {selectedLecture.summary.benefitsAndRules.map((rule, idx) => (
                                  <li key={idx} className="leading-relaxed font-medium">
                                    {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Bottom Action Bar: Re-summarize, Copy Summary & Export as Academic PDF */}
                        <div className="pt-4 border-t border-stone-200/80 flex flex-wrap items-center justify-end gap-2.5">
                          <button
                            type="button"
                            disabled={isSummarizing}
                            onClick={() => handleSummarizeLecture(selectedLecture)}
                            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#e8eee9] border border-[#2e493b]/20 text-[#2e493b] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                            title="إعادة تفريغ وتلخيص المحاضرة مع المحاولة الذكية"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`}
                            />
                            <span>إعادة التلخيص الذكي</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopySummaryText(selectedLecture)}
                            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#20352a] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            {copiedSummary ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>تم نسخ التلخيص</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-[#2e493b]" />
                                <span>نسخ التلخيص</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isExportingPdf}
                            onClick={() => handleExportPdf(selectedLecture)}
                            className="px-4 py-2.5 rounded-xl bg-[#2e493b] hover:bg-[#385947] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs disabled:opacity-60"
                          >
                            <Download className="w-4 h-4" />
                            <span>
                              {isExportingPdf ? 'جاري تجهيز ملف الـ PDF...' : 'تحميل التلخيص PDF'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (

                      <div className="py-8 text-center space-y-2">
                        <p className="text-xs text-stone-500">لم يتم تفريغ وتلخيص هذه المحاضرة بعد.</p>
                        <button
                          type="button"
                          onClick={() => handleSummarizeLecture(selectedLecture)}
                          className="px-4 py-2 bg-[#2e493b] text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          تفريغ وتلخيص التسجيل الآن
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-stone-400 space-y-2">
                  <Volume2 className="w-8 h-8 text-stone-300 mx-auto" />
                  <p>سجّل محاضرة جديدة أو اختر تسجيلاً من القائمة لاستعراض النص المفرّغ والتلخيص المقسّم.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. قسم «المساعد الذكي للمقرر» (Course AI Assistant)                         */}
      {/* ========================================================================= */}
      {activeTab === 'quiz' && (
        <CourseAIAssistant
          course={course}
          attachedBook={attachedBook}
          lectures={lectures}
          bookPdfUrl={bookPdfUrl}
          currentUser={currentUser || null}
          onUpdateLecture={(updatedLec) => {
            setLectures((prev) =>
              prev.map((l) => (l.id === updatedLec.id ? updatedLec : l))
            );
            if (selectedLecture?.id === updatedLec.id) {
              setSelectedLecture(updatedLec);
            }
          }}
          onGoToTab={(targetTab) => setActiveTab(targetTab)}
        />
      )}

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#20352a] text-white rounded-2xl shadow-xl border border-[#2e493b] text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
