import React, { useState } from 'react';
import { RefreshCw, Heart, Gift, ExternalLink } from 'lucide-react';
import islamicLibraryArchAsset from '../assets/images/islamic_library_arch_1791754869774.jpg';

const FALLBACK_PUBLIC_IMG = '/islamic-library-arch.jpg';

export type ContentType = 'آية قرآنية' | 'حديث نبوي صحيح' | 'ذكر ودعاء مأثور';

export interface DhikrItem {
  id: string;
  type: ContentType;
  text: string;
  source: string;
  referenceNote: string;
}

export const DHIKR_ITEMS: DhikrItem[] = [
  // 1. الآيات القرآنية (بالرسم العثماني المعتمد)
  {
    id: 'q1',
    type: 'آية قرآنية',
    text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    source: 'سورة طه: الآية 114',
    referenceNote: 'مصحف المدينة النبوية',
  },
  {
    id: 'q2',
    type: 'آية قرآنية',
    text: 'يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ خَبِيرٌ',
    source: 'سورة المجادلة: الآية 11',
    referenceNote: 'مصحف المدينة النبوية',
  },
  {
    id: 'q3',
    type: 'آية قرآنية',
    text: 'قُلْ هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ ۗ إِنَّمَا يَتَذَكَّرُ أُولُو الْأَلْبَابِ',
    source: 'سورة الزمر: الآية 9',
    referenceNote: 'مصحف المدينة النبوية',
  },
  {
    id: 'q4',
    type: 'آية قرآنية',
    text: 'إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ ۗ إِنَّ اللَّهَ عَزِيزٌ غَفُورٌ',
    source: 'سورة فاطر: الآية 28',
    referenceNote: 'مصحف المدينة النبوية',
  },
  {
    id: 'q5',
    type: 'آية قرآنية',
    text: 'شَهِدَ اللَّهُ أَنَّهُ لَا إِلَٰهَ إِلَّا هُوَ وَالْمَلَائِكَةُ وَأُولُو الْعِلْمِ قَائِمًا بِالْقِسْطِ',
    source: 'سورة آل عمران: الآية 18',
    referenceNote: 'مصحف المدينة النبوية',
  },
  {
    id: 'q6',
    type: 'آية قرآنية',
    text: 'وَمَن يُؤْتَ الْحِكْمَةَ فَقَدْ أُوتِيَ خَيْرًا كَثِيرًا ۗ وَمَا يَذَّكَّرُ إِلَّا أُولُو الْأَلْبَابِ',
    source: 'سورة البقرة: الآية 269',
    referenceNote: 'مصحف المدينة النبوية',
  },

  // 2. الأحاديث النبوية الصحيحة (موسوعة الدرر السنية)
  {
    id: 'h1',
    type: 'حديث نبوي صحيح',
    text: 'مَن يُرِدِ اللَّهُ بهِ خَيْرًا يُفَقِّهْهُ في الدِّينِ',
    source: 'صحيح البخاري (71)، صحيح مسلم (1037)',
    referenceNote: 'متفق عليه · الدرر السنية',
  },
  {
    id: 'h2',
    type: 'حديث نبوي صحيح',
    text: 'مَن سَلَكَ طَرِيقًا يَلْتَمِسُ فيه عِلْمًا، سَهَّلَ اللَّهُ له به طَرِيقًا إلى الجَنَّةِ',
    source: 'صحيح مسلم (2699)',
    referenceNote: 'صحيح مسلم · الدرر السنية',
  },
  {
    id: 'h3',
    type: 'حديث نبوي صحيح',
    text: 'إِذَا مَاتَ الإنْسَانُ انْقَطَعَ عنْه عَمَلُهُ إِلَّا مِن ثَلَاثَةٍ: إِلَّا مِن صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو له',
    source: 'صحيح مسلم (1631)',
    referenceNote: 'صحيح مسلم · الدرر السنية',
  },
  {
    id: 'h4',
    type: 'حديث نبوي صحيح',
    text: 'إنَّ الملائكةَ لتَضَعُ أجنِحَتَها لطالبِ العلمِ رِضًا بما يصنعُ',
    source: 'سنن أبي داود (3641)',
    referenceNote: 'صحيح · الدرر السنية',
  },
  {
    id: 'h5',
    type: 'حديث نبوي صحيح',
    text: 'خَيْرُكُمْ مَن تَعَلَّمَ القُرْآنَ وعَلَّمَهُ',
    source: 'صحيح البخاري (5027)',
    referenceNote: 'صحيح البخاري · الدرر السنية',
  },
  {
    id: 'h6',
    type: 'حديث نبوي صحيح',
    text: 'مَثَلُ ما بَعَثَنِي اللَّهُ به مِنَ الهُدَى والعِلْمِ، كَمَثَلِ الغَيْثِ الكَثِيرِ أَصَابَ أَرْضًا',
    source: 'صحيح البخاري (79)، صحيح مسلم (2282)',
    referenceNote: 'متفق عليه · الدرر السنية',
  },

  // 3. الأذكار والأدعية الصحيحة (حصن المسلم والدرر السنية)
  {
    id: 'd1',
    type: 'ذكر ودعاء مأثور',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    source: 'سنن ابن ماجه (925)',
    referenceNote: 'صحيح · حصن المسلم والدرر السنية',
  },
  {
    id: 'd2',
    type: 'ذكر ودعاء مأثور',
    text: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي، وَعَلِّمْنِي مَا يَنْفَعُنِي، وَزِدْنِي عِلْمًا',
    source: 'سنن الترمذي (3599)',
    referenceNote: 'صحيح · الدرر السنية',
  },
  {
    id: 'd3',
    type: 'ذكر ودعاء مأثور',
    text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ، وَمِنْ قَلْبٍ لَا يَخْشَعُ، وَمِنْ نَفْسٍ لَا تَشْبَعُ، وَمِنْ دَعْوَةٍ لَا يُسْتَجَابُ لَهَا',
    source: 'صحيح مسلم (2722)',
    referenceNote: 'صحيح مسلم · حصن المسلم',
  },
  {
    id: 'd4',
    type: 'ذكر ودعاء مأثور',
    text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    source: 'السنن الكبرى للنسائي (10330)',
    referenceNote: 'حسن · حصن المسلم والدرر السنية',
  },
  {
    id: 'd5',
    type: 'ذكر ودعاء مأثور',
    text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    source: 'سنن أبي داود (5072)',
    referenceNote: 'صحيح · حصن المسلم',
  },
  {
    id: 'd6',
    type: 'ذكر ودعاء مأثور',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    source: 'صحيح مسلم (2726)',
    referenceNote: 'صحيح مسلم · حصن المسلم',
  },
];

