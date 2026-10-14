import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export const ExamResultView: React.FC = () => {
  const {
    attempts,
    lastAttemptId,
    exams,
    selectedExamId,
    setActiveView,
    currentUser,
  } = useApp();

  const attempt = attempts.find((a) => a.id === lastAttemptId) || attempts[0];
  const exam = exams.find((e) => e.id === (attempt?.examId || selectedExamId));

  if (!attempt || !exam) {
    return (
      <div className="p-12 text-center text-stone-500">
        <p>لا توجد نتيجة لعرضها حاليًا.</p>
        <button
          onClick={() => setActiveView('exams')}
          className="mt-4 px-4 py-2 bg-[#14532d] text-white rounded-lg text-xs"
        >
          العودة للاختبارات
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-right">
      {/* Top Banner with Score */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs text-center space-y-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {attempt.passed ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>

        <div>
          <span className="text-xs text-stone-500">{attempt.courseTitle}</span>
          <h2 className="text-2xl font-extrabold text-stone-900 mt-0.5">{attempt.examTitle}</h2>
          <p
            className={`text-sm font-bold mt-1 ${
              attempt.passed ? 'text-[#14532d]' : 'text-rose-600'
            }`}
          >
            {attempt.passed
              ? 'مبارك، لقد اجتزت الاختبار بنجاح وتم رصد الدرجة في سجلك الأكاديمي!'
              : 'لم تحقق درجة النجاح المطلوبة، يمكنك مراجعة المادة وسؤال المساعد الذكي.'}
          </p>
        </div>

        {/* Score metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4 border-t border-stone-100 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block text-[11px]">الدرجة المحرزة</span>
            <span className="text-lg font-extrabold text-[#14532d] font-mono">
              {attempt.score} / {attempt.totalMarks}
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block text-[11px]">النسبة المئوية</span>
            <span className="text-lg font-extrabold text-stone-900 font-mono">
              {attempt.percentage}%
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block text-[11px]">الوقت المستغرق</span>
            <span className="text-lg font-extrabold text-stone-900 font-mono">
              {Math.floor(attempt.timeSpentSeconds / 60)} دقيقة
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block text-[11px]">حالة المحاولة</span>
            <span
              className={`text-sm font-bold mt-1 block ${
                attempt.passed ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {attempt.passed ? 'ناجح' : 'راسب'}
            </span>
          </div>
        </div>

        {/* Timestamps info */}
        <p className="text-[11px] text-stone-400">
          وقت البدء: {attempt.startedAt} · وقت التسليم النهائي: {attempt.completedAt}
        </p>
      </div>

      {/* Action shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveView('exams')}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لمركز الاختبارات</span>
        </button>

        <button
          onClick={() => setActiveView('ai-assistant')}
          className="flex items-center gap-2 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>استفسر من المساعد الذكي عن المسائل المشكلة</span>
        </button>
      </div>

      {/* Question by Question Detailed Review */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-stone-900">
          مراجعة الأسئلة وتفصيل الإجابات الصحيحة والتعليل:
        </h3>

        <div className="space-y-4">
          {exam.questions.map((q, idx) => {
            const studentChoice = attempt.answers[q.id];
            const isCorrect = studentChoice === q.correctIndex;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl border-2 bg-white transition-all space-y-4 ${
                  isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        إجابة صحيحة ({q.points}/{q.points})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                        <XCircle className="w-4 h-4" />
                        إجابة غير صحيحة (0/{q.points})
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-stone-400 font-mono">سؤال {idx + 1}</span>
                </div>

                <h4 className="font-amiri text-lg text-stone-900 font-bold leading-relaxed">
                  {q.question}
                </h4>

                {/* Options display */}
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelectedByStudent = studentChoice === optIdx;
                    const isOfficialCorrect = q.correctIndex === optIdx;

                    let badgeStyle = 'border-stone-200 bg-stone-50/50 text-stone-700';
                    if (isOfficialCorrect) {
                      badgeStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold';
                    } else if (isSelectedByStudent && !isOfficialCorrect) {
                      badgeStyle = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${badgeStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          {isOfficialCorrect && (
                            <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded font-sans">
                              الصواب المعتمد
                            </span>
                          )}
                          {isSelectedByStudent && !isOfficialCorrect && (
                            <span className="text-[10px] bg-rose-700 text-white px-2 py-0.5 rounded font-sans">
                              إجابتك
                            </span>
                          )}
                        </div>
                        <span className="text-right leading-relaxed flex-1">{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Scholarly Explanation */}
                {q.explanation && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-950 block">
                      التعليل الفقهي والأصولي المستند:
                    </span>
                    <p className="text-emerald-900 leading-relaxed font-amiri text-sm sm:text-base">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
