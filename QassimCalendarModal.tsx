import React, { useState } from 'react';
import { X, Calendar, ZoomIn, ZoomOut, CheckCircle2, Clock } from 'lucide-react';

interface QassimCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AcademicEvent {
  id: string;
  hijriDate: string;
  gregorianDate: string;
  isoDate: string; // YYYY-MM-DD for automatic completion check
  title: string;
  weekLabel?: string;
}

const SEMESTER_1_EVENTS: AcademicEvent[] = [
  {
    id: 's1_defer',
    weekLabel: 'قبل بداية الدراسة',
    hijriDate: '1448/03/03 هـ - 1448/03/09 هـ',
    gregorianDate: '2026/08/16 م - 2026/08/22 م',
    isoDate: '2026-08-22',
    title: 'فترة تأجيل الفصل الدراسي الأول (481) أو السنة الدراسية للعام الجامعي',
  },
  {
    id: 's1_w1',
    weekLabel: 'الأسبوع الأول',
    hijriDate: 'الأحد 1448/03/10 هـ',
    gregorianDate: '2026/08/23 م',
    isoDate: '2026-08-23',
    title: 'بداية الدراسة للفصل الدراسي الأول (481) والانتظام الأكاديمي',
  },
  {
    id: 's1_add_drop',
    weekLabel: 'الأسبوع الأول - الثاني',
    hijriDate: '1448/03/10 هـ - 1448/03/17 هـ',
    gregorianDate: '2026/08/23 م - 2026/08/30 م',
    isoDate: '2026-08-30',
    title: 'فترة تعديل الجداول الدراسية وتقديم طلبات الحذف والإضافة عبر بوابة الطالب',
  },
  {
    id: 's1_apology_start',
    weekLabel: 'الأسبوع الخامس',
    hijriDate: 'الأحد 1448/04/09 هـ',
    gregorianDate: '2026/09/20 م',
    isoDate: '2026-09-20',
    title: 'بداية فترة الاعتذار عن الفصل الدراسي الأول (481) بدون تقدير',
  },
  {
    id: 's1_national_day',
    weekLabel: 'الأسبوع الخامس',
    hijriDate: 'الأربعاء - الخميس 12-1448/04/13 هـ',
    gregorianDate: '23 - 2026/09/24 م',
    isoDate: '2026-09-24',
    title: 'إجازة اليوم الوطني للمملكة العربية السعودية',
  },
  {
    id: 's1_course_withdraw',
    weekLabel: 'الأسبوع السادس',
    hijriDate: 'الأحد 1448/04/16 هـ',
    gregorianDate: '2026/09/27 م',
    isoDate: '2026-09-27',
    title: 'بداية فترة الانسحاب من مقرر دراسي بتقدير (ع) للنظام الفصلي',
  },
  {
    id: 's1_w8_current',
    weekLabel: 'الأسبوع الثامن (الحالي)',
    hijriDate: 'الأحد 1448/04/30 هـ',
    gregorianDate: '2026/10/11 م',
    isoDate: '2026-10-18',
    title: 'الأسبوع الدراسي الثامن — انتظام المحاضرات والاختبارات الفصلية الأولى',
  },
  {
    id: 's1_autumn_break',
    weekLabel: 'نهاية الأسبوع الثالث عشر',
    hijriDate: 'الخميس 1448/06/09 هـ',
    gregorianDate: '2026/11/19 م',
    isoDate: '2026-11-19',
    title: 'بداية إجازة الخريف (بنهاية دوام يوم الخميس)',
  },
  {
    id: 's1_course_withdraw_end',
    weekLabel: 'إجازة الخريف',
    hijriDate: 'السبت 1448/06/11 هـ',
    gregorianDate: '2026/11/21 م',
    isoDate: '2026-11-21',
    title: 'آخر موعد للانسحاب من مقرر دراسي للنظام الفصلي',
  },
  {
    id: 's1_autumn_return',
    weekLabel: 'الأسبوع الرابع عشر',
    hijriDate: 'الأحد 1448/06/19 هـ',
    gregorianDate: '2026/11/29 م',
    isoDate: '2026-11-29',
    title: 'استئناف الدراسة بعد إجازة الخريف',
  },
  {
    id: 's1_apology_end',
    weekLabel: 'الأسبوع السادس عشر',
    hijriDate: 'الأحد 1448/07/04 هـ',
    gregorianDate: '2026/12/13 م',
    isoDate: '2026-12-13',
    title: 'نهاية فترة الاعتذار عن الفصل الدراسي الأول (481) والانسحاب من الجامعة',
  },
  {
    id: 's1_finals',
    weekLabel: 'الاختبارات النهائية',
    hijriDate: 'الأحد 1448/07/18 هـ - الخميس 1448/07/29 هـ',
    gregorianDate: '2026/12/27 م - 2027/01/07 م',
    isoDate: '2027-01-07',
    title: 'فترة الاختبارات النهائية للفصل الدراسي الأول (481)',
  },
  {
    id: 's1_end',
    weekLabel: 'نهاية الفصل الأول',
    hijriDate: 'الخميس 1448/07/29 هـ',
    gregorianDate: '2027/01/07 م',
    isoDate: '2027-01-07',
    title: 'بداية إجازة منتصف العام الدراسي (بنهاية دوام يوم الخميس)',
  },
  {
    id: 's1_grades',
    weekLabel: 'رصد الدرجات والمعدل',
    hijriDate: 'السبت 1448/08/01 هـ - الاثنين 1448/08/03 هـ',
    gregorianDate: '2027/01/09 م - 2027/01/11 م',
    isoDate: '2027-01-11',
    title: 'آخر موعد لرصد الدرجات وإعلان حساب المعدل التراكمي للفصل (481)',
  },
];