// Session-based alternating selection helper
function getNextSessionItem(): DhikrItem {
  try {
    const STORAGE_KEY = 'sabeel_dhikr_session_tracker';
    const stored = localStorage.getItem(STORAGE_KEY);
    let lastTypeIndex = -1;
    let typeOffsets: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.lastTypeIndex === 'number') lastTypeIndex = parsed.lastTypeIndex;
        if (parsed.typeOffsets) typeOffsets = { ...typeOffsets, ...parsed.typeOffsets };
      } catch {
        // Fallback
      }
    }

    const nextTypeIndex = (lastTypeIndex + 1) % 3;
    const categoryOffsets = typeOffsets[nextTypeIndex] || 0;

    const categoryTypes: ContentType[] = ['آية قرآنية', 'حديث نبوي صحيح', 'ذكر ودعاء مأثور'];
    const chosenType = categoryTypes[nextTypeIndex];
    const categoryItems = DHIKR_ITEMS.filter((item) => item.type === chosenType);

    const chosenItemIndex = categoryOffsets % categoryItems.length;
    const chosenItem = categoryItems[chosenItemIndex] || DHIKR_ITEMS[0];

    typeOffsets[nextTypeIndex] = (chosenItemIndex + 1) % categoryItems.length;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastTypeIndex: nextTypeIndex,
        typeOffsets,
      })
    );

    return chosenItem;
  } catch {
    return DHIKR_ITEMS[0];
  }
}

