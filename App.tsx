import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DhikrBanner } from './components/DhikrBanner';
import { PrayerTimesWidget } from './components/PrayerTimesWidget';
import { AIAssistantModal } from './components/AIAssistantModal';
import { AddCourseModal } from './components/AddCourseModal';
import { QassimCalendarModal } from './components/QassimCalendarModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { AuthModal } from './components/AuthModal';
import { BottomBanner } from './components/BottomBanner';
import { CoursesView } from './components/views/CoursesView';
import { CourseDetailView } from './components/views/CourseDetailView';
import { ScheduleView } from './components/views/ScheduleView';
import { ProgressView } from './components/views/ProgressView';
import { Course, User, UserCollege, LectureItem, ActiveRecordingInfo } from './types';
import { INITIAL_COURSES } from './data/initialData';
import {
  BookOpen,
  Calendar,
  TrendingUp,
  ChevronLeft,
  Plus,
  ExternalLink,
  GraduationCap,
  LogIn,
  BookMarked,
  Search,
  X,
  Mic,
  Square,
} from 'lucide-react';


export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<
    'home' | 'courses' | 'course-detail' | 'schedule' | 'progress'
  >('home');

  // Selected course for detail view
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAssistantModal, setShowAssistantModal] = useState<boolean>(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  // Site search state
  const [siteSearchQuery, setSiteSearchQuery] = useState<string>('');

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('sabeel_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Guest Architecture:
  // The default view for unauthenticated visitors is strictly the general university study platform (تخصص آخر).
  // Guests cannot select or toggle their major on the main landing view before authentication.
  const activeCollege: UserCollege = currentUser?.college || 'تخصص آخر';
  const isShariaMajor: boolean =
    Boolean(currentUser) &&
    (currentUser?.college === 'كلية الشريعة' || currentUser?.college === 'قانون / أنظمة');
  const userKey = currentUser?.username
    ? currentUser.username.trim().toLowerCase()
    : 'guest';

  // Contextual gentle notice passed to AuthModal when triggered by restricted actions
  const [authModalNotice, setAuthModalNotice] = useState<string>('');

  const loadCoursesForUser = (key: string): Course[] => {
    try {
      const userScoped = localStorage.getItem(`sabeel_courses_v2_${key}`);
      if (userScoped) {
        const parsed = JSON.parse(userScoped);
        if (Array.isArray(parsed)) return parsed;
      }
      if (key === 'guest') {
        const storedV2 = localStorage.getItem('sabeel_courses_v2');
        if (storedV2) {
          const parsed = JSON.parse(storedV2);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_COURSES;
  };

  // Courses state (persisted per-account in localStorage)
  const [courses, setCourses] = useState<Course[]>(() => loadCoursesForUser(userKey));

  // Reload courses when user account changes
  useEffect(() => {
    setCourses(loadCoursesForUser(userKey));
  }, [userKey]);

  // Assistant initial query
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string | undefined>(undefined);

  // =========================================================================
  // Persistent Global Audio Recording State (Continues across internal navigation)
  // =========================================================================
  const [activeRecording, setActiveRecording] = useState<ActiveRecordingInfo>({
    isRecording: false,
    courseId: '',
    courseTitle: '',
    customTitle: '',
    recordingSeconds: 0,
    error: null,
  });
  const [lecturesRevision, setLecturesRevision] = useState<number>(0);

  const globalRecorderRef = useRef<MediaRecorder | null>(null);
  const globalStreamRef = useRef<MediaStream | null>(null);
  const globalChunksRef = useRef<Blob[]>([]);
  const globalSecondsRef = useRef<number>(0);
  const globalTimerRef = useRef<any>(null);
  const globalTitleRef = useRef<string>('');
  const globalCourseRef = useRef<Course | null>(null);

  // Prevent accidental browser tab close/reload while recording is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeRecording.isRecording) {
        e.preventDefault();
        e.returnValue = 'يوجد تسجيل صوتي قيد العمل حالياً، هل تريدين المغادرة وفقدان التسجيل؟';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeRecording.isRecording]);

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

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const handleStartGlobalRecording = async (course: Course, customTitle: string) => {
    if (activeRecording.isRecording) {
      return;
    }

    setActiveRecording({
      isRecording: false,
      courseId: course.id,
      courseTitle: course.title,
      customTitle,
      recordingSeconds: 0,
      error: null,
    });

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setActiveRecording((prev) => ({
          ...prev,
          error: 'متصفحك الحالي لا يدعم ميزة تسجيل الصوت المباشر. يمكنك رفع ملف صوتي جاهز.',
        }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      globalStreamRef.current = stream;
      globalChunksRef.current = [];
      globalSecondsRef.current = 0;
      globalTitleRef.current = customTitle;
      globalCourseRef.current = course;

      const mimeType = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find((type) =>
        typeof MediaRecorder !== 'undefined' &&
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          globalChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (globalTimerRef.current) {
          clearInterval(globalTimerRef.current);
          globalTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        if (globalStreamRef.current) {
          globalStreamRef.current.getTracks().forEach((t) => t.stop());
          globalStreamRef.current = null;
        }

        const targetCourse = globalCourseRef.current || course;
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(globalChunksRef.current, { type: finalMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const totalSecs = Math.max(1, globalSecondsRef.current);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

        let base64Data = '';
        try {
          base64Data = await blobToBase64(audioBlob);
        } catch (err) {
          console.error('Error converting audio blob to base64:', err);
        }

        const todayStr = new Date().toLocaleDateString('ar-SA');
        const defaultTitle = `محاضرة ${targetCourse.title} - ${todayStr}`;
        const finalTitle = (globalTitleRef.current || '').trim() || defaultTitle;

        const newLec: LectureItem = {
          id: `rec_${Date.now()}`,
          title: finalTitle,
          date: todayStr,
          duration: durStr,
          audioUrl,
          audioBase64: base64Data,
          mimeType: finalMimeType,
          sourceType: 'recording',
        };

        const storageKey = `sabeel_lectures_v2_${targetCourse.id}`;
        try {
          const existingRaw = localStorage.getItem(storageKey);
          const existingList: LectureItem[] = existingRaw ? JSON.parse(existingRaw) : [];
          const { audioBase64, ...serializableLec } = newLec;
          const updatedList = [serializableLec, ...existingList];
          localStorage.setItem(storageKey, JSON.stringify(updatedList));
        } catch (e) {
          console.error(e);
        }

        setActiveRecording({
          isRecording: false,
          isSummarizing: false,
          summarizingStep: undefined,
          lectureId: newLec.id,
          courseId: targetCourse.id,
          courseTitle: targetCourse.title,
          customTitle: finalTitle,
          recordingSeconds: 0,
          error: null,
        });
        setLecturesRevision((r) => r + 1);
      };

      recorder.start(500);
      globalRecorderRef.current = recorder;

      setActiveRecording({
        isRecording: true,
        courseId: course.id,
        courseTitle: course.title,
        customTitle,
        recordingSeconds: 0,
        error: null,
      });

      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
      globalTimerRef.current = setInterval(() => {
        globalSecondsRef.current += 1;
        setActiveRecording((prev) => ({
          ...prev,
          recordingSeconds: globalSecondsRef.current,
        }));
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err?.name, err?.message);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setActiveRecording({
        isRecording: false,
        courseId: course.id,
        courseTitle: course.title,
        customTitle: '',
        recordingSeconds: 0,
        error: isPermissionDenied
          ? 'تعذر الوصول إلى الميكروفون. يرجى السماح بإذن استخدام الميكروفون في المتصفح ثم المحاولة مرة أخرى.'
          : (err?.message || 'تعذر تشغيل الميكروفون.'),
      });
    }
  };

  const handleStopGlobalRecording = () => {
    if (globalRecorderRef.current && globalRecorderRef.current.state !== 'inactive') {
      setActiveRecording((prev) => ({
        ...prev,
        isRecording: false,
        isSummarizing: true,
        summarizingStep: 'جاري إنهاء التسجيل والتحضير للتلخيص بالذكاء الاصطناعي...',
      }));
      try {
        globalRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder in handleStopGlobalRecording:', err);
      }
    } else {
      setActiveRecording((prev) => ({
        ...prev,
        isRecording: false,
        isSummarizing: false,
        summarizingStep: undefined,
      }));
    }
  };

  const handleUpdateRecordingTitle = (newTitle: string) => {
    globalTitleRef.current = newTitle;
    setActiveRecording((prev) => ({
      ...prev,
      customTitle: newTitle,
    }));
  };


  // Persist courses per account
  useEffect(() => {
    try {
      localStorage.setItem(`sabeel_courses_v2_${userKey}`, JSON.stringify(courses));
      if (userKey === 'guest') {
        localStorage.setItem('sabeel_courses_v2', JSON.stringify(courses));
      }
    } catch (e) {
      console.error(e);
    }
  }, [courses, userKey]);

  const handleToggleOrSelectCollege = (newCollege: UserCollege) => {
    if (currentUser) {
      const updatedUser: User = { ...currentUser, college: newCollege };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('sabeel_current_user', JSON.stringify(updatedUser));
        const rawRegistry = localStorage.getItem('sabeel_accounts_registry');
        if (rawRegistry) {
          const registry = JSON.parse(rawRegistry);
          if (Array.isArray(registry)) {
            const updatedRegistry = registry.map((acc: any) =>
              acc.username?.toLowerCase() === currentUser.username?.toLowerCase()
                ? { ...acc, college: newCollege }
                : acc
            );
            localStorage.setItem('sabeel_accounts_registry', JSON.stringify(updatedRegistry));
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setAuthModalNotice(
        'سجّل دخولك أو أنشئ حساباً جديداً للتبديل بين التخصصات وإتاحة باقة الشريعة والأنظمة.'
      );
      setShowAuthModal(true);
    }
  };

  const handleOpenEzraa = () => {
    window.open('https://reem.chat/s/NECqLha7bP', '_blank', 'noopener,noreferrer');
  };

  const handleOpenRawdahResearcher = () => {
    window.open('https://share.google/xWJWqGRIGwD9qZNrj', '_blank', 'noopener,noreferrer');
  };

  const handleOpenShariaDrive = () => {
    window.open(
      'https://drive.google.com/drive/folders/1ylwQbLmcuE3VybKza76ABKOt-huzPgMS',
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('sabeel_current_user');
    setCurrentUser(null);
  };

  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => {
      const updated = [newCourse, ...prev];
      try {
        localStorage.setItem(`sabeel_courses_v2_${userKey}`, JSON.stringify(updated));
        if (userKey === 'guest') {
          localStorage.setItem('sabeel_courses_v2', JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleEditCourseTitle = (courseId: string, newTitle: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, title: newTitle } : c))
    );
    setSelectedCourse((prev) =>
      prev && prev.id === courseId ? { ...prev, title: newTitle } : prev
    );
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    try {
      localStorage.removeItem(`sabeel_lectures_v2_${courseId}`);
      localStorage.removeItem(`sabeel_book_v3_${courseId}`);
    } catch {
      // ignore
    }
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
      setCurrentView('courses');
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAssistantWithPrompt = (prompt?: string) => {
    setAssistantInitialQuery(prompt);
    setShowAssistantModal(true);
  };

  // Filtered courses based on site search query
  const filteredCourses = siteSearchQuery.trim()
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
          c.instructor.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(siteSearchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#24352b] selection:bg-[#2e493b]/15 selection:text-[#20352a]">
      {/* 1. Header (اسم المستخدم الحالي + التخصص + تسجيل الخروج / الدخول) */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenAssistant={() => handleOpenAssistantWithPrompt()}
        onToggleCollege={() => {
          handleToggleOrSelectCollege(
            isShariaMajor ? 'تخصص آخر' : 'كلية الشريعة'
          );
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center py-6 sm:py-8 px-3 sm:px-6">
        {/* ========================================================================= */}
        {/* VIEW: HOME (الواجهة الأساسية المنظمة بالكامل وفق متطلبات المستخدم)             */}
        {/* ========================================================================= */}
        {currentView === 'home' && (
          <div className="max-w-5xl w-full mx-auto space-y-8 animate-fade-in">
            {/* النص الترحيبي أعلى الصفحة بنظام سطرين منفصلين ومتناسقين */}
            <div className="text-center py-4 sm:py-6 space-y-3">
              <p className="text-sm sm:text-base font-normal text-[#385947] font-['Amiri','Noto_Naskh_Arabic',serif] tracking-wide">
                السلام عليكم ورحمة الله وبركاته
              </p>

              <div className="space-y-2.5 flex flex-col items-center justify-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1f3328] font-['Amiri',serif] leading-tight tracking-wide drop-shadow-xs">
                  {!currentUser
                    ? 'حيّاكم الله في سَبيل'
                    : currentUser.gender === 'ذكر'
                    ? 'حيّاك الله في سَبيل'
                    : 'حيّاكِ الله في سَبيل'}
                </h1>
                <p className="text-base sm:text-lg md:text-xl font-medium text-[#385947] font-['Amiri',serif] leading-relaxed">
                  {isShariaMajor
                    ? 'رفيقك في رحلتك العلمية نحو فهم الشريعة وخدمة الدين'
                    : 'رفيقك في رحلتك العلمية'}
                </p>
              </div>

              {/* شريط البحث في الموقع */}
              <div className="max-w-xl mx-auto pt-3">
                <div className="relative">
                  <input
                    type="text"
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    placeholder={
                      isShariaMajor
                        ? 'ابحث عن مقرر، كتاب دراسي، محاضرة، أو مسألة فقهية...'
                        : 'ابحث عن مقرر، كتاب دراسي، أو محاضرة...'
                    }
                    className="w-full bg-white text-right pr-11 pl-10 py-3 rounded-2xl border border-[#2e493b]/20 focus:border-[#2e493b] focus:ring-2 focus:ring-[#2e493b]/15 text-xs sm:text-sm text-[#20352a] placeholder-stone-400 shadow-2xs transition-all outline-none"
                  />
                  <Search className="w-4 h-4 text-stone-400 absolute right-4 top-3.5" />
                  {siteSearchQuery && (
                    <button
                      onClick={() => setSiteSearchQuery('')}
                      className="absolute left-3 top-3 p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Live Search Results Dropdown/List */}
                {siteSearchQuery.trim() && (
                  <div className="mt-2 bg-white rounded-2xl border border-[#2e493b]/20 shadow-lg p-3 text-right space-y-2 text-xs">
                    <div className="flex items-center justify-between text-stone-400 text-[11px] pb-1 border-b border-stone-100">
                      <span>نتائج البحث في المقررات:</span>
                      <span>{filteredCourses.length} نتيجة</span>
                    </div>
                    {filteredCourses.length > 0 ? (
                      <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                        {filteredCourses.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCourse(c)}
                            className="py-2 px-2 hover:bg-[#f2f6f3] rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <span className="font-bold text-[#2e493b] flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              {c.title}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {c.instructor || (c.creditHours ? `${c.creditHours} ساعات` : '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-3 text-stone-400 text-xs">
                        لا توجد مقررات مطابقة لعبارة البحث، جرب مصطلحاً آخر.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* قسم المواقيت والذكر: يظهر حصراً لطلبة الشريعة والأنظمة بعد تسجيل الدخول */}
            {/* ========================================================================= */}
            {isShariaMajor && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch animate-fade-in">
                {/* 1) العمود الأول (اليمين في واجهة RTL): كرت مواقيت الصلاة بعرض 50% */}
                <div className="h-full flex flex-col w-full">
                  <PrayerTimesWidget />
                </div>

                {/* 2) العمود الثاني (اليسار في واجهة RTL): كرت الذكر / الآية بعرض 50% */}
                <div className="h-full flex flex-col w-full">
                  <DhikrBanner />
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* لافتة الزائر الافتراضية (تختفي فور تسجيل الدخول): ربط الحساب والتخصص      */}
            {/* ========================================================================= */}
            {!currentUser && (
              <div
                onClick={() => {
                  setAuthModalNotice(
                    'سجّل دخولك أو أنشئ حساباً جديداً للتبديل بين التخصصات، وإتاحة باقة الشريعة والأنظمة، وحفظ مقرراتك ومزامنتها بأمان.'
                  );
                  setShowAuthModal(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setAuthModalNotice(
                      'سجّل دخولك أو أنشئ حساباً جديداً للتبديل بين التخصصات، وإتاحة باقة الشريعة والأنظمة، وحفظ مقرراتك ومزامنتها بأمان.'
                    );
                    setShowAuthModal(true);
                  }
                }}
                className="group p-5 bg-gradient-to-r from-[#20352a] to-[#2e493b] text-white rounded-3xl shadow-sm hover:shadow-md border border-[#2e493b]/30 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 text-right transition-all duration-200 animate-fade-in"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold font-cairo text-white leading-relaxed">
                      ربط الحساب: سجّل دخولك أو أنشئ حساباً جديداً للتبديل بين التخصصات، وإتاحة باقة الشريعة والأنظمة، وحفظ مقرراتك ومزامنتها بأمان
                    </p>
                    <p className="text-xs text-stone-300">
                      المنصة الافتراضية الحالية: منصة دراسية جامعية عامة لجميع التخصصات. انقر هنا لتسجيل الدخول أو إنشاء حساب جديد.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs">
                    <span>تسجيل الدخول / إنشاء حساب</span>
                    <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            )}


            {/* مخصص لطلاب كلية الشريعة: المقررات الدراسية الخاصة بالشريعة المرتبطة برابط Google Drive */}
            {isShariaMajor && (
              <section className="animate-fade-in">
                <div
                  onClick={handleOpenShariaDrive}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleOpenShariaDrive();
                  }}
                  className="group p-5 sm:p-6 bg-[#f4f7f4] hover:bg-[#ebf1ec] text-[#20352a] rounded-3xl border border-[#2e493b]/20 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden text-right"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#e0eae2] text-[#2e493b] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold font-cairo text-[#20352a]">
                          المقررات الدراسية الخاصة بالشريعة
                        </h3>
                        <span className="text-[11px] font-bold text-[#2e493b] bg-white border border-[#2e493b]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <span>رابط Google Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                        مجلد قوقل درايف الشامل للمتون، الكتب المقررة، المذكرات، والتفريغات المعتمدة لطلبة الشريعة.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2e493b] hover:bg-[#253c30] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs">
                      <span>فتح المجلد الآن</span>
                      <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 2. البطاقات الرئيسية الأربع بأبعاد وارتفاع موحد ومتوازٍ ونصوص مختصرة         */}
            {/* ========================================================================= */}
            <section className="text-right">
              <div
                className={`grid grid-cols-1 ${
                  isShariaMajor ? 'md:grid-cols-2' : 'md:grid-cols-3'
                } gap-5 sm:gap-6 items-stretch`}
              >
                {/* ------------------------------------------------------------- */}
                {/* البطاقة 1: «المقررات الدراسية»                                   */}
                {/* ------------------------------------------------------------- */}
                <div
                  onClick={() => setCurrentView('courses')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setCurrentView('courses');
                  }}
                  className="group p-6 bg-white hover:bg-[#f7f9f7] rounded-3xl border border-[#2e493b]/15 hover:border-[#2e493b]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[168px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] group-hover:bg-[#2e493b] text-[#2e493b] group-hover:text-emerald-100 flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-[#3a5d4a] bg-[#f0f4f1] px-3 py-1 rounded-full">
                      {courses.length} مقررات مسجلة
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                        المقررات الدراسية
                      </h3>
                      <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-[#2e493b] transition-all transform group-hover:-translate-x-1 shrink-0" />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-500 font-medium">
                      كتاب PDF · تلخيص صوتي · أسئلة
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          setAuthModalNotice(
                            'يرجى تسجيل الدخول أو إنشاء حساب لإضافة وحفظ مقرراتك الدراسية بأمان.'
                          );
                          setShowAuthModal(true);
                          return;
                        }
                        setShowAddCourseModal(true);
                      }}
                      className="px-2.5 py-1 bg-[#e8eee9] hover:bg-[#2e493b] text-[#2e493b] hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة مقرر</span>
                    </button>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* البطاقة 2: «الجدول الدراسي»                                     */}
                {/* ------------------------------------------------------------- */}
                <div
                  onClick={() => setCurrentView('schedule')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setCurrentView('schedule');
                  }}
                  className="group p-6 bg-white hover:bg-[#f7f9f7] rounded-3xl border border-[#2e493b]/15 hover:border-[#2e493b]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[168px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] group-hover:bg-[#2e493b] text-[#2e493b] group-hover:text-emerald-100 flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
                      الأحد - الخميس
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                        الجدول الدراسي
                      </h3>
                      <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-[#2e493b] transition-all transform group-hover:-translate-x-1 shrink-0" />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-500 font-medium">
                      رفع صورة / جدول منظم
                    </span>
                    <span className="text-[11px] text-[#2e493b] font-bold group-hover:underline">
                      استعراض الجدول
                    </span>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* البطاقة 3: «لوحة التقدم»                                        */}
                {/* ------------------------------------------------------------- */}
                <div
                  onClick={() => setCurrentView('progress')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setCurrentView('progress');
                  }}
                  className="group p-6 bg-white hover:bg-[#f7f9f7] rounded-3xl border border-[#2e493b]/15 hover:border-[#2e493b]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[168px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] group-hover:bg-[#2e493b] text-[#2e493b] group-hover:text-emerald-100 flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                      مؤشرات الإنجاز
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                        لوحة التقدم
                      </h3>
                      <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-[#2e493b] transition-all transform group-hover:-translate-x-1 shrink-0" />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-500 font-medium">
                      إحصائيات · أشرطة تقدم · مهام
                    </span>
                    <span className="text-[11px] text-[#2e493b] font-bold group-hover:underline">
                      عرض الإحصائيات
                    </span>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* البطاقة 4: «الباحث في الروض المربع وروضة الناظر» (تظهر لتخصص الشريعة فقط) */}
                {/* ------------------------------------------------------------- */}
                {isShariaMajor && (
                  <div
                    onClick={handleOpenRawdahResearcher}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleOpenRawdahResearcher();
                    }}
                    className="group p-6 bg-white hover:bg-[#f7f9f7] rounded-3xl border border-[#2e493b]/15 hover:border-[#2e493b]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[168px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] group-hover:bg-[#2e493b] text-[#2e493b] group-hover:text-emerald-100 flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0">
                        <BookMarked className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                        <span>رابط خارجي مباشر</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="my-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                          الباحث في الروض المربع وروضة الناظر
                        </h3>
                        <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-[#2e493b] transition-all transform group-hover:-translate-x-1 shrink-0" />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-stone-500 font-medium">
                        فقه حنبلي · أصول فقه
                      </span>
                      <span className="text-[11px] text-[#2e493b] font-bold group-hover:underline flex items-center gap-1">
                        <span>فتح الباحث الآن</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW: COURSES (قائمة المقررات مع زر إضافة مقرر جديد)                          */}
        {/* ========================================================================= */}
        {currentView === 'courses' && (
          <CoursesView
            courses={courses}
            onSelectCourse={handleSelectCourse}
            onOpenAddModal={() => {
              if (!currentUser) {
                setAuthModalNotice(
                  'يرجى تسجيل الدخول أو إنشاء حساب لإضافة وحفظ مقرراتك الدراسية بأمان.'
                );
                setShowAuthModal(true);
                return;
              }
              setShowAddCourseModal(true);
            }}
            onEditCourseTitle={handleEditCourseTitle}
            onDeleteCourse={handleDeleteCourse}
            onBack={() => setCurrentView('home')}
            isShariaMajor={isShariaMajor}
            onOpenShariaDrive={handleOpenShariaDrive}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW: COURSE DETAIL (الأقسام الثلاثة: الكتاب PDF، المحاضرات وتلخيصها، المساعد الذكي) */}
        {/* ========================================================================= */}
        {currentView === 'course-detail' && selectedCourse && (
          <CourseDetailView
            course={selectedCourse}
            currentUser={currentUser}
            onBack={() => setCurrentView('courses')}
            onOpenAssistant={handleOpenAssistantWithPrompt}
            onEditCourseTitle={handleEditCourseTitle}
            onDeleteCourse={handleDeleteCourse}
            activeRecording={activeRecording}
            onStartGlobalRecording={handleStartGlobalRecording}
            onStopGlobalRecording={handleStopGlobalRecording}
            onUpdateRecordingTitle={handleUpdateRecordingTitle}
            lecturesRevision={lecturesRevision}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW: SCHEDULE (رفع صورة/ملف الجدول أو جدول تفاعلي أسبوعي)                 */}
        {/* ========================================================================= */}
        {currentView === 'schedule' && (
          <ScheduleView
            onBack={() => setCurrentView('home')}
            userKey={userKey}
            isShariaMajor={isShariaMajor}
            isGuest={!currentUser}
            onRequestAuth={(notice) => {
              setAuthModalNotice(
                notice || 'يرجى تسجيل الدخول أو إنشاء حساب لإضافة وتعديل جدولك الدراسي.'
              );
              setShowAuthModal(true);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW: PROGRESS (لوحة التقدم والإحصائيات والمهام)                            */}
        {/* ========================================================================= */}
        {currentView === 'progress' && (
          <ProgressView
            courses={courses}
            onBack={() => setCurrentView('home')}
            userKey={userKey}
            isShariaMajor={isShariaMajor}
            onOpenCourse={(id) => {
              const matched = courses.find((c) => c.id === id);
              if (matched) handleSelectCourse(matched);
            }}
          />
        )}
      </main>

      {/* الشريط الصوتي العائم والمستمر أثناء التنقل الداخلي في المنصة */}
      {activeRecording.isRecording && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 bg-[#20352a] text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-400/30 flex items-center justify-between gap-3 animate-fade-in">
          <div
            onClick={() => {
              const target = courses.find((c) => c.id === activeRecording.courseId);
              if (target) {
                setSelectedCourse(target);
                setCurrentView('course-detail');
              }
            }}
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-400/40 shrink-0">
              <Mic className="w-4 h-4 text-rose-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-300">جاري التسجيل</span>
                <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                  {Math.floor(activeRecording.recordingSeconds / 60) < 10 ? '0' : ''}
                  {Math.floor(activeRecording.recordingSeconds / 60)}:
                  {activeRecording.recordingSeconds % 60 < 10 ? '0' : ''}
                  {activeRecording.recordingSeconds % 60}
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-50 truncate mt-0.5">
                {activeRecording.customTitle ||
                  `محاضرة ${activeRecording.courseTitle} - ${new Date().toLocaleDateString('ar-SA')}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStopGlobalRecording}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>إيقاف وحفظ</span>
          </button>
        </div>
      )}


      {/* البنر السفلي: المساعد الذكي + تطبيق ازرع + التقويم الأكاديمي + طريقة الاستخدام + الأبيات الشعرية (لتخصص الشريعة فقط) */}
      <BottomBanner
        onOpenAssistant={() => handleOpenAssistantWithPrompt()}
        onOpenEzraa={handleOpenEzraa}
        onOpenCalendar={() => setShowCalendarModal(true)}
        onOpenInstallGuide={() => setShowInstallModal(true)}
        showPoetry={isShariaMajor}
      />

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        notice={authModalNotice}
        onClose={() => {
          setShowAuthModal(false);
          setAuthModalNotice('');
        }}
        onSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalNotice('');
        }}
      />

      <AIAssistantModal
        isOpen={showAssistantModal}
        initialQuery={assistantInitialQuery}
        college={activeCollege}
        onClose={() => {
          setShowAssistantModal(false);
          setAssistantInitialQuery(undefined);
        }}
      />

      <AddCourseModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onAddCourse={handleAddCourse}
        isShariaMajor={isShariaMajor}
      />

      <QassimCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />

      <InstallGuideModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
