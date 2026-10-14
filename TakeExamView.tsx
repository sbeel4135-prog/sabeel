import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
} from 'lucide-react';

export const TakeExamView: React.FC = () => {
  const {
    exams,
    selectedExamId,
    setActiveView,
    submitExamAttempt,
    currentUser,
    showToast,
    setLastAttemptId,
  } = useApp();

  const exam = exams.find((e) => e.id === selectedExamId);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(() => (exam?.durationMinutes || 15) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 16));

  if (!exam) {
    return (
      <div className="p-12 text-center text-stone-500">
        <p>لم يتم العثور على الاختبار المحدد.</p>
        <button
          onClick={() => setActiveView('exams')}
          className="mt-4 px-4 py-2 bg-[#14532d] text-white rounded-lg text-xs"
        >
          العودة لقائمة الاختبارات
        </button>
      </div>
    );
  }

  // Timer effect
  useEffect(() => {
    if (secondsRemaining <= 0) {
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const currentQ = exam.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const timeSpent = exam.durationMinutes * 60 - secondsRemaining;

    // Calculate score
    let score = 0;
    exam.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        score += q.points;
      }
    });

    const percentage = Math.round((score / exam.totalMarks) * 100);
    const passed = score >= exam.passingMarks;

    const result = submitExamAttempt({
      examId: exam.id,
      examTitle: exam.title,
      courseTitle: exam.courseTitle,
      score,
      totalMarks: exam.totalMarks,
      percentage,
      passed,
      startedAt,
      completedAt,
      timeSpentSeconds: Math.max(timeSpent, 20),
      answers,
    });

    if (result) {
      setLastAttemptId(result.id);
      setActiveView('exam-result');
    } else {
      setActiveView('exams');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-right">
      {/* Top Floating Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
              secondsRemaining < 180
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-stone-100 text-[#14532d]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span dir="ltr">{formatTimer(secondsRemaining)}</span>
          </div>
          <span className="hidden sm:inline text-xs text-stone-500">الوقت المتبقي</span>
        </div>

        <div className="text-right">
          <span className="text-xs text-stone-400 block">{exam.courseTitle}</span>
          <h2 className="text-sm font-bold text-stone-900 truncate max-w-xs">{exam.title}</h2>
        </div>

        <button
          onClick={() => {
            if (confirm('هل ترغب في تسليم ورقة الإجابة ورصد الدرجة الآن؟')) {
              handleFinalSubmit();
            }
          }}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>تسليم الاختبار</span>
        </button>
      </div>

      {/* Progress & Question Selector Ribbon */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-600">
          <span className="font-semibold">
            تم الإجابة عن {answeredCount} من أصل {exam.questions.length} سؤال
          </span>
          <span className="text-stone-400">السؤال الحالي: {currentQuestionIndex + 1}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {exam.questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentQuestionIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-9 h-9 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#14532d] text-white shadow-sm ring-2 ring-emerald-600/30'
                    : isAnswered
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <span className="text-xs text-stone-500 font-mono">
              درجة السؤال: {currentQ.points} درجات
            </span>
            <div className="inline-block px-3 py-1 bg-stone-100 rounded-lg text-xs font-semibold text-stone-700">
              {currentQ.type === 'multiple_choice' ? 'اختيار من متعدد' : 'صح أو خطأ'}
            </div>
          </div>

          <h3 className="font-amiri text-xl md:text-2xl text-stone-900 leading-relaxed font-bold">
            {currentQuestionIndex + 1}. {currentQ.question}
          </h3>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = answers[currentQ.id] === optIdx;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-right ${
                    isSelected
                      ? 'border-[#14532d] bg-emerald-50/40 text-[#14532d] font-semibold'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ml-3 ${
                      isSelected
                        ? 'border-[#14532d] bg-[#14532d] text-white'
                        : 'border-stone-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <span className="text-sm leading-relaxed flex-1">{opt}</span>
                </div>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <span>إنهاء وتسليم الاختبار</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(exam.questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>السؤال التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
