import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Course } from '../../types';

interface CoursesViewProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onOpenAddModal: () => void;
  onEditCourseTitle: (courseId: string, newTitle: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onBack: () => void;
  isShariaMajor?: boolean;
  onOpenShariaDrive?: () => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  onSelectCourse,
  onOpenAddModal,
  onEditCourseTitle,
  onDeleteCourse,
  onBack,
  isShariaMajor = true,
  onOpenShariaDrive,
}) => {
  const [search, setSearch] = useState('');

  // State for editing course name
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');

  // State for delete confirmation modal
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const filteredCourses = courses.filter((c) => {
    const matchSearch =
      c.title.includes(search) ||
      (c.instructor && c.instructor.includes(search));
    return matchSearch;
  });

  const startEditingCourse = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourseId(course.id);
    setEditTitleValue(course.title);
  };

  const saveEditedTitle = (courseId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitleValue.trim()) {
      onEditCourseTitle(courseId, editTitleValue.trim());
    }
    setEditingCourseId(null);
    setEditTitleValue('');
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourseId(null);
    setEditTitleValue('');
  };

  const confirmDelete = () => {
    if (courseToDelete) {
      onDeleteCourse(courseToDelete.id);
      setCourseToDelete(null);
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
          <span>العودة للرئيسية</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مقرر دراسي جديد</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#20352a] font-cairo">
              {isShariaMajor ? 'المقررات الدراسية والمتون' : 'المقررات الدراسية'}
            </h1>
            <p className="text-xs text-stone-500">
              كتاب PDF · تلخيص صوتي · أسئلة
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Sharia Google Drive Folder Banner (Shown only for Sharia major) */}
        {isShariaMajor && onOpenShariaDrive && (
          <div
            onClick={onOpenShariaDrive}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenShariaDrive();
            }}
            className="p-4 bg-[#f4f7f4] hover:bg-[#ebf1ec] rounded-2xl border border-[#2e493b]/20 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#20352a]">
                  حقيبة مقررات الشريعة (رابط Google Drive)
                </span>
                <span className="text-[10px] font-bold text-[#2e493b] bg-white px-2 py-0.5 rounded-full border border-[#2e493b]/20 flex items-center gap-1">
                  <span>Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-stone-600">
                الوصول المباشر لجميع المتون، المذكرات، والمقررات الدراسية الخاصة بكلية الشريعة.
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-[#2e493b] text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1">
              <span>فتح مجلد الشريعة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-stone-100">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث عن مقرر أو اسم الدكتور..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pr-10 pl-4 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
          </div>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => {
          const isEditing = editingCourseId === course.id;

          return (
            <div
              key={course.id}
              onClick={() => {
                if (!isEditing) onSelectCourse(course);
              }}
              className="group p-5 bg-white hover:bg-[#f7f9f7] rounded-3xl border border-[#2e493b]/15 hover:border-[#2e493b]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Top Row: Optional Hours + Edit & Delete Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {course.creditHours && course.creditHours > 0 ? (
                      <span className="text-[11px] font-bold text-[#2e493b] bg-[#e8eee9] px-2.5 py-0.5 rounded-lg">
                        {course.creditHours} ساعات
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#2e493b] bg-[#f0f4f1] px-2.5 py-0.5 rounded-lg">
                        مقرر دراسي
                      </span>
                    )}
                  </div>

                  {/* Edit Course Name & Trash Delete Buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => startEditingCourse(course, e)}
                      title="تعديل اسم المقرر"
                      className="px-2 py-1.5 rounded-xl bg-stone-100 hover:bg-[#e8eee9] text-stone-600 hover:text-[#2e493b] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الاسم</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(course);
                      }}
                      title="حذف المقرر بالكامل"
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Course Title or Inline Edit Input */}
                {isEditing ? (
                  <form
                    onSubmit={(e) => saveEditedTitle(course.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-2 p-3 rounded-2xl bg-[#f7f9f7] border border-[#2e493b]/30"
                  >
                    <label className="block text-[11px] font-bold text-[#2e493b]">
                      تعديل اسم المقرر:
                    </label>
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      autoFocus
                      className="w-full py-2 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] font-bold"
                      placeholder="اكتبي اسم المقرر الجديد..."
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>إلغاء</span>
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-[#2e493b] hover:bg-[#385947] text-white text-[11px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>حفظ الاسم</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h3 className="text-base font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                      {course.title}
                    </h3>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-semibold">
                    {course.instructor ? course.instructor : 'لم يُحدد اسم الدكتور'}
                  </span>
                  <span className="text-emerald-700 font-bold">{course.progress || 0}% منجز</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2e493b]"
                    style={{ width: `${course.progress || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-[#2e493b] font-bold">
                  <div className="flex items-center gap-1.5 text-stone-400 font-normal">
                    <span>كتاب PDF · تلخيص صوتي · أسئلة</span>
                  </div>
                  <div className="flex items-center gap-0.5 group-hover:-translate-x-1 transition-transform">
                    <span>دخول المقرر</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-stone-200 p-8 space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-bold text-[#20352a]">
            {courses.length === 0
              ? 'لا توجد مقررات دراسية مسجلة حالياً'
              : 'لم يتم العثور على مقررات مطابقة للبحث'}
          </p>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {courses.length === 0
              ? 'ابدئي بإضافة مقرراتكِ الدراسية لهذا الفصل لتتمكني من رفع الكتب وتسجيل المحاضرات وتلخيصها.'
              : 'جربي البحث بكلمة أخرى أو أضيفي مقرراً جديداً.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مقرر دراسي جديد</span>
          </button>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in text-right"
          onClick={() => setCourseToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">تأكيد حذف المقرر الدراسي</h3>
                <p className="text-xs text-stone-500">هل أنتِ متأكدة من حذف هذا المقرر بالكامل؟</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70 text-xs text-rose-950 leading-relaxed">
              سيتم حذف مقرر <strong className="font-bold">«{courseToDelete.title}»</strong> وكافة التسجيلات والبيانات المرتبطة به نهائياً من قائمة مقرراتك.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف المقرر بالكامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
