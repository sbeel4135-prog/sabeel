import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck2,
  Calendar,
  Search,
  Plus,
  RotateCcw,
} from 'lucide-react';

export const ExamsView: React.FC = () => {
  const {
    exams,
    attempts,
    currentUser,
    setActiveView,
    setSelectedExamId,
    setLastAttemptId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [filterCourse, setFilterCourse] = useState('all');

  const myAttempts = attempts.filter((a) => a.studentId === currentUser?.id);

  const availableExams = exams.filter((e) => {
    // If student has already completed it, it belongs in completed tab
    const hasAttempt = myAttempts.some((a) => a.examId === e.id);
    return !hasAttempt && e.status !== 'closed';
  });

  const completedExams = exams.filter((e) => {
    return myAttempts.some((a) => a.examId === e.id);
  });

  const handleStartExam = (examId: string) => {
    setSelectedExamId(examId);
    setActiveView('take-exam');
  };

  const handleViewResult = (examId: string) => {
    const attempt = myAttempts.find((a) => a.examId === examId);
    if (attempt) {
      setLastAttemptId(attempt.id);
      setSelectedExamId(examId);
      setActiveView('exam-result');
    }
  };

  return (
    <div className="space-y-8 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">مركز الاختبارات الإلكترونية</h1>
          <p className="text-xs text-stone-500 mt-1">
            اختبارات دورية وفصلية مع تصحيح تلقائي وعرض الإجابات النموذجية والتعليل الشرعي
          </p>
        </div>

        {currentUser?.role === 'supervisor' && (
          <button
            onClick={() => setActiveView('supervisor')}
            className="flex items-center gap-2 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إدارة وإنشاء اختبارات</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'available'
              ? 'bg-[#14532d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          الاختبارات المتاحة للتقديم ({availableExams.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-[#14532d] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          الاختبارات المنجزة وسجل الدرجات ({completedExams.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'available' ? (
        <div className="space-y-4">
          {availableExams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-stone-800">أحسنت! لا توجد اختبارات معلقة حاليًا</h3>
              <p className="text-xs text-stone-500">لقد أكملت جميع الاختبارات المتاحة لهذا الأسبوع بنجاح.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableExams.map((exm) => (
                <div
                  key={exm.id}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-emerald-600/60 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-mono text-[#14532d] font-semibold">{exm.courseTitle}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-mono">{exm.durationMinutes} دقيقة</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900">{exm.title}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{exm.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-stone-100">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <div>
                        <span className="text-[10px] text-stone-400 block">الأسئلة</span>
                        <span className="font-bold text-stone-800 font-mono">{exm.questionsCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">الدرجة الكلية</span>
                        <span className="font-bold text-stone-800 font-mono">{exm.totalMarks}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">درجة النجاح</span>
                        <span className="font-bold text-[#14532d] font-mono">{exm.passingMarks}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-stone-400">متاح حتى: {exm.availableUntil}</span>
                      <button
                        onClick={() => handleStartExam(exm.id)}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#14532d] hover:bg-[#166534] rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>بدء الاختبار</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Completed Exams Tab */
        <div className="space-y-4">
          {completedExams.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
              لم تسجل أي محاولة اختبار حتى الآن.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedExams.map((exm) => {
                const attempt = myAttempts.find((a) => a.examId === exm.id);
                if (!attempt) return null;

                return (
                  <div
                    key={exm.id}
                    className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-500">{exm.courseTitle}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            attempt.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {attempt.passed ? 'تم الاجتياز بنجاح' : 'لم يجتز'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-stone-900">{exm.title}</h3>
                      <p className="text-xs text-stone-500">تم التسليم: {attempt.completedAt}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                        <span className="text-xs text-stone-600">الدرجة المحرزة:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-[#14532d]">
                            {attempt.score} / {attempt.totalMarks}
                          </span>
                          <span className="text-xs text-stone-500">({attempt.percentage}%)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-400">
                          الوقت المستغرق: {Math.floor(attempt.timeSpentSeconds / 60)} دقيقة
                        </span>
                        <button
                          onClick={() => handleViewResult(exm.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#14532d] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>عرض الإجابات النموذجية</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