const SEMESTER_2_EVENTS: AcademicEvent[] = [
  {
    id: 's2_w1',
    weekLabel: 'الأسبوع الأول',
    hijriDate: 'الأحد 1448/08/09 هـ',
    gregorianDate: '2027/01/17 م',
    isoDate: '2027-01-17',
    title: 'بداية الدراسة للفصل الدراسي الثاني (482)',
  },
  {
    id: 's2_founding_day',
    weekLabel: 'الأسبوع السادس',
    hijriDate: 'الاثنين 1448/09/15 هـ',
    gregorianDate: '2027/02/22 م',
    isoDate: '2027-02-22',
    title: 'إجازة يوم التأسيس للمملكة العربية السعودية',
  },
  {
    id: 's2_eid_fitr',
    weekLabel: 'إجازة عيد الفطر',
    hijriDate: 'الخميس 1448/09/18 هـ',
    gregorianDate: '2027/02/25 م',
    isoDate: '2027-02-25',
    title: 'بداية إجازة عيد الفطر المبارك (بنهاية دوام يوم الخميس)',
  },
  {
    id: 's2_eid_fitr_return',
    weekLabel: 'استئناف الدراسة',
    hijriDate: 'الأحد 1448/10/06 هـ',
    gregorianDate: '2027/03/14 م',
    isoDate: '2027-03-14',
    title: 'استئناف الدراسة بعد إجازة عيد الفطر المبارك',
  },
  {
    id: 's2_eid_adha',
    weekLabel: 'إجازة عيد الأضحى',
    hijriDate: 'الخميس 1448/11/29 هـ',
    gregorianDate: '2027/05/06 م',
    isoDate: '2027-05-06',
    title: 'بداية إجازة عيد الأضحى المبارك (بنهاية دوام يوم الخميس)',
  },
  {
    id: 's2_eid_adha_return',
    weekLabel: 'استئناف الدراسة',
    hijriDate: 'الأحد 1448/12/17 هـ',
    gregorianDate: '2027/05/23 م',
    isoDate: '2027-05-23',
    title: 'استئناف الدراسة بعد إجازة عيد الأضحى المبارك',
  },
  {
    id: 's2_finals',
    weekLabel: 'الاختبارات النهائية',
    hijriDate: 'الأحد 1448/12/24 هـ - الخميس 1449/01/12 هـ',
    gregorianDate: '2027/05/30 م - 2027/06/17 م',
    isoDate: '2027-06-17',
    title: 'فترة الاختبارات النهائية للفصل الدراسي الثاني (482)',
  },
  {
    id: 's2_end',
    weekLabel: 'نهاية العام الجامعي',
    hijriDate: 'الخميس 1449/01/12 هـ',
    gregorianDate: '2027/06/17 م',
    isoDate: '2027-06-17',
    title: 'بداية إجازة نهاية العام الجامعي 1448هـ',
  },
];

const ARABIC_ORDINALS = [
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
  'الحادي عشر',
  'الثاني عشر',
  'الثالث عشر',
  'الرابع عشر',
  'الخامس عشر',
  'السادس عشر',
];

