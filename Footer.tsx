import React from 'react';
import { BookOpen, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SABEEL_LOGO_BASE64 } from '../assets/sabeelLogoBase64';

export const Footer: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <footer className="bg-[#0f3d21] text-emerald-100 border-t border-emerald-900/60 mt-16">
      {/* Poetry & Scholarly Dedication Banner */}
      <div className="bg-[#0b2f19] border-b border-emerald-900/40 py-8 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-2">
          <p className="font-amiri text-lg text-emerald-300 font-bold">آل الشريعة</p>
          <p className="font-amiri text-base sm:text-lg leading-relaxed text-emerald-100">
            أَقبلوا في عِزَّةٍ فَبِكُم سَتَبقى قُوَّةُ البُنيانِ
          </p>
          <p className="font-amiri text-base sm:text-lg leading-relaxed text-emerald-100">
            أدُّوا زكاةَ نِصابِ عِلمٍ نافِعٍ في نَشْرِهِ دَوماً بِكُلِّ مَكانِ
          </p>
          <p className="font-amiri text-base sm:text-lg leading-relaxed text-emerald-200">
            هَذِي الشَّريعَةُ عِلْمُها كَغَمامَةٍ بالغَيْثِ تَهْمِلُ أَيَّما هَمَلانِ
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-right">
          {/* Col 1: University Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src={SABEEL_LOGO_BASE64}
                alt="شعار سَبِيل"
                className="h-9 w-auto object-contain"
              />
              <span className="text-lg font-bold text-white">سَبِيل — بوابة طلاب العلم</span>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              منصة أكاديمية لطلبة العلوم الشرعية والأصولية، تجمع بين أصالة المتون والتقنيات الرقمية والذكاء الاصطناعي الأكاديمي الموثق.
            </p>
            <div className="pt-2 text-xs text-emerald-300/70 space-y-1">
              <p className="flex items-center gap-1.5 justify-start">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>كلية الشريعة والأنظمة - الحرم الأكاديمي</span>
              </p>
              <p className="flex items-center gap-1.5 justify-start">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span dir="ltr">support@sharia.edu.sa</span>
              </p>
            </div>
          </div>

          {/* Col 2: Academic Shortcuts */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">الخدمات الأكاديمية</h4>
            <ul className="space-y-2 text-xs text-emerald-200/80">
              <li>
                <button
                  onClick={() => setActiveView('courses')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  المقررات والمتون الدراسية
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('exams')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  مركز الاختبارات وبنك الأسئلة
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('schedule')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  الجدول الدراسي الأسبوعي
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('ai-assistant')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  المساعد الأكاديمي الذكي
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Reference Books & Heritage */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">أمهات المتون المعتمدة</h4>
            <ul className="space-y-2 text-xs text-emerald-200/80">
              <li>الروض المربع شرح زاد المستقنع (البهوتي)</li>
              <li>روضة الناظر وجنة المناظر (ابن قدامة)</li>
              <li>مراقي السعود في أصول الفقه</li>
              <li>زاد المستقنع في اختصار المقنع</li>
              <li>نخبة الفكر في مصطلح أهل الأثر</li>
            </ul>
          </div>

          {/* Col 4: Important Academic Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">روابط ومصادر موثوقة</h4>
            <ul className="space-y-2 text-xs text-emerald-200/80">
              <li className="flex items-center gap-1 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
                <a href="#portal" onClick={(e) => e.preventDefault()}>المكتبة الرقمية للجامعة</a>
              </li>
              <li className="flex items-center gap-1 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
                <a href="#calendar" onClick={(e) => e.preventDefault()}>التقويم الأكاديمي 1448هـ</a>
              </li>
              <li className="flex items-center gap-1 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
                <a href="#app" onClick={(e) => e.preventDefault()}>تطبيق ازرع لغراس العلم</a>
              </li>
              <li className="flex items-center gap-1 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
                <a href="#guide" onClick={(e) => e.preventDefault()}>دليل الطالب ولوائح الاختبارات</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-emerald-900/50 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/60">
          <p>© {new Date().getFullYear()} جامعة الشريعة — بوابة طلاب العلم. جميع الحقوق محفوظة.</p>
          <p className="mt-2 sm:mt-0 font-amiri text-sm text-emerald-300">
            بالعلم ننهض بالأمة · وقل رب زدني علماً
          </p>
        </div>
      </div>
    </footer>
  );
};
