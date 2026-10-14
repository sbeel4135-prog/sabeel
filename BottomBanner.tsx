import React from 'react';
import { Bot, Calendar, Sprout, HelpCircle, Link as LinkIcon } from 'lucide-react';
import { SABEEL_LOGO_BASE64 } from '../assets/sabeelLogoBase64';

interface BottomBannerProps {
  onOpenAssistant: () => void;
  onOpenEzraa: () => void;
  onOpenCalendar: () => void;
  onOpenInstallGuide: () => void;
  showPoetry?: boolean;
}

export const BottomBanner: React.FC<BottomBannerProps> = ({
  onOpenAssistant,
  onOpenEzraa,
  onOpenCalendar,
  onOpenInstallGuide,
  showPoetry = true,
}) => {
  return (
    <footer className="w-full bg-[#f8faf8] border-t border-[#2e493b]/10 pt-10 pb-16 px-4 text-center mt-12 transition-all">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Top Header: روابط مهمة */}
        <div className="flex items-center justify-end gap-2 text-[#243e30] font-bold text-base sm:text-lg">
          <span>روابط مهمة</span>
          <LinkIcon className="w-5 h-5 text-[#243e30] transform rotate-45" />
        </div>

        {/* 4 Circular Action Buttons: المساعد الذكي، تطبيق ازرع، التقويم الأكاديمي، طريقة الاستخدام */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 justify-items-center max-w-3xl mx-auto">
          {/* 1. المساعد الذكي */}
          <button
            onClick={onOpenAssistant}
            className="flex flex-col items-center gap-3 group cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#e2ebe4] group-hover:bg-[#d5e3d8] group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#243e30] shadow-2xs">
              <Bot className="w-7 h-7 stroke-[1.8]" />
            </div>
            <span className="text-sm font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors leading-snug">
              المساعد الذكي
            </span>
          </button>

          {/* 2. تطبيق ازرع */}
          <button
            onClick={onOpenEzraa}
            className="flex flex-col items-center gap-3 group cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#e2ebe4] group-hover:bg-[#d5e3d8] group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#243e30] shadow-2xs">
              <Sprout className="w-7 h-7 stroke-[1.8]" />
            </div>
            <span className="text-sm font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors leading-snug">
              تطبيق ازرع
            </span>
          </button>

          {/* 3. التقويم الأكاديمي */}
          <button
            onClick={onOpenCalendar}
            className="flex flex-col items-center gap-3 group cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#e2ebe4] group-hover:bg-[#d5e3d8] group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#243e30] shadow-2xs">
              <Calendar className="w-7 h-7 stroke-[1.8]" />
            </div>
            <span className="text-sm font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors leading-snug">
              التقويم الأكاديمي
            </span>
          </button>

          {/* 4. طريقة الاستخدام */}
          <button
            onClick={onOpenInstallGuide}
            className="flex flex-col items-center gap-3 group cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#e2ebe4] group-hover:bg-[#d5e3d8] group-hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#243e30] shadow-2xs">
              <HelpCircle className="w-7 h-7 stroke-[1.8]" />
            </div>
            <span className="text-sm font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors leading-snug">
              طريقة الاستخدام
            </span>
          </button>
        </div>

        {/* Centered Poetry Section - Shown exclusively for Sharia Major */}
        {showPoetry && (
          <>
            <div className="w-full h-px bg-stone-200/80" />
            <div className="space-y-4 pt-2 animate-fade-in text-center">
              <div className="space-y-3 text-[#5a6c60] text-base sm:text-lg lg:text-xl font-['Amiri',serif] font-medium leading-loose max-w-2xl mx-auto">
                <p>
                  <span className="text-[#1A531A] font-bold">آلُ الشَّرِيعَةِ</span> أَقْبِلُوا فِي عِزَّةٍ ... فَبِكُمْ سَتَبْقَى قُوَّةُ البُنْيَانِ
                </p>
                <p>
                  أَدُّوا زَكَاةَ نِصَابِ عِلْمٍ نَافِعٍ ... فِي نَشْرِهِ دَوْماً بِكُلِّ مَكَانِ
                </p>
                <p>
                  هَذِي <span className="text-[#1A531A] font-bold">الشَّرِيعَةُ</span> عِلْمُهَا كَغَمَامَةٍ ... بِالغَيْثِ تَهْمِلُ أَيَّمَا هَمَلَانِ
                </p>
              </div>
            </div>
          </>
        )}

        {/* Official Sabeel High-Resolution Calligraphy Logo in Footer */}
        <div className="pt-4 border-t border-stone-200/60 flex items-center justify-center">
          <img
            src={SABEEL_LOGO_BASE64}
            alt="شعار سَبِيل"
            className="h-10 w-auto object-contain select-none"
          />
        </div>
      </div>
    </footer>
  );
};