// Official Semester 1 (481) 16 teaching weeks schedule at Qassim University
// Weeks 1–13: Aug 23, 2026 to Nov 19, 2026
// Autumn Break (إجازة الخريف): Nov 20, 2026 to Nov 28, 2026
// Weeks 14–16: Nov 29, 2026 to Dec 17, 2026
const SEMESTER_WEEKS = [
  { weekNum: 1, hijriStart: '1448/03/10 هـ', startIso: '2026-08-23', endIso: '2026-08-29' },
  { weekNum: 2, hijriStart: '1448/03/17 هـ', startIso: '2026-08-30', endIso: '2026-09-05' },
  { weekNum: 3, hijriStart: '1448/03/24 هـ', startIso: '2026-09-06', endIso: '2026-09-12' },
  { weekNum: 4, hijriStart: '1448/04/02 هـ', startIso: '2026-09-13', endIso: '2026-09-19' },
  { weekNum: 5, hijriStart: '1448/04/09 هـ', startIso: '2026-09-20', endIso: '2026-09-26' },
  { weekNum: 6, hijriStart: '1448/04/16 هـ', startIso: '2026-09-27', endIso: '2026-10-03' },
  { weekNum: 7, hijriStart: '1448/04/23 هـ', startIso: '2026-10-04', endIso: '2026-10-10' },
  { weekNum: 8, hijriStart: '1448/04/30 هـ', startIso: '2026-10-11', endIso: '2026-10-17' },
  { weekNum: 9, hijriStart: '1448/05/07 هـ', startIso: '2026-10-18', endIso: '2026-10-24' },
  { weekNum: 10, hijriStart: '1448/05/14 هـ', startIso: '2026-10-25', endIso: '2026-10-31' },
  { weekNum: 11, hijriStart: '1448/05/21 هـ', startIso: '2026-11-01', endIso: '2026-11-07' },
  { weekNum: 12, hijriStart: '1448/05/28 هـ', startIso: '2026-11-08', endIso: '2026-11-14' },
  { weekNum: 13, hijriStart: '1448/06/05 هـ', startIso: '2026-11-15', endIso: '2026-11-21' },
  // 1-week Autumn break (إجازة الخريف): 1448/06/12 هـ (2026-11-22 to 2026-11-28)
  { weekNum: 14, hijriStart: '1448/06/19 هـ', startIso: '2026-11-29', endIso: '2026-12-05' },
  { weekNum: 15, hijriStart: '1448/06/26 هـ', startIso: '2026-12-06', endIso: '2026-12-12' },
  { weekNum: 16, hijriStart: '1448/07/04 هـ', startIso: '2026-12-13', endIso: '2026-12-19' },
].map((w, idx) => ({
  ...w,
  label: `الأسبوع ${ARABIC_ORDINALS[idx] || w.weekNum}`,
  shortLabel: `الأسبوع ${w.weekNum}`,
}));

