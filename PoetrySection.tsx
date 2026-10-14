import React from 'react';
import { Feather, Sparkles } from 'lucide-react';

export const PoetrySection: React.FC = () => {
  return (
    <section className="w-full max-w-5xl mx-auto my-6 px-2 sm:px-4 text-center animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#243c2f] via-[#1c3025] to-[#15241c] text-white p-7 sm:p-10 border border-[#2e493b]/30 shadow-md">
        {/* Decorative subtle background accents */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-emerald-400/20 text-emerald-200 text-xs font-semibold mb-6 shadow-2xs backdrop-blur-xs">
          <Feather className="w-3.5 h-3.5 text-emerald-300" />
          <span>نداء طالب العلم</span>
        </div>

        {/* Main Poetry Verses */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          {/* Verse 1 */}
          <div className="space-y-1">
            <h3 className="font-amiri text-xl sm:text-2xl lg:text-3xl font-medium text-[#5a6c60] leading-relaxed tracking-wide">
              <span className="text-[#1A531A] font-bold">آلُ الشَّرِيعَةِ</span> أَقْبِلُوا فِي عِزَّةٍ ... فَبِكُمْ سَتَبْقَى قُوَّةُ البُنْيَانِ
            </h3>
          </div>

          {/* Floral/Geometric Separator */}
          <div className="flex items-center justify-center gap-3 text-emerald-700/30 py-1">
            <div className="w-12 h-px bg-emerald-700/20" />
            <span className="text-sm select-none">✦</span>
            <div className="w-12 h-px bg-emerald-700/20" />
          </div>

          {/* Verse 2 */}
          <div className="space-y-1">
            <p className="font-amiri text-xl sm:text-2xl lg:text-3xl font-medium text-[#5a6c60] leading-relaxed tracking-wide">
              أَدُّوا زَكَاةَ نِصَابِ عِلْمٍ نَافِعٍ ... فِي نَشْرِهِ دَوْمًا بِكُلِّ مَكَانِ
            </p>
          </div>

          {/* Floral/Geometric Separator */}
          <div className="flex items-center justify-center gap-3 text-emerald-700/30 py-1">
            <div className="w-12 h-px bg-emerald-700/20" />
            <span className="text-sm select-none">✦</span>
            <div className="w-12 h-px bg-emerald-700/20" />
          </div>

          {/* Verse 3 */}
          <div className="space-y-1">
            <p className="font-amiri text-xl sm:text-2xl lg:text-3xl font-medium text-[#5a6c60] leading-relaxed tracking-wide">
              هَذِي <span className="text-[#1A531A] font-bold">الشَّرِيعَةُ</span> عِلْمُهَا كَغَمَامَةٍ ... بِالغَيْثِ تَهْمِلُ أَيَّمَا هَمَلَانِ
            </p>
          </div>
        </div>

        {/* Bottom subtle note */}
        <div className="relative z-10 mt-6 pt-5 border-t border-emerald-500/15 text-[11px] sm:text-xs text-emerald-300/70 font-amiri">
          <span>شِعَارُ هِمَّةِ طَالِبِ العِلْمِ فِي بَوَّابَةِ سَبيل</span>
        </div>
      </div>
    </section>
  );
};
