import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  BookOpen,
  Calendar,
  Award,
  Sparkles,
  BookMarked,
  Clock,
  ChevronLeft,
  FileText,
  Upload,
  ArrowRight,
  Sun,
  Sunrise,
  SunMedium,
  CloudSun,
  Sunset,
  Moon,
  ExternalLink,
  Sprout,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { CITIES_PRAYER_TIMES } from '../../data/initialData';

// Image generated via tool
const ISLAMIC_LIBRARY_ARCH_IMG = '/src/assets/images/islamic_library_arch_1791754869774.jpg';

interface HomeViewProps {
  onOpenUpload: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenUpload }) => {
  const {
    currentUser,
    courses,
    files,
    exams,
    attempts,
    setActiveView,
    setSelectedCourseId,
    setPreviewFile,
  } = useApp();

  const [selectedCity, setSelectedCity] = useState('makkah');
  const [searchQuery, setSearchQuery] = useState('');

  const currentPrayerData = CITIES_PRAYER_TIMES[selectedCity] || CITIES_PRAYER_TIMES.makkah;

  // Filtered search results
  const matchingCourses = searchQuery
    ? courses.filter(
        (c) =>
          c.title.includes(searchQuery) ||
          c.code.includes(searchQuery) ||
          c.instructor.includes(searchQuery)
      )
    : [];

  const matchingFiles = searchQuery
    ? files.filter(
        (f) =>
          f.title.includes(searchQuery) ||
          f.courseTitle.includes(searchQuery) ||
          f.fileName.includes(searchQuery)
      )
    : [];

  const navigateToCourse = (id: string) => {
    setSelectedCourseId(id);
    setActiveView('course-detail');
  };

  const getPrayerIcon = (name: string) => {
    switch (name) {
      case 'الفجر':
        return <Sun className="w-4 h-4 text-emerald-600" />;
      case 'الشروق':
        return <Sunrise className="w-4 h-4 text-amber-500" />;
      case 'الظهر':
        return <SunMedium className="w-4 h-4 text-amber-600" />;
      case 'العصر':
        return <CloudSun className="w-4 h-4 text-amber-500" />;
      case 'المغرب':
        return <Sunset className="w-4 h-4 text-orange-500" />;
      case 'العشاء':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. Hero Welcome & Search Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#f1f5f2] to-[#fcfbf7] border border-stone-200/80 px-6 py-12 md:py-16 text-center shadow-sm">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="font-amiri text-lg md:text-xl text-[#14532d] font-semibold tracking-wide">
            السلام عليكم ورحمة الله وبركاته
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#14532d] tracking-tight leading-tight">
            {!currentUser
              ? 'حيّاكم الله في سَبيل'
              : currentUser.gender === 'ذكر'
              ? 'حيّاك الله في سَبيل'
              : 'حيّاكِ الله في سَبيل'}
          </h1>
          <p className="text-sm md:text-base text-stone-600 font-medium">
            رفيقك في رحلتك العلمية نحو فهم الشريعة وخدمة الدين
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-2xl mx-auto relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مقرر، أو خدمة، أو معلومة، أو كتاب ..."
                className="w-full py-4 pr-12 pl-4 text-sm bg-white rounded-2xl border border-stone-300 shadow-md focus:border-[#14532d] focus:ring-2 focus:ring-[#14532d]/20 focus:outline-none transition-all placeholder:text-stone-400"
              />
              <Search className="w-5 h-5 text-stone-400 absolute right-4 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Live Search Instant Results Popover */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-30 text-right space-y-4 max-h-96 overflow-y-auto">
                {matchingCourses.length === 0 && matchingFiles.length === 0 ? (
                  <p className="text-xs text-stone-500 py-3 text-center">
                    لم يتم العثور على نتائج مطابقة لـ "{searchQuery}"
                  </p>
                ) : (
                  <>
                    {matchingCourses.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-stone-900 block mb-2">المقررات:</span>
                        <div className="space-y-1">
                          {matchingCourses.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => navigateToCourse(c.id)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 text-right cursor-pointer"
                            >
                              <span className="text-xs font-semibold text-[#14532d]">{c.title}</span>
                              <span className="text-[11px] text-stone-400">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {matchingFiles.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-stone-900 block mb-2">المستندات والكتب:</span>
                        <div className="space-y-1">
                          {matchingFiles.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setPreviewFile(f)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 text-right cursor-pointer"
                            >
                              <span className="text-xs text-stone-800 truncate max-w-xs">{f.title}</span>
                              <span className="text-[10px] text-stone-400 uppercase">{f.fileFormat}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Category Cards Strip (matching reference image) */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-right">
            <button
              onClick={() => setActiveView('courses')}
              className="p-4 bg-white/90 hover:bg-white rounded-2xl border border-stone-200 hover:border-[#14532d] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532d] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#14532d]">
                  المقررات الدراسية
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">محتوى المقررات وجداولها</p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('schedule')}
              className="p-4 bg-white/90 hover:bg-white rounded-2xl border border-stone-200 hover:border-[#14532d] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532d] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#14532d]">
                  الجدول الدراسي
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">مواعيد المحاضرات والاختبارات</p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('exams')}
              className="p-4 bg-white/90 hover:bg-white rounded-2xl border border-stone-200 hover:border-[#14532d] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532d] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#14532d]">
                  الاختبارات
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">الاختبارات والنتائج والإحصائيات</p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('ai-assistant')}
              className="p-4 bg-white/90 hover:bg-white rounded-2xl border border-stone-200 hover:border-[#14532d] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532d] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#14532d]">
                  الخدمات الإلكترونية
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">مساعد الذكاء وتلخيص المواد</p>
              </div>
            </button>

            <button
              onClick={() => setActiveView('ai-assistant')}
              className="p-4 bg-emerald-50/80 hover:bg-emerald-50 rounded-2xl border border-emerald-200 hover:border-[#14532d] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between col-span-2 sm:col-span-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#14532d] text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <BookMarked className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#14532d]">
                  المساعد في الروض المربع
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">باحث شرعي في المصادر المعتمدة</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Core Tri-Column Section (Prayer Times, Mosque Calligraphy Arch Banner, Current Courses) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Prayer Times Widget (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="makkah">مكة المكرمة</option>
                <option value="madinah">المدينة المنورة</option>
                <option value="riyadh">الرياض</option>
                <option value="cairo">القاهرة</option>
                <option value="jerusalem">القدس الشريف</option>
              </select>
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#14532d]" />
                مواقيت الصلاة
              </span>
            </div>

            <div className="divide-y divide-stone-100 mt-2">
              {currentPrayerData.times.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="font-mono tabular-nums text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                    {p.time}
                  </span>
                  <div className="flex items-center gap-2 text-stone-800 font-medium">
                    <span>{p.name}</span>
                    {getPrayerIcon(p.name)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 text-center">
            <span className="text-[11px] text-stone-400">
              ألا بذكر الله تطمئن القلوب · توقيت محلي
            </span>
          </div>
        </div>

        {/* Column 2: Central Architectural Library Banner with Calligraphy (5 cols) */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-sm group min-h-[340px] flex flex-col justify-end">
          <img
            src={ISLAMIC_LIBRARY_ARCH_IMG}
            alt="المكتبة الشرعية والآية الكريمة"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Measured Dark Scrim for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          {/* Central Calligraphy Overlay */}
          <div className="relative z-10 p-6 text-center text-white space-y-3">
            <div className="inline-block py-1.5 px-4 bg-black/40 backdrop-blur-sm rounded-full border border-white/20 mb-1">
              <span className="text-xs text-emerald-300 font-medium">مكتبة المتون والمصادر المعتمدة</span>
            </div>
            <h2 className="font-amiri text-3xl sm:text-4xl text-amber-100 font-bold tracking-wider drop-shadow-md">
              وَقُل رَّبِّ زِدْنِي عِلْمًا
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 max-w-sm mx-auto leading-relaxed">
              تحتوي البوابة على أمهات كتب الفقه والأصول والحديث مجهزة للمطالعة والبحث الذكي.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveView('courses')}
                className="px-5 py-2 text-xs font-semibold bg-[#14532d] hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                تصفح الكتب والمقررات
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Current Courses (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <button
                onClick={() => setActiveView('courses')}
                className="text-xs text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#14532d]" />
                مقرراتي الحالية
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {courses.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigateToCourse(c.id)}
                  className="p-3 bg-stone-50 hover:bg-emerald-50/50 rounded-xl border border-stone-100 hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-between"
                >
                  <ChevronLeft className="w-4 h-4 text-stone-400" />
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900">{c.title}</p>
                    <span className="text-[11px] text-stone-500">{c.code} · {c.instructor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-[#14532d]">
              {currentUser?.term || 'المستوى الرابع'}
            </span>
            <span>نسبة الإنجاز الفصلي: 72%</span>
          </div>
        </div>
      </section>

      {/* 3. Important Links Strip (matching reference image) */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 text-right mb-4 flex items-center gap-2 justify-end">
          <span>روابط وخدمات مهمة</span>
          <ExternalLink className="w-4 h-4 text-[#14532d]" />
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <button
            onClick={() => setActiveView('ai-assistant')}
            className="p-4 rounded-xl border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#14532d] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-stone-900">مساعدك الذكي للإجابة</p>
            <p className="text-[11px] text-stone-500 mt-0.5">شرح المسائل والاستفسار</p>
          </button>

          <button
            onClick={() => setActiveView('schedule')}
            className="p-4 rounded-xl border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#14532d] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-stone-900">التقويم الأكاديمي</p>
            <p className="text-[11px] text-stone-500 mt-0.5">مواعيد الاختبارات والإجازات</p>
          </button>

          <button
            onClick={() => setActiveView('courses')}
            className="p-4 rounded-xl border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#14532d] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
              <Sprout className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-stone-900">تطبيق ازرع</p>
            <p className="text-[11px] text-stone-500 mt-0.5">غراس العلم وحفظ المتون</p>
          </button>

          <button
            onClick={() => setActiveView('courses')}
            className="p-4 rounded-xl border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#14532d] flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-stone-900">طريقة الاستخدام</p>
            <p className="text-[11px] text-stone-500 mt-0.5">دليل خدمات الطالب والمشرف</p>
          </button>
        </div>
      </section>

      {/* 4. Latest Added Materials & Upcoming Exams */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Files */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs text-right">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <button
              onClick={onOpenUpload}
              className="text-xs text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف جديد</span>
            </button>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#14532d]" />
              آخر الكتب والملخصات المضافة
            </h3>
          </div>

          <div className="divide-y divide-stone-100 mt-3">
            {files.slice(0, 4).map((f) => (
              <div
                key={f.id}
                onClick={() => setPreviewFile(f)}
                className="py-3 flex items-center justify-between hover:bg-stone-50/80 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="text-left text-xs font-mono tabular-nums text-stone-400">
                  <span>{f.fileSize}</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-900 hover:text-[#14532d]">
                    {f.title}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {f.courseTitle} · {f.uploadedBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Exams & Tests */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs text-right">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <button
              onClick={() => setActiveView('exams')}
              className="text-xs text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>مركز الاختبارات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#14532d]" />
              الاختبارات الإلكترونية المتاحة
            </h3>
          </div>

          <div className="space-y-3 mt-3">
            {exams.map((exm) => {
              const attempt = attempts.find((a) => a.examId === exm.id);
              return (
                <div
                  key={exm.id}
                  className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between"
                >
                  <div>
                    {attempt ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                        تم الإنجاز ({attempt.score}/{attempt.totalMarks})
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveView('exams');
                        }}
                        className="text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        بدء الاختبار
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900">{exm.title}</p>
                    <p className="text-[11px] text-stone-500">
                      {exm.courseTitle} · {exm.durationMinutes} دقيقة · {exm.questionsCount} أسئلة
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