export const QassimCalendarModal: React.FC<QassimCalendarModalProps> = ({ isOpen, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen) return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const isDatePassed = (isoDate: string) => todayIso >= isoDate;

  const completedSem1Count = SEMESTER_1_EVENTS.filter((ev) => isDatePassed(ev.isoDate)).length;
  const completedWeeksCount = SEMESTER_WEEKS.filter((w) => todayIso > w.endIso).length;
  const currentActiveWeek = SEMESTER_WEEKS.find(
    (w) => todayIso >= w.startIso && todayIso <= w.endIso
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-fade-in text-right"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#fdfdfc] rounded-3xl shadow-2xl border border-[#2e493b]/15 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#2e493b] text-white p-5 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-base sm:text-lg font-bold">التقويم الأكاديمي — جامعة القصيم</h3>
              <p className="text-xs text-emerald-100/80">
                تظليل تلقائي باللون الأخضر الهادئ للأسابيع والفترات الدراسية المنتهية
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-100" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#fbfbfa] space-y-5">
          {/* Calendar Presentation Card */}
          <div
            className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs transition-transform duration-200 space-y-6"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            <div className="text-center pb-4 border-b border-stone-100 space-y-1.5">
              <span className="text-xs font-semibold text-[#385947] tracking-wide">
                المملكة العربية السعودية · جامعة القصيم
              </span>
              <h4 className="text-xl font-extrabold text-[#23382c]">التقويم الأكاديمي المعتمد</h4>
              <p className="text-xs text-stone-500">
                الأسابيع والفترات المظللة باللون الأخضر الهادئ تشير إلى المراحل التي انقضت من الفصل الدراسي
              </p>

              {/* Legend & Current Position Summary */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e4f0e8] text-[#1e3a2b] border border-[#2e493b]/20 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>فترة / أسبوع منتهٍ ({completedWeeksCount} أسابيع منقضية)</span>
                </span>
                {currentActiveWeek && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>نحن الآن في: {currentActiveWeek.label}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Academic Weeks Strip (16 Weeks) with Green Shading for Completed Weeks */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#20352a]">
                <span>مسار الأسابيع الدراسية للفصل الحالي (16 أسبوعاً):</span>
                <span className="text-[11px] text-[#2e493b]">
                  انقضى {completedWeeksCount} من 16 أسبوعاً
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEMESTER_WEEKS.map((w) => {
                  const isCompleted = todayIso > w.endIso;
                  const isCurrent = todayIso >= w.startIso && todayIso <= w.endIso;

                  return (
                    <div
                      key={w.weekNum}
                      className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                        isCompleted
                          ? 'bg-[#e3efe7] border-[#2e493b]/25 text-[#1b3627]'
                          : isCurrent
                          ? 'bg-emerald-50/70 border-[#2e493b] ring-1 ring-[#2e493b]/40 text-[#20352a]'
                          : 'bg-stone-50/60 border-stone-200/80 text-stone-500'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">{w.label}</p>
                        <p className="text-[10px] opacity-80 font-mono">
                          {w.hijriStart} · {w.startIso.slice(5)}
                        </p>
                      </div>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2e493b]/15 text-[#1b3627] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>منتهٍ</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2e493b] text-white">
                          الحالي
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">قادم</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Semester 1 Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#2e493b] text-white px-4 py-2.5 rounded-xl text-xs font-bold">
                <span>الفصل الدراسي الأول (481) — المواعيد الأكاديمية المعتمدة</span>
                <span className="font-mono text-emerald-100">
                  انقضت {completedSem1Count} من {SEMESTER_1_EVENTS.length} فترات
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {SEMESTER_1_EVENTS.map((ev) => {
                  const passed = isDatePassed(ev.isoDate);
                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        passed
                          ? 'bg-[#e3efe7] border-[#2e493b]/25 text-[#1b3627]'
                          : 'bg-white border-stone-200/80 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm">{ev.title}</span>
                            {ev.weekLabel && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  passed
                                    ? 'bg-[#2e493b]/15 text-[#1b3627]'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {ev.weekLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className="font-mono text-[#2e493b] font-bold text-[11px]">
                          {ev.hijriDate} ({ev.gregorianDate})
                        </span>
                        {passed ? (
                          <span className="text-[10px] font-bold bg-[#2e493b] text-white px-2.5 py-0.5 rounded-full">
                            منتهية
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-stone-100 text-stone-500 px-2.5 py-0.5 rounded-full">
                            قادمة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Semester 2 Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#f4f7f5] px-4 py-2.5 rounded-xl text-xs font-bold text-[#274032] border border-[#2e493b]/15">
                <span>الفصل الدراسي الثاني (482) — المواعيد الأكاديمية المعتمدة</span>
                <span className="font-mono text-stone-500">1448هـ / 2027م</span>
              </div>
              <div className="space-y-2 text-xs">
                {SEMESTER_2_EVENTS.map((ev) => {
                  const passed = isDatePassed(ev.isoDate);
                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        passed
                          ? 'bg-[#e3efe7] border-[#2e493b]/25 text-[#1b3627]'
                          : 'bg-white border-stone-200/80 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{ev.title}</span>
                          {ev.weekLabel && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold">
                              {ev.weekLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className="font-mono text-[#2e493b] font-bold text-[11px]">
                          {ev.hijriDate} ({ev.gregorianDate})
                        </span>
                        {passed ? (
                          <span className="text-[10px] font-bold bg-[#2e493b] text-white px-2.5 py-0.5 rounded-full">
                            منتهية
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-stone-100 text-stone-500 px-2.5 py-0.5 rounded-full">
                            قادمة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.2, z + 0.1))}
              className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 rounded-lg text-xs cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.1))}
              className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 rounded-lg text-xs cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#2e493b] hover:bg-[#385947] rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
