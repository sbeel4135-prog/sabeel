import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playCelebrationSound } from '../utils/soundEffects';
import {
  Bot,
  BookOpen,
  Volume2,
  HelpCircle,
  Sparkles,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  Flame,
  Check,
  RefreshCw,
  Copy,
  Layers,
  ArrowRight,
  MessageSquare,
  Download,
} from 'lucide-react';
import { Course, LectureItem, User } from '../types';
import { AttachedBookData } from './views/CourseDetailView';
import { loadPdfDocument, extractPageRangeText } from '../utils/pdfViewerHelper';
import { getStoredBookPdfFile } from '../utils/bookStorage';
import { exportLectureSummaryPdf } from '../utils/exportSummaryPdf';

interface CourseAIAssistantProps {
  course: Course;
  attachedBook: AttachedBookData | null;
  lectures: LectureItem[];
  bookPdfUrl: string | null;
  currentUser: User | null;
  onUpdateLecture?: (updated: LectureItem) => void;
  onGoToTab?: (tab: 'book' | 'lectures') => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const CourseAIAssistant: React.FC<CourseAIAssistantProps> = ({
  course,
  attachedBook,
  lectures,
  bookPdfUrl,
  currentUser,
  onUpdateLecture,
  onGoToTab,
}) => {
  // Determine gender dynamically from user object or localStorage
  const userGender: 'ذكر' | 'أنثى' = (() => {
    if (currentUser?.gender === 'ذكر' || currentUser?.gender === 'أنثى') {
      return currentUser.gender;
    }
    try {
      const stored = localStorage.getItem('sabeel_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.gender === 'ذكر') return 'ذكر';
      }
    } catch {}
    return 'أنثى';
  })();

  const isMale = userGender === 'ذكر';

  // Greeting
  const dynamicGreeting = isMale
    ? `السلام عليكم ورحمة الله وبركاته، أهلاً بكَ في مساعد سَبيل لمقرر ${course.title}`
    : `السلام عليكم ورحمة الله وبركاته، أهلاً بكِ في مساعد سَبيل لمقرر ${course.title}`;

  // Primary Knowledge Source Selector: [ الكتاب المقرر ] (book) vs [ تسجيلات المحاضرات ] (lectures)
  const [knowledgeSource, setKnowledgeSource] = useState<'book' | 'lectures'>('book');

  // Book Mode: Sub-mode selection
  // 'qa' | 'range' | 'quick-quiz' | 'deep-quiz'
  const [bookSubMode, setBookSubMode] = useState<'qa' | 'range' | 'quick-quiz' | 'deep-quiz'>('qa');

  // Total pages detection from PDF
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(() => {
    return attachedBook?.totalPages || 50;
  });

  // Dynamic Page Range Selector: fromPage (1 to N-1), toPage (fromPage + 1 to N)
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(2);
  const [summaryDepth, setSummaryDepth] = useState<'fast' | 'deep'>('fast');

  // Range action results
  const [rangeLoading, setRangeLoading] = useState<boolean>(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangeSummaryResult, setRangeSummaryResult] = useState<any | null>(null);
  const [rangeQuizResult, setRangeQuizResult] = useState<QuizQuestion[] | null>(null);
  const [rangeQuizIdx, setRangeQuizIdx] = useState<number>(0);
  const [rangeQuizSelected, setRangeQuizSelected] = useState<number | null>(null);
  const [rangeQuizAnswered, setRangeQuizAnswered] = useState<'none' | 'correct' | 'wrong'>('none');

  // Q&A State
  const [qaQuery, setQaQuery] = useState<string>('');
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaMessages, setQaMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  // Direct Book Quizzes (Quick / Deep)
  const [generalQuizLoading, setGeneralQuizLoading] = useState<boolean>(false);
  const [generalQuizError, setGeneralQuizError] = useState<string | null>(null);
  const [generalQuizQuestions, setGeneralQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [generalQuizIdx, setGeneralQuizIdx] = useState<number>(0);
  const [generalQuizSelected, setGeneralQuizSelected] = useState<number | null>(null);
  const [generalQuizAnswered, setGeneralQuizAnswered] = useState<'none' | 'correct' | 'wrong'>('none');

  // Lecture Recordings State
  const [selectedLectureId, setSelectedLectureId] = useState<string>(() => {
    return lectures[0]?.id || '';
  });
  const selectedLecture = lectures.find((l) => l.id === selectedLectureId) || lectures[0] || null;

  // Lecture action states
  const [lectureAction, setLectureAction] = useState<'none' | 'summary' | 'quiz' | 'qa'>('none');
  const [lectureActionLoading, setLectureActionLoading] = useState<boolean>(false);
  const [lectureActionStep, setLectureActionStep] = useState<string>('');
  const [lectureActionError, setLectureActionError] = useState<string | null>(null);
  const [assistantLecSummaryMode, setAssistantLecSummaryMode] = useState<'quick' | 'deep'>('quick');
  const [isExportingLecPdf, setIsExportingLecPdf] = useState<boolean>(false);

  // Lecture Quiz state
  const [lecQuizQuestions, setLecQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [lecQuizIdx, setLecQuizIdx] = useState<number>(0);
  const [lecQuizSelected, setLecQuizSelected] = useState<number | null>(null);
  const [lecQuizAnswered, setLecQuizAnswered] = useState<'none' | 'correct' | 'wrong'>('none');

  // Lecture Q&A state
  const [lecQaQuery, setLecQaQuery] = useState<string>('');
  const [lecQaMessages, setLecQaMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  // Universal Copy States
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedQaIdx, setCopiedQaIdx] = useState<number | null>(null);
  const [copiedExplanation, setCopiedExplanation] = useState<boolean>(false);
  const [copiedLectureQaIdx, setCopiedLectureQaIdx] = useState<number | null>(null);

  // Load PDF doc to find real page count
  useEffect(() => {
    let active = true;
    const fetchDocInfo = async () => {
      try {
        let doc: any = null;
        if (bookPdfUrl) {
          doc = await loadPdfDocument(bookPdfUrl);
        } else {
          const blob = await getStoredBookPdfFile(course.id);
          if (blob) {
            const arr = await blob.arrayBuffer();
            doc = await loadPdfDocument(arr);
          }
        }
        if (doc && active) {
          const total = doc.numPages || 50;
          setPdfTotalPages(total);
          if (rangeTo > total) setRangeTo(total);
        }
      } catch (e) {
        console.warn('Could not read page count in assistant:', e);
      }
    };
    fetchDocInfo();
    return () => {
      active = false;
    };
  }, [bookPdfUrl, course.id]);

  // Adjust rangeTo when rangeFrom changes so rangeTo is always > rangeFrom
  const handleRangeFromChange = (newFrom: number) => {
    setRangeFrom(newFrom);
    if (rangeTo <= newFrom) {
      setRangeTo(Math.min(newFrom + 1, pdfTotalPages));
    }
  };

  // Helper to trigger confetti explosion and celebratory firecracker sound
  const triggerConfetti = () => {
    playCelebrationSound();
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24', '#2e493b'],
      });
    } catch {}
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // Resolve PDF document helper
  const getPdfDocInstance = async () => {
    let doc: any = null;
    if (bookPdfUrl) {
      doc = await loadPdfDocument(bookPdfUrl);
    }
    if (!doc) {
      const blob = await getStoredBookPdfFile(course.id);
      if (blob) {
        const arr = await blob.arrayBuffer();
        doc = await loadPdfDocument(arr);
      }
    }
    return doc;
  };

  // =========================================================================
  // 1. Book Mode Actions
  // =========================================================================

  // A) Direct Q&A strictly grounded in extracted text
  const handleSendQa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = qaQuery.trim();
    if (!q || qaLoading) return;

    setQaMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQaQuery('');
    setQaLoading(true);
    setQaError(null);

    try {
      let extractedContext = attachedBook?.extractedText || '';
      if (!extractedContext && attachedBook) {
        try {
          const doc = await getPdfDocInstance();
          if (doc) {
            const ext = await extractPageRangeText(doc, 1, Math.min(25, doc.numPages || 25));
            extractedContext = ext.text;
          }
        } catch (e) {
          console.warn('On-demand text extraction fallback warning:', e);
        }
      }

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          college: currentUser?.college || 'كلية الشريعة',
          gender: userGender,
          courseTitle: course.title,
          bookTitle: attachedBook?.fileName || course.title,
          extractedContext,
          history: qaMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر الحصول على إجابة في الوقت الحالي.');
      }

      const data = await res.json();
      setQaMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || 'تمت الإجابة بناء على نص الكتاب المعتمد.' },
      ]);
    } catch (err: any) {
      setQaError(err.message || 'حدث خطأ أثناء استدعاء المساعد.');
    } finally {
      setQaLoading(false);
    }
  };

  // B) Summarize Page Range
  const handleSummarizePageRange = async () => {
    setRangeLoading(true);
    setRangeError(null);
    setRangeSummaryResult(null);
    setRangeQuizResult(null);

    try {
      let rangeText = '';
      const doc = await getPdfDocInstance();
      if (doc) {
        const extracted = await extractPageRangeText(doc, rangeFrom, rangeTo);
        rangeText = extracted.text;
      }
      if (!rangeText && attachedBook?.extractedText) {
        rangeText = attachedBook.extractedText.slice(0, 10000);
      }

      const scopeLabel = `الصفحات من ${rangeFrom} إلى ${rangeTo}`;
      const res = await fetch('/api/gemini/summarize-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.title,
          fileName: attachedBook?.fileName || course.title,
          textContent: rangeText,
          extractedText: rangeText,
          summaryType: summaryDepth === 'deep' ? 'comprehensive' : 'brief',
          scope: 'range',
          startPage: rangeFrom,
          endPage: rangeTo,
          gender: userGender,
          scopeLabel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تلخيص الصفحات المحددة.');
      }

      const data = await res.json();
      setRangeSummaryResult(data.summary);
    } catch (err: any) {
      setRangeError(err.message || 'تعذر إتمام التلخيص.');
    } finally {
      setRangeLoading(false);
    }
  };

  // C) Quiz on Page Range (Strictly 2 focused questions)
  const handleQuizPageRange = async () => {
    setRangeLoading(true);
    setRangeError(null);
    setRangeSummaryResult(null);
    setRangeQuizResult(null);
    setRangeQuizIdx(0);
    setRangeQuizSelected(null);
    setRangeQuizAnswered('none');

    try {
      let rangeText = '';
      const doc = await getPdfDocInstance();
      if (doc) {
        const extracted = await extractPageRangeText(doc, rangeFrom, rangeTo);
        rangeText = extracted.text;
      }
      if (!rangeText && attachedBook?.extractedText) {
        rangeText = attachedBook.extractedText.slice(0, 10000);
      }

      const sourceWithHeader = `[نص من صفحات الكتاب من ${rangeFrom} إلى ${rangeTo}]:\n${rangeText}`;
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.title,
          quizMode: 'mixed',
          sourceText: sourceWithHeader,
          gender: userGender,
          count: 2,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر توليد أسئلة الصفحات المحددة.');
      }

      const data = await res.json();
      const qs: QuizQuestion[] = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length === 0) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من استخراج أسئلة دقيقة من هذه الصفحات.');
      }
      setRangeQuizResult(qs);
    } catch (err: any) {
      setRangeError(err.message || 'تعذر توليد الأسئلة.');
    } finally {
      setRangeLoading(false);
    }
  };

  // D) Fast / Deep Full Book Quizzes
  const handleTriggerGeneralQuiz = async (mode: 'fast' | 'deep') => {
    setGeneralQuizLoading(true);
    setGeneralQuizError(null);
    setGeneralQuizQuestions(null);
    setGeneralQuizIdx(0);
    setGeneralQuizSelected(null);
    setGeneralQuizAnswered('none');

    try {
      let contextText = attachedBook?.extractedText || '';
      if (!contextText) {
        const doc = await getPdfDocInstance();
        if (doc) {
          const extracted = await extractPageRangeText(doc, 1, Math.min(25, doc.numPages || 25));
          contextText = extracted.text;
        }
      }

      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.title,
          quizMode: mode,
          sourceText: contextText,
          gender: userGender,
          count: 4,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر توليد الاختبار.');
      }

      const data = await res.json();
      const qs: QuizQuestion[] = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length === 0) {
        throw new Error('لم يتم توليد أي أسئلة صالحة من محتوى المقرر.');
      }
      setGeneralQuizQuestions(qs);
    } catch (err: any) {
      setGeneralQuizError(err.message || 'حدث خطأ أثناء تجهيز الاختبار.');
    } finally {
      setGeneralQuizLoading(false);
    }
  };

  // =========================================================================
  // 2. Lecture Recordings Mode Actions
  // =========================================================================

  // Action 1: Transcribe on-demand & summarize key themes and benefits
  const handleSummarizeLectureAction = async (overrideMode?: 'quick' | 'deep') => {
    if (!selectedLecture) return;
    const targetMode = overrideMode || assistantLecSummaryMode;
    setLectureAction('summary');
    setLectureActionLoading(true);
    setLectureActionStep(
      targetMode === 'deep'
        ? 'جاري تفريغ الصوت وإعداد التلخيص العلمي العميق والمفصل...'
        : 'جاري تفريغ الصوت واستخلاص المحاور واللباب السريع...'
    );
    setLectureActionError(null);

    try {
      const res = await fetch('/api/gemini/transcribe-and-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: selectedLecture.audioBase64 || '',
          mimeType: selectedLecture.mimeType || 'audio/webm',
          existingTranscript: selectedLecture.transcript || '',
          lectureTitle: selectedLecture.title,
          courseTitle: course.title,
          summaryMode: targetMode,
          gender: userGender,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر تفريغ وتلخيص المحاضرة.');
      }

      const data = await res.json();
      const updated: LectureItem = {
        ...selectedLecture,
        transcript: data.transcript || selectedLecture.transcript,
        summary: data.summary,
      };

      if (onUpdateLecture) {
        onUpdateLecture(updated);
      }
    } catch (err: any) {
      setLectureActionError(err.message || 'حدث خطأ أثناء التلخيص.');
    } finally {
      setLectureActionLoading(false);
    }
  };

  // Action 2: Generate quiz questions strictly based on the recorded lecture
  const handleQuizLectureAction = async () => {
    if (!selectedLecture) return;
    setLectureAction('quiz');
    setLectureActionLoading(true);
    setLectureActionStep('جاري تحليل محتوى المحاضرة وصياغة الأسئلة...');
    setLectureActionError(null);
    setLecQuizQuestions(null);
    setLecQuizIdx(0);
    setLecQuizSelected(null);
    setLecQuizAnswered('none');

    try {
      let lectureContent = selectedLecture.transcript || '';
      if (!lectureContent && selectedLecture.summary) {
        lectureContent = [
          ...(selectedLecture.summary.mainTopics || []),
          ...(selectedLecture.summary.scientificIssues || []),
          ...(selectedLecture.summary.benefitsAndRules || []),
        ].join('\n');
      }

      // If no transcript yet, transcribe first
      if (!lectureContent && selectedLecture.audioBase64) {
        setLectureActionStep('جاري قراءة تسجيل المحاضرة أولاً...');
        const transRes = await fetch('/api/gemini/transcribe-and-summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: selectedLecture.audioBase64,
            mimeType: selectedLecture.mimeType,
            lectureTitle: selectedLecture.title,
            courseTitle: course.title,
          }),
        });
        if (transRes.ok) {
          const tData = await transRes.json();
          lectureContent = tData.transcript || '';
          if (onUpdateLecture) {
            onUpdateLecture({
              ...selectedLecture,
              transcript: tData.transcript,
              summary: tData.summary,
            });
          }
        }
      }

      if (!lectureContent || lectureContent.length < 20) {
        throw new Error('لا يوجد محتوى صوتي مفرّغ كافٍ لتوليد الأسئلة من هذه المحاضرة.');
      }

      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course.title,
          quizMode: 'mixed',
          sourceText: `[تفريغ المحاضرة المسجلة: ${selectedLecture.title}]:\n${lectureContent}`,
          count: 3,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر توليد أسئلة المحاضرة.');
      }

      const data = await res.json();
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length === 0) throw new Error('لم يتم توليد أي أسئلة صالحة.');
      setLecQuizQuestions(qs);
    } catch (err: any) {
      setLectureActionError(err.message || 'تعذر توليد الأسئلة.');
    } finally {
      setLectureActionLoading(false);
    }
  };

  // Action 3: Ask questions about points explained by the lecturer
  const handleLecQaSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = lecQaQuery.trim();
    if (!q || lectureActionLoading || !selectedLecture) return;

    setLecQaMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLecQaQuery('');
    setLectureActionLoading(true);
    setLectureActionError(null);

    try {
      const lectureContext =
        selectedLecture.transcript ||
        (selectedLecture.summary
          ? JSON.stringify(selectedLecture.summary)
          : `محاضرة بعنوان: ${selectedLecture.title}`);

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          college: currentUser?.college || 'كلية الشريعة',
          courseTitle: course.title,
          bookTitle: `محاضرة مسجلة: ${selectedLecture.title}`,
          extractedContext: `محتوى المحاضرة المفرغة:\n"""\n${lectureContext}\n"""`,
          history: lecQaMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'تعذر الحصول على إجابة.');
      }

      const data = await res.json();
      setLecQaMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || 'تمت الإجابة بناء على تسجيل المحاضرة.' },
      ]);
    } catch (err: any) {
      setLectureActionError(err.message || 'حدث خطأ أثناء استدعاء المساعد.');
    } finally {
      setLectureActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in">
      {/* 1. Dynamic Course Greeting & Gender Adaptation Banner */}
      <div className="bg-gradient-to-r from-[#20352a] to-[#2e493b] text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-[#2e493b]/30 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
              المساعد الذكي للمقرر الأكاديمي
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-cairo leading-relaxed">
            {dynamicGreeting}
          </h2>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-2xl">
            مساعدك المنهجي المعتمد، يمكنك استشارة الكتاب المقرر وتلخيص وتحديد صفحاته، أو التفاعل الذكي مع تسجيلاتك ومحاضراتك المرفوعة.
          </p>
        </div>
      </div>

      {/* 2. Dual Knowledge Source Selector: [ الكتاب المقرر ] & [ تسجيلات المحاضرات ] */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-stone-200/60 rounded-2xl border border-stone-300/60 font-bold text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setKnowledgeSource('book')}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            knowledgeSource === 'book'
              ? 'bg-white text-[#2e493b] shadow-xs font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#3a5d4a]" />
          <span>[ الكتاب المقرر ]</span>
        </button>

        <button
          type="button"
          onClick={() => setKnowledgeSource('lectures')}
          className={`py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            knowledgeSource === 'lectures'
              ? 'bg-white text-[#2e493b] shadow-xs font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Volume2 className="w-4 h-4 text-[#3a5d4a]" />
          <span>[ تسجيلات المحاضرات ]</span>
          {lectures.length > 0 && (
            <span className="text-[10px] bg-[#e8eee9] text-[#2e493b] px-2 py-0.5 rounded-full">
              {lectures.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* Knowledge Source 1: [ الكتاب المقرر ]                                     */}
      {/* ========================================================================= */}
      {knowledgeSource === 'book' && (
        <div className="space-y-6">
          {!attachedBook ? (
            <div className="p-8 rounded-3xl bg-white border-2 border-dashed border-stone-200 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold text-[#20352a]">لم يتم إرفاق كتاب دراسي بعد</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                يرجى إرفاق كتاب المقرر (PDF) من تبويب «الكتاب الدراسي» لتفعيل الأسئلة والتلاخيص المؤصلة من صفحاته.
              </p>
              {onGoToTab && (
                <button
                  type="button"
                  onClick={() => onGoToTab('book')}
                  className="px-4 py-2 bg-[#2e493b] text-white rounded-xl text-xs font-bold hover:bg-[#385947] transition-colors cursor-pointer"
                >
                  الانتقال لإرفاق الكتاب الآن
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Sub Mode Switcher for Book */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBookSubMode('qa')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookSubMode === 'qa'
                      ? 'bg-[#2e493b] text-white shadow-2xs'
                      : 'text-[#2e493b] hover:bg-[#e8eee9]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>اسأل عن مسألة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookSubMode('range')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookSubMode === 'range'
                      ? 'bg-[#2e493b] text-white shadow-2xs'
                      : 'text-[#2e493b] hover:bg-[#e8eee9]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>تلخيص صفحات & اختبار بالصفحات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookSubMode('quick-quiz');
                    handleTriggerGeneralQuiz('fast');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookSubMode === 'quick-quiz'
                      ? 'bg-[#2e493b] text-white shadow-2xs'
                      : 'text-[#2e493b] hover:bg-[#e8eee9]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>اختبار سريع</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookSubMode('deep-quiz');
                    handleTriggerGeneralQuiz('deep');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bookSubMode === 'deep-quiz'
                      ? 'bg-[#2e493b] text-white shadow-2xs'
                      : 'text-[#2e493b] hover:bg-[#e8eee9]'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>اختبار عميق</span>
                </button>
              </div>

              {/* A) اسأل عن مسألة (Direct Q&A strictly grounded in extracted PDF text) */}
              {bookSubMode === 'qa' && (
                <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#20352a]">
                      اسأل عن مسألة (إجابة مقيدة بنص الكتاب المقرر)
                    </h3>
                    <p className="text-xs text-stone-500">
                      اطرح أي مسألة فقهية أو علمية أو استفسار، وسيقوم المساعد باستخراج الإجابة المؤصلة حصراً من كتاب المقرر المرفوع: ({attachedBook.fileName}).
                    </p>
                  </div>

                  {/* Messages Area */}
                  <div className="space-y-3 min-h-[140px] max-h-[380px] overflow-y-auto p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    {qaMessages.length === 0 ? (
                      <div className="text-center py-8 text-xs text-stone-400">
                        اكتب سؤالك أو مسألتك أدناه لبدء الاستفسار العلمي من صفحات الكتاب.
                      </div>
                    ) : (
                      qaMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#2e493b] text-white mr-auto max-w-[85%]'
                              : 'bg-white border border-stone-200 text-[#20352a] ml-auto max-w-[95%] shadow-2xs'
                          }`}
                        >
                          <p className="font-bold mb-1 text-[11px] opacity-80">
                            {msg.role === 'user' ? 'سؤالك:' : 'إجابة مساعد سَبيل من الكتاب:'}
                          </p>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.role === 'assistant' && (
                            <div className="pt-2 mt-2 border-t border-stone-100 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleCopyText(`qa_${idx}`, msg.text)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-600 hover:text-[#2e493b] hover:bg-stone-100 transition-colors cursor-pointer"
                                title="نسخ الإجابة"
                              >
                                {copiedId === `qa_${idx}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {qaLoading && (
                      <div className="p-3 bg-white border border-stone-200 rounded-2xl text-xs text-[#2e493b] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري البحث في نصوص الكتاب وصياغة الإجابة المؤصلة...</span>
                      </div>
                    )}
                  </div>

                  {qaError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{qaError}</span>
                    </div>
                  )}

                  {/* Input form */}
                  <form onSubmit={handleSendQa} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={qaQuery}
                      onChange={(e) => setQaQuery(e.target.value)}
                      placeholder="اكتب مسألتك هنا (مثال: ما هو حكم المسألة الفلانية وشروطها؟)"
                      className="flex-1 py-2.5 px-4 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:border-[#2e493b] focus:outline-none text-[#20352a]"
                    />
                    <button
                      type="submit"
                      disabled={qaLoading || !qaQuery.trim()}
                      className="px-4 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال</span>
                    </button>
                  </form>
                </div>
              )}

              {/* B) تلخيص صفحات & اختبار بالصفحات (Dynamic Page Range Selector) */}
              {bookSubMode === 'range' && (
                <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#20352a]">
                      تحديد نطاق الصفحات (تلخيص واختبار متخصص)
                    </h3>
                    <p className="text-xs text-stone-500">
                      اختر رقم الصفحة البداية والنهاية لتلخيصها سريعاً أو عميقاً، أو توليد سؤالين اختباريين دقيقين منها.
                    </p>
                  </div>

                  {/* Dynamic Page Range Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    {/* From selector: 1 to N-1 */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        من صفحة (بداية النطاق):
                      </label>
                      <select
                        value={rangeFrom}
                        onChange={(e) => handleRangeFromChange(parseInt(e.target.value, 10))}
                        className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold text-[#20352a] focus:border-[#2e493b] focus:outline-none"
                      >
                        {Array.from(
                          { length: Math.max(1, pdfTotalPages - 1) },
                          (_, i) => i + 1
                        ).map((pNum) => (
                          <option key={pNum} value={pNum}>
                            صفحة {pNum}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* To selector: from rangeFrom + 1 up to N */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        إلى صفحة (نهاية النطاق):
                      </label>
                      <select
                        value={rangeTo}
                        onChange={(e) => setRangeTo(parseInt(e.target.value, 10))}
                        className="w-full py-2 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold text-[#20352a] focus:border-[#2e493b] focus:outline-none"
                      >
                        {Array.from(
                          { length: Math.max(1, pdfTotalPages - rangeFrom) },
                          (_, i) => rangeFrom + 1 + i
                        ).map((pNum) => (
                          <option key={pNum} value={pNum}>
                            صفحة {pNum}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Summary Depth: سريع / عميق */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        عمق التلخيص:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSummaryDepth('fast')}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            summaryDepth === 'fast'
                              ? 'bg-[#2e493b] text-white border-[#2e493b]'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          سريع ومباشر
                        </button>
                        <button
                          type="button"
                          onClick={() => setSummaryDepth('deep')}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            summaryDepth === 'deep'
                              ? 'bg-[#2e493b] text-white border-[#2e493b]'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          عميق ومفصل
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Page Range */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={rangeLoading}
                      onClick={handleSummarizePageRange}
                      className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs disabled:opacity-50"
                    >
                      {rangeLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span>تلخيص صفحات ({rangeFrom} - {rangeTo})</span>
                    </button>

                    <button
                      type="button"
                      disabled={rangeLoading}
                      onClick={handleQuizPageRange}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-[#e8eee9] text-[#20352a] hover:text-[#2e493b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border border-stone-200 disabled:opacity-50"
                    >
                      {rangeLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <HelpCircle className="w-4 h-4" />
                      )}
                      <span>اختبار بالصفحات (سؤالان مركزان)</span>
                    </button>
                  </div>

                  {rangeError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{rangeError}</span>
                    </div>
                  )}

                  {/* Render Page Range Summary Result */}
                  {rangeSummaryResult && (
                    <div className="p-5 rounded-2xl bg-[#fdfdfc] border border-stone-200 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="text-xs font-bold text-[#2e493b]">
                          تلخيص الصفحات ({rangeFrom} إلى {rangeTo}) · العمق: {summaryDepth === 'deep' ? 'عميق' : 'سريع'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const fullText = [
                              `تلخيص صفحات (${rangeFrom} إلى ${rangeTo}) - مقرر ${course.title}`,
                              rangeSummaryResult.executiveSummary ? `\nالخلاصة:\n${rangeSummaryResult.executiveSummary}` : '',
                              rangeSummaryResult.mainTopics?.length ? `\n1) أبرز المحاور:\n- ${rangeSummaryResult.mainTopics.join('\n- ')}` : '',
                              rangeSummaryResult.scientificIssues?.length ? `\n2) المسائل العلمية والفقهية:\n- ${rangeSummaryResult.scientificIssues.join('\n- ')}` : '',
                              rangeSummaryResult.benefitsAndRules?.length ? `\n3) الفوائد والضوابط:\n- ${rangeSummaryResult.benefitsAndRules.join('\n- ')}` : '',
                            ].filter(Boolean).join('\n');
                            handleCopyText('range_summary', fullText);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#2e493b] hover:bg-[#e8eee9] transition-colors cursor-pointer"
                          title="نسخ التلخيص"
                        >
                          {copiedId === 'range_summary' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ التلخيص</span>
                            </>
                          )}
                        </button>
                      </div>

                      {rangeSummaryResult.executiveSummary && (
                        <p className="text-xs text-stone-700 bg-stone-100 p-3 rounded-xl leading-relaxed">
                          {rangeSummaryResult.executiveSummary}
                        </p>
                      )}

                      <div className="space-y-3 text-xs">
                        {rangeSummaryResult.mainTopics && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">أبرز المحاور:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {rangeSummaryResult.mainTopics.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rangeSummaryResult.scientificIssues && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">المسائل العلمية والفقهية:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {rangeSummaryResult.scientificIssues.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rangeSummaryResult.benefitsAndRules && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">الفوائد والضوابط:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {rangeSummaryResult.benefitsAndRules.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Render Page Range Quiz Result (2 questions) */}
                  {rangeQuizResult && rangeQuizResult.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white border border-[#2e493b]/20 shadow-2xs space-y-4 animate-fade-in">
                      {(() => {
                        const curQ = rangeQuizResult[rangeQuizIdx];
                        if (!curQ) return null;
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-stone-500 pb-1 border-b border-stone-100">
                              <span className="font-bold text-[#2e493b]">
                                سؤال {rangeQuizIdx + 1} من {rangeQuizResult.length} (من الصفحات {rangeFrom}-{rangeTo})
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-[#20352a] leading-relaxed">
                              {curQ.question}
                            </p>

                            <div className="space-y-2 pt-1">
                              {curQ.options.map((opt, optIdx) => {
                                const isSelected = rangeQuizSelected === optIdx;
                                const isCorrect = optIdx === curQ.correctIndex;
                                const answered = rangeQuizAnswered !== 'none';

                                let style = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';
                                if (answered) {
                                  if (isCorrect) {
                                    style = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold';
                                  } else if (isSelected) {
                                    style = 'bg-rose-100 border-rose-500 text-rose-950 font-bold';
                                  } else {
                                    style = 'opacity-50 bg-stone-50 border-stone-200 text-stone-500';
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={answered}
                                    onClick={() => {
                                      const correct = optIdx === curQ.correctIndex;
                                      setRangeQuizSelected(optIdx);
                                      setRangeQuizAnswered(correct ? 'correct' : 'wrong');
                                      if (correct) {
                                        triggerConfetti();
                                      }
                                    }}
                                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer text-xs ${style}`}
                                  >
                                    <span>{opt}</span>
                                    {answered && isCorrect && (
                                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Gender-Aware Positive Reinforcement Banner */}
                            {rangeQuizAnswered === 'correct' && (
                              <div className="p-3 bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs animate-scale-in shadow-xs">
                                <Award className="w-4 h-4 text-amber-200" />
                                <span>{isMale ? 'أحسنتَ بارك الله فيكَ!' : 'أحسنتِ بارك الله فيكِ!'}</span>
                              </div>
                            )}

                            {/* Explanation */}
                            {rangeQuizAnswered !== 'none' && curQ.explanation && (
                              <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-[11px] text-stone-700 leading-relaxed">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-bold text-[#20352a]">التعليل العلمي:</p>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(`rq_exp_${rangeQuizIdx}`, curQ.explanation)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-stone-500 hover:text-[#2e493b] hover:bg-stone-200 transition-colors cursor-pointer"
                                    title="نسخ التعليل"
                                  >
                                    {copiedId === `rq_exp_${rangeQuizIdx}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">تم النسخ</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>نسخ</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p>{curQ.explanation}</p>
                              </div>
                            )}

                            {/* Next Question Navigation */}
                            {rangeQuizAnswered !== 'none' && rangeQuizIdx < rangeQuizResult.length - 1 && (
                              <div className="pt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRangeQuizIdx((i) => i + 1);
                                    setRangeQuizSelected(null);
                                    setRangeQuizAnswered('none');
                                  }}
                                  className="px-4 py-2 bg-[#2e493b] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-[#385947] transition-colors"
                                >
                                  السؤال التالي
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* C & D) اختبار سريع واختبار عميق (Full Book Direct Quizzes) */}
              {(bookSubMode === 'quick-quiz' || bookSubMode === 'deep-quiz') && (
                <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#20352a]">
                        {bookSubMode === 'quick-quiz'
                          ? 'اختبار سريع (استرجاع فوري للمعلومات)'
                          : 'اختبار عميق (تحليلي في الفروع والضوابط والأدلة)'}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        أسئلة مصممة بعناية من واقع نصوص الكتاب المعتمد لمقرر {course.title}.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={generalQuizLoading}
                      onClick={() =>
                        handleTriggerGeneralQuiz(bookSubMode === 'quick-quiz' ? 'fast' : 'deep')
                      }
                      className="px-3.5 py-2 bg-stone-100 hover:bg-[#e8eee9] text-[#2e493b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${generalQuizLoading ? 'animate-spin' : ''}`}
                      />
                      <span>توليد أسئلة جديدة</span>
                    </button>
                  </div>

                  {generalQuizLoading && (
                    <div className="py-12 text-center text-xs text-[#2e493b] space-y-2">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#2e493b]" />
                      <p className="font-bold">جاري إعداد الأسئلة وتدقيق خياراتها علمياً...</p>
                    </div>
                  )}

                  {generalQuizError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{generalQuizError}</span>
                    </div>
                  )}

                  {generalQuizQuestions && generalQuizQuestions.length > 0 && !generalQuizLoading && (
                    <div className="space-y-4">
                      {(() => {
                        const curQ = generalQuizQuestions[generalQuizIdx];
                        if (!curQ) return null;
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <span className="font-bold text-[#2e493b]">
                                السؤال {generalQuizIdx + 1} من {generalQuizQuestions.length}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-[#20352a] leading-relaxed">
                              {curQ.question}
                            </p>

                            <div className="space-y-2 pt-1">
                              {curQ.options.map((opt, optIdx) => {
                                const isSelected = generalQuizSelected === optIdx;
                                const isCorrect = optIdx === curQ.correctIndex;
                                const answered = generalQuizAnswered !== 'none';

                                let style = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';
                                if (answered) {
                                  if (isCorrect) {
                                    style = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold';
                                  } else if (isSelected) {
                                    style = 'bg-rose-100 border-rose-500 text-rose-950 font-bold';
                                  } else {
                                    style = 'opacity-50 bg-stone-50 border-stone-200 text-stone-500';
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={answered}
                                    onClick={() => {
                                      const correct = optIdx === curQ.correctIndex;
                                      setGeneralQuizSelected(optIdx);
                                      setGeneralQuizAnswered(correct ? 'correct' : 'wrong');
                                      if (correct) {
                                        triggerConfetti();
                                      }
                                    }}
                                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer text-xs ${style}`}
                                  >
                                    <span>{opt}</span>
                                    {answered && isCorrect && (
                                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Gender-Aware Positive Reinforcement Banner */}
                            {generalQuizAnswered === 'correct' && (
                              <div className="p-3 bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs animate-scale-in shadow-xs">
                                <Award className="w-4 h-4 text-amber-200" />
                                <span>{isMale ? 'أحسنتَ بارك الله فيكَ!' : 'أحسنتِ بارك الله فيكِ!'}</span>
                              </div>
                            )}

                            {/* Explanation */}
                            {generalQuizAnswered !== 'none' && curQ.explanation && (
                              <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-[11px] text-stone-700 leading-relaxed">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-bold text-[#20352a]">التعليل العلمي:</p>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(`gq_exp_${generalQuizIdx}`, curQ.explanation)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-stone-500 hover:text-[#2e493b] hover:bg-stone-200 transition-colors cursor-pointer"
                                    title="نسخ التعليل"
                                  >
                                    {copiedId === `gq_exp_${generalQuizIdx}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700 font-bold">تم النسخ</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>نسخ</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p>{curQ.explanation}</p>
                              </div>
                            )}

                            {/* Next Question Navigation */}
                            {generalQuizAnswered !== 'none' &&
                              generalQuizIdx < generalQuizQuestions.length - 1 && (
                                <div className="pt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGeneralQuizIdx((i) => i + 1);
                                      setGeneralQuizSelected(null);
                                      setGeneralQuizAnswered('none');
                                    }}
                                    className="px-4 py-2 bg-[#2e493b] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-[#385947] transition-colors"
                                  >
                                    السؤال التالي
                                  </button>
                                </div>
                              )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Knowledge Source 2: [ تسجيلات المحاضرات ]                                  */}
      {/* ========================================================================= */}
      {knowledgeSource === 'lectures' && (
        <div className="space-y-6">
          {lectures.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border-2 border-dashed border-stone-200 text-center space-y-3">
              <Volume2 className="w-10 h-10 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold text-[#20352a]">لا توجد تسجيلات أو محاضرات مرفوعة</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                يمكنك تسجيل محاضرة مباشرة أو إرفاق ملف صوتي من تبويب «المحاضرات» ليتمكن المساعد من تفريغها وتلخيصها واختبارك بها.
              </p>
              {onGoToTab && (
                <button
                  type="button"
                  onClick={() => onGoToTab('lectures')}
                  className="px-4 py-2 bg-[#2e493b] text-white rounded-xl text-xs font-bold hover:bg-[#385947] transition-colors cursor-pointer"
                >
                  الانتقال لتبويب المحاضرات
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Indexed List of Lectures (e.g. محاضرة 1, محاضرة 2...) */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 p-4 space-y-2 shadow-2xs">
                <h4 className="text-xs font-bold text-stone-600 px-1 mb-2">
                  قائمة المحاضرات ({lectures.length})
                </h4>
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                  {lectures.map((lec, idx) => {
                    const isSelected = selectedLecture?.id === lec.id;
                    return (
                      <div
                        key={lec.id}
                        onClick={() => {
                          setSelectedLectureId(lec.id);
                          setLectureAction('none');
                        }}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-[#20352a]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">
                            محاضرة {idx + 1}: {lec.title}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 truncate ${
                              isSelected ? 'text-emerald-100' : 'text-stone-400'
                            }`}
                          >
                            {lec.date} · {lec.duration}
                          </p>
                        </div>
                        <ChevronLeft
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-stone-400'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Lecture 3 Actions Panel */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-5">
                {selectedLecture ? (
                  <>
                    <div className="border-b border-stone-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#2e493b] bg-[#e8eee9] px-2.5 py-0.5 rounded-full">
                          المحاضرة المحددة
                        </span>
                        <span className="text-xs text-stone-400">
                          {selectedLecture.date} · {selectedLecture.duration}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#20352a] mt-1">
                        {selectedLecture.title}
                      </h3>
                    </div>

                    {/* 3 Primary On-Demand Actions:
                        1. تلخيص المحاضرة
                        2. اختبرني بالمحاضرة
                        3. اسأل عن المحاضرة */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Action 1: تلخيص المحاضرة */}
                      <button
                        type="button"
                        onClick={() => handleSummarizeLectureAction()}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          lectureAction === 'summary'
                            ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-[#20352a]'
                        }`}
                      >
                        <FileText className="w-5 h-5 text-[#3a5d4a] group-hover:text-white" />
                        <span className="text-xs font-bold">1. تلخيص المحاضرة</span>
                        <span className="text-[10px] opacity-75">المحاور والفوائد</span>
                      </button>

                      {/* Action 2: اختبرني بالمحاضرة */}
                      <button
                        type="button"
                        onClick={handleQuizLectureAction}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          lectureAction === 'quiz'
                            ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-[#20352a]'
                        }`}
                      >
                        <HelpCircle className="w-5 h-5 text-[#3a5d4a]" />
                        <span className="text-xs font-bold">2. اختبرني بالمحاضرة</span>
                        <span className="text-[10px] opacity-75">أسئلة من التسجيل</span>
                      </button>

                      {/* Action 3: اسأل عن المحاضرة */}
                      <button
                        type="button"
                        onClick={() => setLectureAction('qa')}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          lectureAction === 'qa'
                            ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-[#20352a]'
                        }`}
                      >
                        <MessageSquare className="w-5 h-5 text-[#3a5d4a]" />
                        <span className="text-xs font-bold">3. اسأل عن المحاضرة</span>
                        <span className="text-[10px] opacity-75">استفسار من الشرح</span>
                      </button>
                    </div>

                    {/* Progress / Step Feedback */}
                    {lectureActionLoading && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center gap-2.5 text-xs font-bold text-[#2e493b] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-[#2e493b]" />
                        <span>{lectureActionStep || 'جاري معالجة الطلب بواسطة الذكاء الاصطناعي...'}</span>
                      </div>
                    )}

                    {lectureActionError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{lectureActionError}</span>
                      </div>
                    )}

                    {/* Action 1 Output: Summary */}
                    {lectureAction === 'summary' && selectedLecture.summary && !lectureActionLoading && (
                      <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-200 animate-fade-in text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                          <div className="space-y-1">
                            <span className="font-bold text-[#2e493b] text-sm block">
                              {assistantLecSummaryMode === 'deep'
                                ? 'التلخيص العميق والمفصل (شامل لكافة المسائل والفوائد)'
                                : 'التلخيص السريع (أبرز المحاور واللباب المكثف)'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              مستخرج بأمانة من تفريغ كلام المحاضر فقط
                            </span>
                          </div>

                          {/* Dual Mode Switch */}
                          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-stone-200">
                            <button
                              type="button"
                              onClick={() => {
                                setAssistantLecSummaryMode('quick');
                                handleSummarizeLectureAction('quick');
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                assistantLecSummaryMode === 'quick'
                                  ? 'bg-[#2e493b] text-white shadow-2xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                              title="تلخيص سريع: أبرز المحاور واللباب المركز"
                            >
                              تلخيص سريع
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssistantLecSummaryMode('deep');
                                handleSummarizeLectureAction('deep');
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                assistantLecSummaryMode === 'deep'
                                  ? 'bg-[#2e493b] text-white shadow-2xs'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                              title="تلخيص عميق: تدوين تفصيلي ومسائل علمية وأدلة"
                            >
                              تلخيص عميق
                            </button>
                          </div>
                        </div>

                        {selectedLecture.summary.mainTopics && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">أبرز المحاور:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {selectedLecture.summary.mainTopics.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedLecture.summary.scientificIssues && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">المسائل العلمية المذكورة:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {selectedLecture.summary.scientificIssues.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedLecture.summary.benefitsAndRules && (
                          <div>
                            <p className="font-bold text-[#20352a] mb-1">الفوائد والضوابط المستنبطة:</p>
                            <ul className="list-disc list-inside space-y-1 text-stone-600">
                              {selectedLecture.summary.benefitsAndRules.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons: Copy Summary & Export PDF */}
                        <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const fullText = [
                                `ملخص محاضرة: ${selectedLecture.title} (${course.title})`,
                                selectedLecture.summary?.mainTopics?.length
                                  ? `\n1) أبرز المحاور:\n- ${selectedLecture.summary.mainTopics.join('\n- ')}`
                                  : '',
                                selectedLecture.summary?.scientificIssues?.length
                                  ? `\n2) المسائل العلمية:\n- ${selectedLecture.summary.scientificIssues.join('\n- ')}`
                                  : '',
                                selectedLecture.summary?.benefitsAndRules?.length
                                  ? `\n3) الفوائد والضوابط:\n- ${selectedLecture.summary.benefitsAndRules.join('\n- ')}`
                                  : '',
                              ].filter(Boolean).join('\n');
                              handleCopyText('lec_summary', fullText);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#2e493b] bg-white hover:bg-stone-100 border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                            title="نسخ التلخيص"
                          >
                            {copiedId === 'lec_summary' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">تم نسخ التلخيص</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ التلخيص</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isExportingLecPdf}
                            onClick={async () => {
                              if (!selectedLecture.summary) return;
                              setIsExportingLecPdf(true);
                              try {
                                await exportLectureSummaryPdf({
                                  courseTitle: course.title,
                                  instructorName: course.instructor,
                                  lectureTitle: selectedLecture.title,
                                  lectureDate: selectedLecture.date,
                                  transcript: selectedLecture.transcript,
                                  summary: {
                                    mainTopics: selectedLecture.summary.mainTopics || [],
                                    scientificIssues: selectedLecture.summary.scientificIssues || [],
                                    benefitsAndRules: selectedLecture.summary.benefitsAndRules || [],
                                  },
                                });
                              } catch (e) {
                                console.error('PDF export failed:', e);
                              } finally {
                                setIsExportingLecPdf(false);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#2e493b] hover:bg-[#385947] shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isExportingLecPdf ? 'جاري التصدير...' : 'تصدير كملف PDF'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action 2 Output: Quiz */}
                    {lectureAction === 'quiz' && lecQuizQuestions && !lectureActionLoading && (
                      <div className="space-y-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs animate-fade-in">
                        {(() => {
                          const curQ = lecQuizQuestions[lecQuizIdx];
                          if (!curQ) return null;
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-stone-500">
                                <span className="font-bold text-[#2e493b]">
                                  السؤال {lecQuizIdx + 1} من {lecQuizQuestions.length} (من شرح المحاضرة)
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm font-bold text-[#20352a] leading-relaxed">
                                {curQ.question}
                              </p>

                              <div className="space-y-2 pt-1">
                                {curQ.options.map((opt, optIdx) => {
                                  const isSelected = lecQuizSelected === optIdx;
                                  const isCorrect = optIdx === curQ.correctIndex;
                                  const answered = lecQuizAnswered !== 'none';

                                  let style = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';
                                  if (answered) {
                                    if (isCorrect) {
                                      style = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold';
                                    } else if (isSelected) {
                                      style = 'bg-rose-100 border-rose-500 text-rose-950 font-bold';
                                    } else {
                                      style = 'opacity-50 bg-stone-50 border-stone-200 text-stone-500';
                                    }
                                  }

                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      disabled={answered}
                                      onClick={() => {
                                        const correct = optIdx === curQ.correctIndex;
                                        setLecQuizSelected(optIdx);
                                        setLecQuizAnswered(correct ? 'correct' : 'wrong');
                                        if (correct) {
                                          triggerConfetti();
                                        }
                                      }}
                                      className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer text-xs ${style}`}
                                    >
                                      <span>{opt}</span>
                                      {answered && isCorrect && (
                                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Gender-Aware Positive Reinforcement Banner */}
                              {lecQuizAnswered === 'correct' && (
                                <div className="p-3 bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-xs animate-scale-in shadow-xs">
                                  <Award className="w-4 h-4 text-amber-200" />
                                  <span>{isMale ? 'أحسنتَ بارك الله فيكَ!' : 'أحسنتِ بارك الله فيكِ!'}</span>
                                </div>
                              )}

                              {/* Explanation */}
                              {lecQuizAnswered !== 'none' && curQ.explanation && (
                                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-[11px] text-stone-700 leading-relaxed">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-bold text-[#20352a]">التعليل العلمي:</p>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(`lq_exp_${lecQuizIdx}`, curQ.explanation)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-stone-500 hover:text-[#2e493b] hover:bg-stone-200 transition-colors cursor-pointer"
                                      title="نسخ التعليل"
                                    >
                                      {copiedId === `lq_exp_${lecQuizIdx}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span className="text-emerald-700 font-bold">تم النسخ</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>نسخ</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p>{curQ.explanation}</p>
                                </div>
                              )}

                              {/* Next Question Navigation */}
                              {lecQuizAnswered !== 'none' && lecQuizIdx < lecQuizQuestions.length - 1 && (
                                <div className="pt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLecQuizIdx((i) => i + 1);
                                      setLecQuizSelected(null);
                                      setLecQuizAnswered('none');
                                    }}
                                    className="px-4 py-2 bg-[#2e493b] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-[#385947] transition-colors"
                                  >
                                    السؤال التالي
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Action 3 Output: Q&A */}
                    {lectureAction === 'qa' && (
                      <div className="space-y-4 pt-2">
                        <div className="space-y-3 min-h-[120px] max-h-[300px] overflow-y-auto p-3 bg-stone-50 rounded-2xl border border-stone-200">
                          {lecQaMessages.length === 0 ? (
                            <div className="text-center py-6 text-xs text-stone-400">
                              اسأل عن أي نقطة أو مسألة وردت في شرح هذا التسجيل.
                            </div>
                          ) : (
                            lecQaMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-[#2e493b] text-white mr-auto max-w-[85%]'
                                    : 'bg-white border border-stone-200 text-[#20352a] ml-auto max-w-[95%] shadow-2xs'
                                }`}
                              >
                                <p className="font-bold mb-1 text-[11px] opacity-80">
                                  {msg.role === 'user' ? 'سؤالك:' : 'إجابة المساعد من المحاضرة:'}
                                </p>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.role === 'assistant' && (
                                  <div className="pt-2 mt-2 border-t border-stone-100 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(`lqa_${idx}`, msg.text)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-600 hover:text-[#2e493b] hover:bg-stone-100 transition-colors cursor-pointer"
                                      title="نسخ الإجابة"
                                    >
                                      {copiedId === `lqa_${idx}` ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="text-emerald-700">تم النسخ</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>نسخ</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handleLecQaSubmit} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={lecQaQuery}
                            onChange={(e) => setLecQaQuery(e.target.value)}
                            placeholder="اطرح سؤالك حول كلام المحاضر في هذا التسجيل..."
                            className="flex-1 py-2.5 px-4 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:border-[#2e493b] focus:outline-none text-[#20352a]"
                          />
                          <button
                            type="submit"
                            disabled={lectureActionLoading || !lecQaQuery.trim()}
                            className="px-4 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>إرسال</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