export const DhikrBanner: React.FC = () => {
  const [currentItem, setCurrentItem] = useState<DhikrItem>(() => getNextSessionItem());
  const [isFading, setIsFading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(islamicLibraryArchAsset || FALLBACK_PUBLIC_IMG);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  // تظهر بطاقة التبرع برمجياً إذا كان تاريخ اليوم يوافق يوم 25 من الشهر الميلادي فقط
  const isDay25 = new Date().getDate() === 25;

  const handleManualSwitch = () => {
    setIsFading(true);
    setTimeout(() => {
      const currentIndex = DHIKR_ITEMS.findIndex((i) => i.id === currentItem.id);
      const nextIndex = (currentIndex + 1) % DHIKR_ITEMS.length;
      setCurrentItem(DHIKR_ITEMS[nextIndex]);
      setIsFading(false);
    }, 180);
  };

  const handleImageError = () => {
    if (imgSrc !== FALLBACK_PUBLIC_IMG) {
      setImgSrc(FALLBACK_PUBLIC_IMG);
    } else {
      setImgFailed(true);
    }
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs border border-[#2e493b]/15 text-white h-full min-h-[220px] flex flex-col justify-between items-center text-center p-5 sm:p-6 group transition-all bg-gradient-to-br from-[#1b2e23] via-[#274233] to-[#16241b]">
      {/* Classical Islamic Arch Subtle Pattern Fallback Layer */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.28),_transparent_70%)]"
      />

      {/* Background Islamic Library Arched Image (hidden if failed so broken icon never appears) */}
      {!imgFailed && (
        <img
          src={imgSrc}
          alt=""
          aria-hidden="true"
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover object-center scale-100 group-hover:scale-102 transition-transform duration-700 pointer-events-none"
        />
      )}

      {/* Elegant dark overlay for contrast and legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/50 backdrop-brightness-95 pointer-events-none" />

      {/* Subtle manual switch button in the corner without clutter */}
      <div className="absolute top-3 left-3 z-20 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleManualSwitch}
          title="تبديل الذكر"
          className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white/90 border border-white/20 transition-all cursor-pointer backdrop-blur-xs flex items-center gap-1 text-[11px]"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px]">تبديل</span>
        </button>
      </div>

      {/* Pure Centered Quote: Ayat / Hadith / Dhikr with luxurious calligraphy */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto my-auto px-2 transition-opacity duration-200 flex flex-col items-center justify-center text-center space-y-2.5 ${
          isFading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <h2 className="font-['Amiri',serif] text-base sm:text-lg lg:text-xl font-bold leading-relaxed text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] max-w-md mx-auto">
          {currentItem.type === 'آية قرآنية' ? `﴿ ${currentItem.text} ﴾` : `« ${currentItem.text} »`}
        </h2>

        {/* Clean Source Centered Underneath */}
        <p className="text-xs sm:text-sm font-medium text-amber-200/90 font-['Amiri',serif] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {currentItem.source}
        </p>
      </div>

      {/* خانة التبرع: تظهر برمجياً فقط إذا كان تاريخ اليوم يوافق يوم 25 من الشهر الميلادي */}
      {isDay25 && (
        <div className="relative z-20 w-full max-w-lg mt-3 pt-3 border-t border-amber-200/25 text-right animate-fade-in space-y-2">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-black/55 border border-amber-400/35 backdrop-blur-md shadow-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold font-cairo">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30 shrink-0" />
                <span>بركة المكافأة والصدقة · يوم ٢٥ من الشهر</span>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-amber-50 font-['Amiri',serif] leading-relaxed">
              قال ﷺ: ما نقص مالٌ من صدقة.. اجعل لمكافأتك بركةً وأثراً، وساهم في دعم حفظة كتاب الله
            </p>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <a
                href="https://gqb.org.sa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-xs shadow-md transition-all hover:scale-102 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-stone-900" />
                <span>المساهمة عبر جمعية تحفيظ القرآن الكريم</span>
                <ExternalLink className="w-3 h-3 text-stone-800" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
