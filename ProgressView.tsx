import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Volume2,
  FileCheck2,
  Flame,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  BarChart3,
  GraduationCap,
  HelpCircle,
  X,
  Info,
  Check,
} from 'lucide-react';
import { Course } from '../../types';

interface ProgressViewProps {
  courses: Course[];
  onBack: () => void;
  onOpenCourse: (courseId: string) => void;
  userKey?: string;
  isShariaMajor?: boolean;
}

interface TaskItem {
  id: string;
  title: string;
  courseName: string;
  completed: boolean;
  dueDate: string;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  courses,
  onBack,
  onOpenCourse,
  userKey = 'guest',
  isShariaMajor = true,
}) => {
  const tasksStorageKey = `sabeel_study_tasks_v2_${userKey}`;

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(tasksStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return isShariaMajor
      ? [
          {
            id: 't1',
            title: 'استكمال حفظ شروط الصلاة من الروض المربع',
            courseName: 'فقه الصلاة والطهارة',
            completed: true,
            dueDate: 'أمس',
          },
          {
            id: 't2',
            title: 'مراجعة أركان القياس الأربعة من روضة الناظر',
            courseName: 'مدخل أصول الفقه',
            completed: true,
            dueDate: 'اليوم',
          },
          {
            id: 't3',
            title: 'الاستماع لتسجيل المحاضرة الخامسة وتلخيصها',
            courseName: 'مدخل أصول الفقه',
            completed: false,
            dueDate: 'الخميس',
          },
        ]
      : [
          {
            id: 'tg1',
            title: 'مراجعة ملخص المحاضرة الثالثة من المقرر',
            courseName: 'مقرر دراسي',
            completed: true,
            dueDate: 'اليوم',
          },
          {
            id: 'tg2',
            title: 'حل أسئلة المراجعة الأسبوعية',
            courseName: 'مقرر دراسي',
            completed: false,
            dueDate: 'الخميس',
          },
        ];
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCourse, setNewTaskCourse] = useState(courses[0]?.title || 'مهمة عامة');
  const [showHelpModal, setShowHelpModal] = useState(false);

  React.useEffect(() => {
    try {
      localStorage.setItem(tasksStorageKey, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, tasksStorageKey]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      courseName: courses[0]?.title || newTaskCourse || 'مهمة دراسية',
      completed: false,
      dueDate: 'هذا الأسبوع',
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // Aggregate stats
  const totalHours = courses.reduce((acc, c) => acc + (c.creditHours || 3), 0);
  const totalLectures = courses.reduce((acc, c) => acc + (c.lecturesCount || 0), 0);
  const totalExams = courses.reduce((acc, c) => acc + (c.examsCount || 0), 0);
  const avgProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((acc, c) => acc + (c.progress || 0), 0) / courses.length
        )
      : 0;

  return (
    <div className="space-y-6 text-right animate-fade-in max-w-5xl mx-auto w-full px-2 sm:px-4">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#2e493b] transition-colors cursor-pointer group"
        >
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          <span>العودة للرئيسية</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#e8eee9] border border-[#2e493b]/20 text-[#2e493b] text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
            title="مساعدة: شرح مؤشرات وأشرطة التقدم وتتبع المهام"
          >
            <HelpCircle className="w-4 h-4 text-[#2e493b] group-hover:scale-110 transition-transform" />
            <span>مساعدة وشرح اللوحة</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#20352a] font-cairo">
                لوحة التقدم والإنجاز العلمي
              </h1>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="p-1.5 rounded-xl text-[#2e493b] hover:bg-[#e8eee9] transition-colors cursor-pointer"
                title="اضغط لمعرفة كيفية قراءة المؤشرات وأشرطة التقدم"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500">
              متابعة دقيقة لمستوى تحصيلك في المقررات، الساعات المعتمدة، المهام المنجزة، والاختبارات المجتازة.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#e8eee9] hover:bg-[#d8e3da] text-[#2e493b] text-xs font-bold transition-colors cursor-pointer"
              title="دليل قراءة مؤشرات التقدم"
            >
              <HelpCircle className="w-4 h-4" />
              <span>دليل المؤشرات</span>
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="p-4 rounded-2xl bg-[#f7f9f7] border border-[#2e493b]/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#20352a]">معدل إنجاز متطلبات الفصل الدراسي</span>
            <span className="text-[#2e493b] font-mono text-sm">{avgProgress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#2e493b] to-[#427054] transition-all duration-500"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#2e493b]/15 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">الساعات المعتمدة</span>
            <Clock className="w-4 h-4 text-[#3a5d4a]" />
          </div>
          <p className="text-2xl font-bold font-cairo text-[#20352a]">{totalHours}</p>
          <p className="text-[10px] text-stone-500">ساعة مسجلة هذا الفصل</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#2e493b]/15 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">المقررات الدراسية</span>
            <BookOpen className="w-4 h-4 text-[#3a5d4a]" />
          </div>
          <p className="text-2xl font-bold font-cairo text-[#20352a]">{courses.length}</p>
          <p className="text-[10px] text-stone-500">مقررات نشطة ومسجلة</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#2e493b]/15 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">المحاضرات المستمعة</span>
            <Volume2 className="w-4 h-4 text-[#3a5d4a]" />
          </div>
          <p className="text-2xl font-bold font-cairo text-[#20352a]">{totalLectures}</p>
          <p className="text-[10px] text-stone-500">محاضرة مع تلخيصها</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#2e493b]/15 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold">الاختبارات المجتازة</span>
            <Award className="w-4 h-4 text-[#3a5d4a]" />
          </div>
          <p className="text-2xl font-bold font-cairo text-[#20352a]">{totalExams}</p>
          <p className="text-[10px] text-stone-500">بمتوسط درجات 94%</p>
        </div>
      </div>

      {/* Courses Progress Bars & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Course Progress Bars (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#3a5d4a]" />
              <h3 className="text-base font-bold text-[#20352a]">
                تفصيل التقدم حسب كل مقرر
              </h3>
            </div>
            <span className="text-xs text-stone-400">انقر للدخول للمقرر</span>
          </div>

          <div className="space-y-4">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => onOpenCourse(course.id)}
                  className="p-4 rounded-2xl border border-stone-200 hover:border-[#2e493b]/40 hover:bg-[#f7f9f7] transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-[#2e493b] px-2.5 py-0.5 rounded-lg">
                        {course.code}
                      </span>
                      <h4 className="text-sm font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                        {course.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#2e493b]">
                      {course.progress || 0}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2e493b]"
                      style={{ width: `${course.progress || 0}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>{course.instructor}</span>
                    <span>
                      {course.lecturesCount || 0} محاضرة · {course.examsCount || 0} اختبارات
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-stone-50/70 border border-dashed border-stone-200 text-center space-y-1.5">
                <BookOpen className="w-7 h-7 text-stone-300 mx-auto" />
                <p className="text-xs font-bold text-stone-600">لا توجد مقررات مضافة بعد</p>
                <p className="text-[11px] text-stone-400">
                  عند إضافة مقرراتك من قسم «المقررات الدراسية» سيظهر تفصيل التقدم لكل مقرر هنا.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Study Tasks & Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#3a5d4a]" />
              <h3 className="text-base font-bold text-[#20352a]">
                مهام الاستذكار والمتابعة
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              {completedTasksCount} / {tasks.length}
            </span>
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              placeholder="أضف مهمة استذكار جديدة..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 py-2 px-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#2e493b] text-white rounded-xl text-xs font-bold hover:bg-[#385947] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Task Items with Clear Delete Option */}
          <div className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    task.completed
                      ? 'bg-stone-50 border-stone-200 opacity-75'
                      : 'bg-[#fdfdfc] border-stone-200 hover:border-[#2e493b]/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded text-[#2e493b] focus:ring-0 cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold text-[#20352a] break-words ${
                          task.completed ? 'line-through text-stone-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {task.courseName} · {task.dueDate}
                      </p>
                    </div>
                  </div>

                  {/* Delete Task Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    title="حذف المهمة"
                    className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center rounded-2xl bg-stone-50/70 border border-dashed border-stone-200">
                <p className="text-xs text-stone-400">لا توجد مهام حالياً، أضيفي مهمة جديدة أعلاه.</p>
              </div>
            )}
          </div>

          {/* Academic Honors Badges */}
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <p className="text-xs font-bold text-[#20352a]">أوسمة الهمة العلمية</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900">
                <Flame className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <p className="text-[11px] font-bold">مواظبة 14 يوماً</p>
                <p className="text-[9px] text-amber-700">استمرار المدارسة</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900">
                <GraduationCap className="w-4 h-4 mx-auto text-emerald-700 mb-1" />
                <p className="text-[11px] font-bold">طالب متميز</p>
                <p className="text-[9px] text-emerald-700">إتقان المتون</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal: دليل وفهم لوحة التقدم والإنجاز */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#faf9f6] rounded-3xl border border-[#2e493b]/20 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-right">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#2e493b]/10 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#20352a] font-cairo">
                    دليل وفهم لوحة التقدم والإنجاز
                  </h3>
                  <p className="text-xs text-stone-500">
                    شرح مفصل لكيفية قراءة المؤشرات، أشرطة التقدم، ومتابعة المهام الدراسية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Part 1: قراءة مؤشرات الإنجاز */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#2e493b]">
                  <TrendingUp className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                    1. كيفية قراءة مؤشرات الإنجاز (البطاقات الأربع)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#20352a]">
                      <Clock className="w-3.5 h-3.5 text-[#2e493b]" />
                      <span>الساعات المعتمدة:</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      يمثل مجموع الساعات الدراسية للمقررات المسجلة في الفصل، مما يعكس عبئك الأكاديمي المعتمد.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#20352a]">
                      <BookOpen className="w-3.5 h-3.5 text-[#2e493b]" />
                      <span>المقررات الدراسية:</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      عدد المواد النشطة حالياً في حسابك، ويمكنك إضافة مقررات جديدة أو حذفها في أي وقت.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#20352a]">
                      <Volume2 className="w-3.5 h-3.5 text-[#2e493b]" />
                      <span>المحاضرات المستمعة:</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      عدد تسجيلات المحاضرات أو ملفات الفيديو/الصوت التي أرفقتها وقام النظام بتفريغها وتلخيصها.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#20352a]">
                      <Award className="w-3.5 h-3.5 text-[#2e493b]" />
                      <span>الاختبارات المجتازة:</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      عدد بنوك الأسئلة التي قمت بحلها واختبار فهمك فيها، مع استعراض متوسط درجاتك وتفوقك.
                    </p>
                  </div>
                </div>
              </div>

              {/* Part 2: فهم أشرطة التقدم */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#2e493b]">
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                    2. فهم أشرطة التقدم ونسب الإنجاز الفصلي
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10">
                    <p className="font-bold text-[#20352a] mb-1">شريط التقدم الفصلي العام (الأعلى):</p>
                    <p>
                      يحسب المعدل الإجمالي لإنجازك في كامل مقررات الفصل الدراسي. يرتفع هذا المؤشر تلقائياً كلما أرفقت مقررات وكتباً، وسجلت محاضرات، وأتممت حل بنوك الأسئلة.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f7f9f7] border border-[#2e493b]/10">
                    <p className="font-bold text-[#20352a] mb-1">أشرطة تقدم المقررات الفردية (الأيمن):</p>
                    <p>
                      يعرض نسبة إنجاز كل مقرر على حدة. عند النقر على أي مقرر، تنتقلين فوراً إلى صفحته لمتابعة الكتاب الدراسي، تسجيل المحاضرات، وتوليد الأسئلة.
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-center font-bold">
                      <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">0% - 35%: بداية الفصل</div>
                      <div className="p-1.5 rounded-lg bg-[#e8eee9] text-[#2e493b]">36% - 75%: منتصف الفصل</div>
                      <div className="p-1.5 rounded-lg bg-[#2e493b] text-white">76% - 100%: إتمام المنهج</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 3: تتبع المهام الدراسية */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-[#2e493b]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                    3. تتبع وإدارة المهام الدراسية (قائمة المهام اليومية)
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
                  <li>
                    <strong className="text-[#20352a]">إضافة مهمة جديدة:</strong> اكتبي عنوان المهمة (مثل: مراجعة شروط الصلاة، تلخيص المحاضرة الرابعة، حل الأسئلة) في الخانة المخصصة واضغطي زر <strong className="text-[#2e493b]">«إضافة»</strong>.
                  </li>
                  <li>
                    <strong className="text-[#20352a]">تحديد الإنجاز:</strong> عند الانتهاء من استذكار أي مهمة، انقري على مربع الاختيار لتظهر علامة (<span className="text-[#2e493b] font-bold">✓</span>) ويتم شطب المهمة وتحديث عدد المهام المنجزة فوراً.
                  </li>
                  <li>
                    <strong className="text-[#20352a]">حذف المهمة:</strong> يمكنك إزالة أي مهمة عند الرغبة بالضغط على زر <strong className="text-rose-600">«حذف»</strong> بجانبها.
                  </li>
                  <li>
                    <strong className="text-[#20352a]">أوسمة الهمة العلمية:</strong> تمنحك المنصة تحفيزاً دورياً (وسام المواظبة، وسام الطالب المتميز) لتشجيعكِ على استمرار المدارسة والمثابرة الأكاديمية.
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-[#2e493b] hover:bg-[#20352a] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>فهمت ذلك، شكراً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
