import React from 'react';
import {
  X,
  BookOpen,
  FileText,
  Mic,
  HelpCircle,
  BookMarked,
  Calendar,
  TrendingUp,
  Bot,
  Sprout,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Edit3,
  Trash2,
  LogIn,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
            <div>
              <h3 className="text-base sm:text-lg font-bold">دليل وطريقة استخدام منصة «سَبيل»</h3>
              <p className="text-xs text-emerald-100/80">
                شرح تفصيلي لكافة مميزات البوابة الأكاديمية وأدوات طالب العلم
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-emerald-100" />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-[#faf9f6]">
          <div className="p-4 rounded-2xl bg-[#e8eee9]/60 border border-[#2e493b]/15 text-xs sm:text-sm text-[#20352a] leading-relaxed">
            أهلاً بكِ في <strong className="font-bold text-[#2e493b]">سَبيل</strong>؛ بوابتكِ الأكاديمية المتكاملة لمدارسة العلوم الشرعية وإدارة فصلكِ الدراسي بيسر وإتقان. إليكِ شرحاً تفصيلياً لكيفية الاستفادة من جميع أقسام ومميزات المنصة:
          </div>

          {/* Feature 1: طريقة تسجيل الدخول واختيار التخصص */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                1. طريقة تسجيل الدخول واختيار المسار الجامعي
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                اضغطي على زر <strong className="text-[#2e493b]">«تسجيل الدخول / حساب جديد»</strong> في الشريط العلوي أو في الصفحة الرئيسية.
              </li>
              <li>
                أدخلي <strong className="text-[#20352a]">اسم المستخدم أو البريد الإلكتروني</strong> وكلمة المرور، ثم حددي تخصصكِ الجامعي قبل الدخول:
                <span className="block pr-4 pt-1 font-semibold text-[#2e493b]">
                  • خيار «شريعة» (يشمل الأنظمة والقانون): يفعّل المساعد الشرعي المؤصل، وحقيبة Google Drive الشرعية، والباحث في الروض المربع وروضة الناظر.
                </span>
                <span className="block pr-4 pt-0.5 font-semibold text-[#20352a]">
                  • خيار «تخصص آخر»: يفعّل المساعد الأكاديمي العام لمختلف التخصصات الجامعية.
                </span>
              </li>
              <li>
                يتم حفظ جميع مقرراتكِ، جدولكِ الدراسي، تلخيصاتكِ، ومهامكِ بشكل مستقل ومرتبط بحسابكِ، ويمكنكِ تبديل المسار في أي وقت من الشريط العلوي.
              </li>
            </ul>
          </div>

          {/* Feature 2: إضافة وإدارة المقررات الدراسية */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                2. إضافة وإدارة المقررات الدراسية يدوياً
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                من البطاقة الرئيسية <strong className="text-[#20352a]">«المقررات الدراسية»</strong>، اضغطي على زر <strong className="text-[#2e493b]">«إضافة مقرر»</strong> واكتبي <strong className="text-[#20352a]">اسم المقرر فقط</strong> (مع إمكانية إضافة الساعات واسم الدكتور اختيارياً).
              </li>
              <li>
                يتوفر في بطاقة كل مقرر زر <span className="inline-flex items-center gap-0.5 font-bold text-[#2e493b]"><Edit3 className="w-3 h-3" /> تعديل الاسم</span> لتحديث اسم المقرر، وزر <span className="inline-flex items-center gap-0.5 font-bold text-rose-600"><Trash2 className="w-3 h-3" /> الحذف</span> لتجديد مقرراتكِ في كل فصل دراسي.
              </li>
            </ul>
          </div>

          {/* Feature 3: إرفاق الكتب وتسجيل/إرفاق المحاضرات (فيديو أو صوت) وتلخيصها */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                3. الكتاب الدراسي وتسجيل أو إرفاق المحاضرات (فيديو أو صوت)
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                <strong className="text-[#20352a]">1. الكتاب الدراسي (PDF):</strong> عند إرفاق ملف الكتاب يظهر لكِ قارئ الـ PDF مع تلخيص منهجي شامل للكتاب وإمكانية تحميل الملخص كملف PDF أكاديمي.
              </li>
              <li>
                <strong className="text-[#20352a]">2. المحاضرات (تسجيل مباشر أو رفع فيديو/صوت):</strong> يمكنكِ تسجيل المحاضرة مباشرة عبر الميكروفون، أو إرفاق <strong className="text-[#2e493b]">مقطع فيديو (MP4, MOV, WebM) أو ملف صوتي (MP3, M4A, WAV) أو ملف PDF</strong>.
              </li>
              <li>
                يقوم النظام بتفريغ كلام المحاضر حرفياً وتلخيصه تلقائياً في 3 أقسام: <strong className="text-[#2e493b]">(1) أبرز المحاور · (2) المسائل العلمية والفقهية · (3) الفوائد والضوابط المستنبطة</strong>، مع زر لتحميل التلخيص كملف PDF أكاديمي منسق.
              </li>
            </ul>
          </div>

          {/* Feature 4: بنك الأسئلة المتنوعة عند الطلب */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                4. بنك الأسئلة المتنوعة (يظهر عند الطلب فقط)
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                من التبويب الثالث داخل المقرر <strong className="text-[#20352a]">«3. بنك الأسئلة»</strong>، لا تظهر الأسئلة تلقائياً إلا عند ضغطكِ على زر <strong className="text-[#2e493b]">«طلب عرض وتوليد الأسئلة الآن»</strong>.
              </li>
              <li>
                يشتق الأسئلة بدقة ووضوح من الكتاب أو المحاضرة المرفقة، مع تنويعها بين <strong className="text-[#2e493b]">اختيار من متعدد، صح أو خطأ، وأسئلة تحليلية عميقة</strong>، وإظهار التعليل العلمي لكل إجابة.
              </li>
            </ul>
          </div>

          {/* Feature 5: شرح الجدول الدراسي */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                5. طريقة استخدام «الجدول الدراسي» وتوزيع المحاضرات
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                <strong className="text-[#2e493b]">الإرفاق والتوزيع التلقائي على الأيام:</strong> اضغطي على زر <strong className="text-[#20352a]">«إرفاق الجدول وتوزيعه تلقائياً»</strong> وارفعي لقطة شاشة لجدولكِ الجامعي أو ملف PDF، وسيقوم النظام بقراءته واستخراج المحاضرات وتوزيعها تلقائياً على أيام الأسبوع (الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس).
              </li>
              <li>
                <strong className="text-[#2e493b]">إضافة المواد يدوياً:</strong> اضغطي على زر <strong className="text-[#20352a]">«إضافة مادة / محاضرة يدوياً»</strong>، اكتبي اسم المادة والوقت والقاعة، وحددي يوم أو عدة أيام في الأسبوع (مثل الأحد والثلاثاء) ليتم توزيعها فوراً في الجدول، مع إمكانية تصفية العرض حسب كل يوم أو حذف أي محاضرة.
              </li>
            </ul>
          </div>

          {/* Feature 6: شرح لوحة التقدم */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                6. طريقة استخدام «لوحة التقدم والإنجاز العلمي»
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                <strong className="text-[#20352a]">مؤشرات الإحصائيات الشاملة:</strong> تعرض لكِ إجمالي الساعات المسجلة، عدد المقررات النشطة، المحاضرات المستمعة، والاختبارات المجتازة، مع شريط التقدم العام للفصل الدراسي.
              </li>
              <li>
                <strong className="text-[#20352a]">تفصيل التقدم لكل مقرر:</strong> يعرض نسبة الإنجاز لكل مقرر دراسي، وعند النقر على أي مقرر ينقلكِ مباشرة إلى صفحته.
              </li>
              <li>
                <strong className="text-[#20352a]">قائمة مهام الاستذكار والمتابعة:</strong> يمكنكِ كتابة مهامكِ اليومية أو الأسبوعية (مثل: مراجعة باب القياس، تلخيص المحاضرة الرابعة)، ووضع علامة (✓) عند إنجازها، أو حذف أي مهمة بضغطة زر.
              </li>
            </ul>
          </div>

          {/* Feature 7: الباحث في الروض المربع وميزات الفوتر */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center font-bold text-xs shrink-0">
                <BookMarked className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#20352a]">
                7. باحث الروض المربع ومميزات الشريط السفلي (الفوتر)
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed list-disc list-inside pr-1">
              <li>
                <strong className="text-[#20352a]">الباحث في الروض المربع وروضة الناظر:</strong> بطاقة مخصصة تفتح لكِ محرك البحث الفوري لاستخراج نصوص ومسائل الفقه الحنبلي وأصول الفقه بدقة.
              </li>
              <li>
                <strong className="text-[#20352a]">المساعد الذكي (<Bot className="w-3.5 h-3.5 inline text-[#2e493b]" />):</strong> محاور دراسي ذكي في أسفل وأعلى الصفحة لشرح المصطلحات والمسائل وإعانتكِ على الفهم والمدارسة.
              </li>
              <li>
                <strong className="text-[#20352a]">تطبيق ازرع (<Sprout className="w-3.5 h-3.5 inline text-[#2e493b]" />):</strong> رابط مباشر للوصول السريع إلى منصة وتطبيق «ازرع».
              </li>
              <li>
                <strong className="text-[#20352a]">التقويم الأكاديمي (<Calendar className="w-3.5 h-3.5 inline text-[#2e493b]" />):</strong> يعرض التقويم الجامعي المعتمد لجامعة القصيم (1448هـ) مع تظليل الأسابيع المنتهية باللون الأخضر الهادئ وتحديد الأسبوع الحالي.
              </li>
            </ul>
          </div>

          {/* Bonus Section: تثبيت الموقع كتطبيق على الجوال والآيباد */}
          <div className="p-4 sm:p-5 bg-[#f4f7f5] rounded-2xl border border-[#2e493b]/20 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2e493b] text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#20352a]">
                  تثبيت «سَبيل» كتطبيق على الشاشة الرئيسية (آيفون / آيباد / أندرويد)
                </h4>
                <p className="text-[11px] text-stone-500">
                  للوصول السريع للمنصة بضغطة واحدة بدون شريط المتصفح
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-2">
                <Share className="w-4 h-4 text-[#2e493b] shrink-0" />
                <span>1. اضغطي زر المشاركة (Share) في متصفح Safari</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-2">
                <PlusSquare className="w-4 h-4 text-[#2e493b] shrink-0" />
                <span>2. اختاري «إضافة إلى الصفحة الرئيسية»</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3. اضغطي «إضافة» ليظهر شعار سَبيل على شاشتكِ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#2e493b] hover:bg-[#385947] rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            واضح، فهمت طريقة الاستخدام
          </button>
        </div>
      </div>
    </div>
  );
};
