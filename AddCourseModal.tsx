import React, { useState } from 'react';
import { X, BookOpen, Plus, GraduationCap } from 'lucide-react';
import { Course } from '../types';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (course: Course) => void;
  isShariaMajor?: boolean;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onAddCourse,
  isShariaMajor = true,
}) => {
  const [title, setTitle] = useState('');
  const [creditHours, setCreditHours] = useState<string>('');
  const [instructor, setInstructor] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedHours = creditHours.trim() ? Number(creditHours) : 0;

    const newCourse: Course = {
      id: `crs_${Date.now()}`,
      code: '',
      title: title.trim(),
      instructor: instructor.trim(),
      department: '',
      creditHours: parsedHours > 0 ? parsedHours : 0,
      description: '',
      color: '#15803d',
      progress: 0,
      semester: 'الفصل الدراسي الحالي',
      booksCount: 0,
      lecturesCount: 0,
      examsCount: 0,
      tags: isShariaMajor ? ['شريعة'] : ['عام'],
    };

    onAddCourse(newCourse);
    onClose();
    setTitle('');
    setCreditHours('');
    setInstructor('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs text-right animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#20352a]">
              إضافة مقرر دراسي جديد
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1.5">
              اسم المقرر الدراسي <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: القواعد الفقهية والأصولية"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1.5">
                ساعات المقرر <span className="text-stone-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="number"
                min={1}
                max={12}
                placeholder="مثال: 3"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1.5">
                اسم الدكتور <span className="text-stone-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: د. عبد العزيز الفهد"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a]"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة المقرر الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
