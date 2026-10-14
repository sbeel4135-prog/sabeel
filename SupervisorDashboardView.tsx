import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  BookOpen,
  Award,
  FileText,
  Bell,
  ShieldCheck,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  CheckCircle2,
  Activity,
  UserCheck,
} from 'lucide-react';
import { ExamQuestion } from '../../types';

export const SupervisorDashboardView: React.FC = () => {
  const {
    currentUser,
    users,
    courses,
    files,
    exams,
    attempts,
    announcements,
    logs,
    addCourse,
    deleteCourse,
    deleteFile,
    addExam,
    addAnnouncement,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'courses' | 'exams' | 'announcements' | 'logs'>('overview');

  // Exam creator state
  const [showExamCreator, setShowExamCreator] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examCourseId, setExamCourseId] = useState(courses[0]?.id || '');
  const [examDuration, setExamDuration] = useState(20);
  const [examDescription, setExamDescription] = useState('');
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // New announcement state
  const [showAncModal, setShowAncModal] = useState(false);
  const [ancTitle, setAncTitle] = useState('');
  const [ancContent, setAncContent] = useState('');
  const [ancCategory, setAncCategory] = useState('إعلانات أكاديمية');

  // Check authorization
  if (currentUser?.role !== 'supervisor') {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-900">صفحة محمية خاصة بالمشرف الأكاديمي</h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          هذه الصفحة مخصصة لأعضاء هيئة التدريس وإدارة الكلية لإدارة المقررات، ورصد النتائج، وتعديل الاختبارات وبنوك الأسئلة.
        </p>
        <p className="text-[11px] text-stone-400">
          يمكنك تجربة دور المشرف بالنقر على صورتك في الشريط العلوي ثم اختيار "تبديل الدور إلى مشرف".
        </p>
      </div>
    );
  }

  // Generate Questions via Gemini API
  const handleGenerateQuestionsAI = async () => {
    const course = courses.find((c) => c.id === examCourseId);
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: course?.title,
          topic: examTitle || 'المسائل الفقهية والأصولية المقررة',
          count: 3,
        }),
      });

      if (!res.ok) throw new Error('فشل توليد الأسئلة');
      const data = await res.json();
      if (Array.isArray(data.questions)) {
        const mappedQuestions: ExamQuestion[] = data.questions.map((q: any, i: number) => ({
          id: `q_ai_${Date.now()}_${i}`,
          type: q.type || 'multiple_choice',
          question: q.question,
          options: q.options || ['نعم', 'لا'],
          correctIndex: q.correctIndex || 0,
          explanation: q.explanation || 'تم اعتماد المسألة وفق القواعد الشرعية.',
          points: 5,
        }));
        setExamQuestions((prev) => [...prev, ...mappedQuestions]);
        showToast(`تم توليد ${mappedQuestions.length} أسئلة بالذكاء الاصطناعي بنجاح!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('تعذر توليد الأسئلة آلياً، يرجى إضافتها يدوياً.', 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle || examQuestions.length === 0) {
      showToast('الرجاء كتابة عنوان الاختبار وإضافة سؤال واحد على الأقل', 'error');
      return;
    }

    const course = courses.find((c) => c.id === examCourseId);
    const totalMarks = examQuestions.reduce((sum, q) => sum + q.points, 0);

    addExam({
      courseId: examCourseId,
      courseTitle: course?.title || 'مقرر عام',
      title: examTitle,
      description: examDescription || 'اختبار دوري ومسائل تطبيقية.',
      durationMinutes: examDuration,
      totalMarks,
      passingMarks: Math.ceil(totalMarks * 0.6),
      questionsCount: examQuestions.length,
      availableUntil: '2026-11-30',
      questions: examQuestions,
    });

    setShowExamCreator(false);
    setExamTitle('');
    setExamQuestions([]);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancTitle || !ancContent) return;

    addAnnouncement({
      title: ancTitle,
      content: ancContent,
      author: currentUser.name || currentUser.username || 'المشرف الأكاديمي',
      important: true,
      category: ancCategory,
    });

    setShowAncModal(false);
    setAncTitle('');
    setAncContent('');
  };

  return (
    <div className="space-y-8 text-right">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-xs font-semibold text-[#14532d]">لوحة الإدارة والتحكم الأكاديمي</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            مرحبًا بك يا {currentUser.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            صلاحيات كاملة لإدارة الطلاب، المقررات، بنك الأسئلة، واعتماد الملفات المرفوعة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExamCreator(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء اختبار جديد</span>
          </button>
          <button
            onClick={() => setShowAncModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>نشر إعلان</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-[#14532d] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          نظرة عامة وإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'students' ? 'bg-[#14532d] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          الطلاب ونتائج الاختبارات ({attempts.length})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'courses' ? 'bg-[#14532d] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          إدارة المقررات ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'exams' ? 'bg-[#14532d] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          الاختبارات وبنك الأسئلة ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'logs' ? 'bg-[#14532d] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          سجل العمليات والتدقيق ({logs.length})
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-400 mb-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <span className="text-[11px]">الطلاب المسجلين</span>
              </div>
              <p className="text-2xl font-extrabold text-stone-900 font-mono">1,480</p>
              <p className="text-[11px] text-emerald-700 mt-1">+12 طالب جديد هذا الأسبوع</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-400 mb-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span className="text-[11px]">المقررات النشطة</span>
              </div>
              <p className="text-2xl font-extrabold text-stone-900 font-mono">{courses.length}</p>
              <p className="text-[11px] text-stone-500 mt-1">تغطي مختلف الفنون الشرعية</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-400 mb-2">
                <Award className="w-5 h-5 text-emerald-700" />
                <span className="text-[11px]">نسبة النجاح العامة</span>
              </div>
              <p className="text-2xl font-extrabold text-[#14532d] font-mono">92.4%</p>
              <p className="text-[11px] text-stone-500 mt-1">متوسط أداء الطلاب في الاختبارات</p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-400 mb-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span className="text-[11px]">المستندات والكتب</span>
              </div>
              <p className="text-2xl font-extrabold text-stone-900 font-mono">{files.length}</p>
              <p className="text-[11px] text-stone-500 mt-1">ملفات محققة ومعتمدة</p>
            </div>
          </div>

          {/* Recent Attempts Strip */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-4">آخر محاولات الاختبارات المسلمة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400">
                    <th className="pb-3 font-semibold">اسم الطالب</th>
                    <th className="pb-3 font-semibold">الاختبار</th>
                    <th className="pb-3 font-semibold">الدرجة</th>
                    <th className="pb-3 font-semibold">النسبة</th>
                    <th className="pb-3 font-semibold">الحالة</th>
                    <th className="pb-3 font-semibold">وقت التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-stone-50/50">
                      <td className="py-3 font-bold text-stone-800">{att.studentName}</td>
                      <td className="py-3 text-stone-600">{att.examTitle}</td>
                      <td className="py-3 font-mono font-bold text-[#14532d]">
                        {att.score} / {att.totalMarks}
                      </td>
                      <td className="py-3 font-mono">{att.percentage}%</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {att.passed ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                      <td className="py-3 text-stone-400 font-mono">{att.completedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900">سجل الطلاب والدرجات الأكاديمية</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400">
                  <th className="pb-3 font-semibold">اسم الطالب</th>
                  <th className="pb-3 font-semibold">الرقم الجامعي</th>
                  <th className="pb-3 font-semibold">البريد الجامعي</th>
                  <th className="pb-3 font-semibold">القسم</th>
                  <th className="pb-3 font-semibold">المستوى</th>
                  <th className="pb-3 font-semibold">الاختبارات المكتملة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => {
                  const studentAttempts = attempts.filter((a) => a.studentId === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-stone-50/50">
                      <td className="py-3 font-bold text-stone-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono text-[10px]">
                          {(u.name || u.username || 'ط')[0]}
                        </div>
                        <span>{u.name || u.username}</span>
                      </td>
                      <td className="py-3 font-mono text-stone-500">{u.studentId || '—'}</td>
                      <td className="py-3 font-mono text-stone-500">{u.email}</td>
                      <td className="py-3 text-stone-600">{u.department}</td>
                      <td className="py-3 text-stone-600">{u.term}</td>
                      <td className="py-3 font-mono text-[#14532d] font-bold">
                        {studentAttempts.length} اختبارات
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <span className="text-xs text-stone-500">{courses.length} مقرر مسجل</span>
            <h3 className="text-sm font-bold text-stone-900">إدارة المقررات الدراسية</h3>
          </div>

          <div className="divide-y divide-stone-100">
            {courses.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm(`حذف مقرر "${c.title}"؟`)) deleteCourse(c.id);
                  }}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="text-right">
                  <p className="text-xs font-bold text-stone-900">{c.title} ({c.code})</p>
                  <p className="text-[11px] text-stone-500">{c.instructor} · {c.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <button
              onClick={() => setShowExamCreator(true)}
              className="text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة اختبار</span>
            </button>
            <h3 className="text-sm font-bold text-stone-900">الاختبارات وبنك الأسئلة</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exm) => (
              <div key={exm.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#14532d]">{exm.questionsCount} أسئلة</span>
                  <span className="font-bold text-stone-900">{exm.title}</span>
                </div>
                <p className="text-[11px] text-stone-500">{exm.courseTitle} · {exm.durationMinutes} دقيقة</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900">سجل النشاط والعمليات الإدارية</h3>
          <div className="divide-y divide-stone-100">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                <span className="text-stone-400 font-mono text-[11px]">{log.timestamp}</span>
                <div className="text-right space-y-0.5">
                  <p className="font-bold text-stone-800">{log.action}</p>
                  <p className="text-stone-500 text-[11px]">{log.details}</p>
                  <span className="text-[10px] text-emerald-800">{log.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Creator Modal with AI Assistance */}
      {showExamCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-right">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#14532d] text-white p-5 flex items-start justify-between">
              <button
                onClick={() => setShowExamCreator(false)}
                className="p-1 rounded-full text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <div>
                <h3 className="text-base font-bold">إنشاء اختبار إلكتروني جديد</h3>
                <p className="text-xs text-emerald-200">مزود بخاصية التوليد الأكاديمي الذكي للأسئلة</p>
              </div>
            </div>

            <form onSubmit={handleSaveExam} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">المقرر التابع له</label>
                  <select
                    value={examCourseId}
                    onChange={(e) => setExamCourseId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">مدة الاختبار (بالدقائق)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">عنوان الاختبار</label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="مثال: الاختبار الدوري في أصول الفقه وأدلة التشريع"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">وصف الاختبار وملاحظات المشرف</label>
                <textarea
                  rows={2}
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  placeholder="بيان الفصول المشمولة وضوابط التسليم..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              {/* AI Auto Question Generation Button */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGenerateQuestionsAI}
                  disabled={isGeneratingAI}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingAI ? 'جاري التوليد...' : 'توليد 3 أسئلة بالذكاء الاصطناعي'}</span>
                </button>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-950 block">مساعد بنك الأسئلة</span>
                  <span className="text-[11px] text-emerald-800">توليد مسائل فقهية مع خياراتها والتعليل</span>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-700 font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      const newQ: ExamQuestion = {
                        id: `q_man_${Date.now()}`,
                        type: 'multiple_choice',
                        question: 'سؤال فقهي جديد',
                        options: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'],
                        correctIndex: 0,
                        explanation: 'التعليل الشرعي.',
                        points: 5,
                      };
                      setExamQuestions((prev) => [...prev, newQ]);
                    }}
                    className="text-[#14532d] hover:underline cursor-pointer"
                  >
                    + إضافة سؤال يدويًا
                  </button>
                  <span>الأسئلة الحالية ({examQuestions.length})</span>
                </div>

                {examQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExamQuestions((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-stone-800">السؤال {idx + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...examQuestions];
                        updated[idx].question = e.target.value;
                        setExamQuestions(updated);
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowExamCreator(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] rounded-lg shadow-sm"
                >
                  اعتماد وحفظ الاختبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-right">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-[#14532d] text-white p-5 flex items-start justify-between">
              <button
                onClick={() => setShowAncModal(false)}
                className="p-1 rounded-full text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <h3 className="text-base font-bold">نشر إعلان أكاديمي للطلاب</h3>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">عنوان الإعلان</label>
                <input
                  type="text"
                  required
                  value={ancTitle}
                  onChange={(e) => setAncTitle(e.target.value)}
                  placeholder="مثال: موعد اختبار منتصف الفصل"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">نص الإعلان</label>
                <textarea
                  rows={3}
                  required
                  value={ancContent}
                  onChange={(e) => setAncContent(e.target.value)}
                  placeholder="التفاصيل والتعليمات للطلاب..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] rounded-lg shadow-sm"
                >
                  نشر لجميع الطلاب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
