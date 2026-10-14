import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Sun,
  Sunrise,
  SunMedium,
  CloudSun,
  Sunset,
  Moon,
  ChevronDown,
  Calendar,
  Sparkles,
  MoonStar,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

export interface PrayerItem {
  id: string;
  name: string;
  time24: string;
  timeDisplay: string;
  icon: 'fajr' | 'shuruq' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  isFardh: boolean;
}

export interface CityConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Strictly configured cities with Buraidah (Al-Qassim) as default and primary
export const SAUDI_CITIES: CityConfig[] = [
  {
    id: 'buraidah',
    name: 'بريدة (القصيم)',
    lat: 26.3260,
    lng: 43.9750,
  },
  {
    id: 'riyadh',
    name: 'الرياض',
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: 'makkah',
    name: 'مكة المكرمة',
    lat: 21.4225,
    lng: 39.8262,
  },
  {
    id: 'madinah',
    name: 'المدينة المنورة',
    lat: 24.4672,
    lng: 39.6111,
  },
  {
    id: 'khobar',
    name: 'الخبر / الشرقية',
    lat: 26.2818,
    lng: 50.2084,
  },
  {
    id: 'jeddah',
    name: 'جدة',
    lat: 21.5433,
    lng: 39.1728,
  },
  {
    id: 'abha',
    name: 'أبها / عسير',
    lat: 18.2164,
    lng: 42.5053,
  },
];

/**
 * Extracts exact date & time components in Asia/Riyadh timezone (UTC+3)
 */
export function getRiyadhDateDetails(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  let year = 2026;
  let month = 10;
  let day = 13;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;

  const totalSeconds = hour * 3600 + minute * 60 + second;
  // Date object matching Riyadh's calendar day
  const riyadhDay = new Date(year, month - 1, day);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    totalSeconds,
    riyadhDay,
  };
}

/**
 * Format 24-hour time "HH:MM" to localized 12-hour Arabic display "hh:mm ص/م"
 */
export function formatTo12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${m} ${period}`;
}

/**
 * Calculates prayer times strictly matching Umm Al-Qura standard:
 * - Coordinates: Buraidah (lat 26.3260, lng 43.9750) or selected Saudi city
 * - Method 4 / UmmAlQura: Fajr 18.5 degrees, Isha exactly 90 minutes after Maghrib
 */
export function calculateUmmAlQuraSchedule(lat: number, lng: number, date: Date): PrayerItem[] {
  const coordinates = new Coordinates(lat, lng);
  const params = CalculationMethod.UmmAlQura();
  // Ensure Fajr is 18.5 deg and Isha is 90 mins after Maghrib
  params.fajrAngle = 18.5;
  params.ishaInterval = 90;

  const pt = new PrayerTimes(coordinates, date, params);

  const formatPt = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    const time24 = `${hour}:${minute}`;
    return {
      time24,
      timeDisplay: formatTo12Hour(time24),
    };
  };

  const fajr = formatPt(pt.fajr);
  const sunrise = formatPt(pt.sunrise);
  const dhuhr = formatPt(pt.dhuhr);
  const asrDate = new Date(pt.asr.getTime() + 60000); // 1 minute safety adjustment to match official Umm Al-Qura Asr
  const asr = formatPt(asrDate);
  const maghrib = formatPt(pt.maghrib);
  const isha = formatPt(pt.isha);

  return [
    { id: 'fajr', name: 'الفجر', time24: fajr.time24, timeDisplay: fajr.timeDisplay, icon: 'fajr', isFardh: true },
    { id: 'shuruq', name: 'الشروق', time24: sunrise.time24, timeDisplay: sunrise.timeDisplay, icon: 'shuruq', isFardh: false },
    { id: 'dhuhr', name: 'الظهر', time24: dhuhr.time24, timeDisplay: dhuhr.timeDisplay, icon: 'dhuhr', isFardh: true },
    { id: 'asr', name: 'العصر', time24: asr.time24, timeDisplay: asr.timeDisplay, icon: 'asr', isFardh: true },
    { id: 'maghrib', name: 'المغرب', time24: maghrib.time24, timeDisplay: maghrib.timeDisplay, icon: 'maghrib', isFardh: true },
    { id: 'isha', name: 'العشاء', time24: isha.time24, timeDisplay: isha.timeDisplay, icon: 'isha', isFardh: true },
  ];
}

/**
 * Calculate accurate Islamic Night Times (نصف الليل والثلث الأخير من الليل)
 * based on Maghrib (sunset) and Fajr (dawn)
 */
export function calculateNightTimes(maghribTime24: string, fajrTime24: string) {
  const [mH, mM] = maghribTime24.split(':').map(Number);
  const [fH, fM] = fajrTime24.split(':').map(Number);

  const maghribSec = mH * 3600 + mM * 60;
  const fajrNextDaySec = (fH + 24) * 3600 + fM * 60; // Next morning

  const nightDurationSec = fajrNextDaySec - maghribSec;

  // Half of the night (نصف الليل الشرعي - انتهاء وقت صلاة العشاء)
  const midnightSec = (maghribSec + nightDurationSec / 2) % (24 * 3600);

  // Last third of the night (الثلث الأخير من الليل - وقت النزول الإلهي وصلاة الوتر والتهجد)
  const lastThirdSec = (maghribSec + (nightDurationSec * 2) / 3) % (24 * 3600);

  const formatSecToDisplay = (totalSec: number) => {
    let h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const period = h >= 12 ? 'م' : 'ص';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)} ${period}`;
  };

  return {
    midnightDisplay: formatSecToDisplay(midnightSec),
    lastThirdDisplay: formatSecToDisplay(lastThirdSec),
    midnightSec,
    lastThirdSec,
    nightDurationSec,
  };
}

/**
 * Calculates current active prayer, next prayer, elapsed seconds and remaining seconds
 * computed strictly against local Riyadh time (Asia/Riyadh, UTC+3)
 */
export function getPrayerProgress(now: Date, prayers: PrayerItem[]) {
  const riyadh = getRiyadhDateDetails(now);
  const nowSec = riyadh.totalSeconds;

  const prayerSecs = prayers.map((p) => {
    const [h, m] = p.time24.split(':').map(Number);
    return { ...p, sec: h * 3600 + m * 60 };
  });

  const nextIdx = prayerSecs.findIndex((p) => p.sec > nowSec);

  let currentPrayer: PrayerItem;
  let nextPrayer: PrayerItem;
  let elapsedSec: number;
  let remainingSec: number;

  if (nextIdx === -1) {
    // Current is Isha, next is tomorrow Fajr
    currentPrayer = prayers[prayers.length - 1];
    nextPrayer = prayers[0];
    elapsedSec = nowSec - prayerSecs[prayers.length - 1].sec;
    remainingSec = 24 * 3600 + prayerSecs[0].sec - nowSec;
  } else if (nextIdx === 0) {
    // Between midnight and Fajr: current is Isha from yesterday, next is Fajr
    currentPrayer = prayers[prayers.length - 1];
    nextPrayer = prayers[0];
    elapsedSec = nowSec + (24 * 3600 - prayerSecs[prayers.length - 1].sec);
    remainingSec = prayerSecs[0].sec - nowSec;
  } else {
    currentPrayer = prayers[nextIdx - 1];
    nextPrayer = prayers[nextIdx];
    elapsedSec = nowSec - prayerSecs[nextIdx - 1].sec;
    remainingSec = prayerSecs[nextIdx].sec - nowSec;
  }

  return {
    currentPrayer,
    nextPrayer,
    elapsedSec: Math.max(0, elapsedSec),
    remainingSec: Math.max(0, remainingSec),
    nowSec,
  };
}

export const PrayerTimesWidget: React.FC = () => {
  const [selectedCityId, setSelectedCityId] = useState<string>('buraidah');
  const [now, setNow] = useState<Date>(new Date());
  const [showNightDetails, setShowNightDetails] = useState<boolean>(false);
  const [apiPrayers, setApiPrayers] = useState<Record<string, PrayerItem[]>>({});

  // 1-second interval to drive live real-time countdown against Riyadh time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedCity = useMemo(() => {
    return SAUDI_CITIES.find((c) => c.id === selectedCityId) || SAUDI_CITIES[0];
  }, [selectedCityId]);

  // Initial calculation via adhan-js using Umm Al-Qura parameters (Fajr 18.5 deg, Isha 90 min)
  const localCalculatedPrayers = useMemo(() => {
    const riyadh = getRiyadhDateDetails(now);
    return calculateUmmAlQuraSchedule(selectedCity.lat, selectedCity.lng, riyadh.riyadhDay);
  }, [selectedCity.lat, selectedCity.lng, now.toDateString()]);

  // Fetch official Umm Al-Qura schedule via Aladhan API with exact coordinates & method 4
  const fetchUmmAlQuraApi = useCallback(async (city: CityConfig) => {
    try {
      // Buraidah coordinates: lat=26.3260, lng=43.9750, method=4 (Umm Al-Qura)
      const queryParams = `latitude=${city.lat}&longitude=${city.lng}&method=4`;
      let res = await fetch(`/api/prayer-times?${queryParams}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`https://api.aladhan.com/v1/timings?${queryParams}`).catch(() => null);
      }
      if (!res || !res.ok) return;

      const data = await res.json();
      const timings = data?.data?.timings;
      if (!timings) return;

      const clean = (t: string) => (t || '').split(' ')[0].slice(0, 5);

      const fajr24 = clean(timings.Fajr);
      const shuruq24 = clean(timings.Sunrise);
      const dhuhr24 = clean(timings.Dhuhr);
      const asr24 = clean(timings.Asr);
      const maghrib24 = clean(timings.Maghrib);
      const isha24 = clean(timings.Isha);

      if (fajr24 && maghrib24 && isha24) {
        const prayers: PrayerItem[] = [
          { id: 'fajr', name: 'الفجر', time24: fajr24, timeDisplay: formatTo12Hour(fajr24), icon: 'fajr', isFardh: true },
          { id: 'shuruq', name: 'الشروق', time24: shuruq24, timeDisplay: formatTo12Hour(shuruq24), icon: 'shuruq', isFardh: false },
          { id: 'dhuhr', name: 'الظهر', time24: dhuhr24, timeDisplay: formatTo12Hour(dhuhr24), icon: 'dhuhr', isFardh: true },
          { id: 'asr', name: 'العصر', time24: asr24, timeDisplay: formatTo12Hour(asr24), icon: 'asr', isFardh: true },
          { id: 'maghrib', name: 'المغرب', time24: maghrib24, timeDisplay: formatTo12Hour(maghrib24), icon: 'maghrib', isFardh: true },
          { id: 'isha', name: 'العشاء', time24: isha24, timeDisplay: formatTo12Hour(isha24), icon: 'isha', isFardh: true },
        ];

        setApiPrayers((prev) => ({
          ...prev,
          [city.id]: prayers,
        }));
      }
    } catch (err) {
      // Seamless fallback to adhan-js local calculation
      console.warn('Aladhan API fetch note:', err);
    }
  }, []);

  // Fetch when selected city changes
  useEffect(() => {
    fetchUmmAlQuraApi(selectedCity);
  }, [selectedCity, fetchUmmAlQuraApi]);

  // Active prayers: API synced or adhan-js calculation
  const activePrayers: PrayerItem[] = apiPrayers[selectedCity.id] || localCalculatedPrayers;

  const { currentPrayer, nextPrayer, elapsedSec, remainingSec, nowSec } = getPrayerProgress(
    now,
    activePrayers
  );

  const fajrPrayer = activePrayers.find((p) => p.id === 'fajr') || activePrayers[0];
  const maghribPrayer = activePrayers.find((p) => p.id === 'maghrib') || activePrayers[4];

  const nightTimes = calculateNightTimes(maghribPrayer.time24, fajrPrayer.time24);

  // Check if current moment is in the Last Third of the Night (from lastThird until Fajr)
  const [fH, fM] = fajrPrayer.time24.split(':').map(Number);
  const fajrSec = fH * 3600 + fM * 60;
  const isLastThird =
    nightTimes.lastThirdSec < fajrSec
      ? nowSec >= nightTimes.lastThirdSec && nowSec < fajrSec
      : nowSec >= nightTimes.lastThirdSec || nowSec < fajrSec;

  const formatCountdown = (totalSec: number) => {
    const safeSec = Math.max(0, Math.floor(totalSec));
    const hours = Math.floor(safeSec / 3600);
    const minutes = Math.floor((safeSec % 3600) / 60);
    const seconds = safeSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Day and Hijri Date calculated precisely for Asia/Riyadh (Umm al-Qura calendar)
  const dayName = (() => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        timeZone: 'Asia/Riyadh',
        weekday: 'long',
      }).format(now);
    } catch {
      return 'اليوم';
    }
  })();

  const hijriDateFormatted = (() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        timeZone: 'Asia/Riyadh',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
    } catch {
      return '1448 هـ';
    }
  })();

  const renderIcon = (type: PrayerItem['icon'], isCurrent: boolean, isNext: boolean) => {
    const cls = `w-3.5 h-3.5 ${
      isCurrent ? 'text-white' : isNext ? 'text-[#2e493b]' : 'text-stone-500'
    }`;
    switch (type) {
      case 'fajr':
        return <Sun className={cls} />;
      case 'shuruq':
        return <Sunrise className={cls} />;
      case 'dhuhr':
        return <SunMedium className={cls} />;
      case 'asr':
        return <CloudSun className={cls} />;
      case 'maghrib':
        return <Sunset className={cls} />;
      case 'isha':
        return <Moon className={cls} />;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#2e493b]/15 p-4 sm:p-5 shadow-2xs text-right h-full flex flex-col justify-between transition-all space-y-3">
      {/* 1. Header: Title + Day & Hijri Date (Umm Al-Qura) + City Dropdown */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#eef3ef] text-[#2e493b] flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#20352a] font-cairo leading-none">
                مواقيت الصلاة
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#2e493b]/10 text-[#2e493b] font-bold">
                تقويم أم القرى
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] font-semibold text-[#2e493b]">
              <Calendar className="w-3 h-3 text-[#3a5d4a] shrink-0" />
              <span>{dayName}، {hijriDateFormatted}</span>
            </div>
          </div>
        </div>

        {/* City Select Dropdown (Buraidah - Al-Qassim is Default) */}
        <div className="relative shrink-0">
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="appearance-none bg-[#f4f7f4] hover:bg-[#ebf0ec] text-[#23382c] border border-[#2e493b]/15 rounded-xl py-1 pr-6 pl-5 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#2e493b] transition-all cursor-pointer"
          >
            {SAUDI_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-stone-400 absolute left-1.5 top-2 pointer-events-none" />
        </div>
      </div>

      {/* 2. تنبيه صلاة الوتر في الثلث الأخير من الليل (Witr Alert Banner) */}
      {isLastThird && (
        <div className="p-3 bg-gradient-to-r from-[#1b3527] to-[#254534] text-white rounded-2xl shadow-sm border border-emerald-700/50 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold font-cairo text-amber-200">
                الثلث الأخير من الليل • لا تنسَ صلاة الوتر
              </p>
              <p className="text-[10px] text-emerald-100 opacity-90">
                وقت استجابة الدعاء والنزول الإلهي حتى طلوع الفجر
              </p>
            </div>
          </div>
          <MoonStar className="w-5 h-5 text-amber-300 shrink-0" />
        </div>
      )}

      {/* 3. العداد اللحظي للوقت المنقضي والمتبقي بدقة توقيت الرياض (Real-time Live Ticker) */}
      <div className="bg-[#f6f9f6] rounded-2xl border border-[#2e493b]/12 p-2.5 sm:p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Remaining Time ticker */}
          <div className="flex-1 p-2 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span className="text-stone-500 font-semibold">بقي على:</span>
              <span className="font-bold text-[#20352a]">{nextPrayer.name}</span>
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-[#20352a] tabular-nums" dir="ltr">
              {formatCountdown(remainingSec)}
            </div>
          </div>

          {/* Elapsed Time ticker */}
          <div className="flex-1 p-2 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3 h-3 text-stone-400 shrink-0" />
              <span className="text-stone-500 font-semibold">مضى على:</span>
              <span className="font-bold text-[#20352a]">{currentPrayer.name}</span>
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-stone-600 tabular-nums" dir="ltr">
              {formatCountdown(elapsedSec)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. شريط مواقيت الصلوات اليومية (Daily Prayers Grid - Umm Al-Qura) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {activePrayers.map((prayer) => {
          const isCurrent = currentPrayer.id === prayer.id;
          const isNext = nextPrayer.id === prayer.id;

          return (
            <div
              key={prayer.id}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center text-center gap-0.5 relative ${
                isCurrent
                  ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs ring-2 ring-emerald-600/30'
                  : isNext
                  ? 'bg-[#f4f8f5] border-[#2e493b]/30 text-[#20352a]'
                  : 'bg-[#fafbfa] hover:bg-[#edf3ee] border-stone-200/60 text-stone-700'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[8px] font-bold shadow-xs">
                  الحالية
                </span>
              )}
              {isNext && !isCurrent && (
                <span className="absolute -top-1.5 px-1.5 py-0.2 rounded-full bg-[#2e493b] text-white text-[8px] font-bold shadow-xs">
                  القادمة
                </span>
              )}

              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold mt-0.5">
                {renderIcon(prayer.icon, isCurrent, isNext)}
                <span>{prayer.name}</span>
              </div>
              <span
                className={`font-mono text-[11px] sm:text-xs font-bold tabular-nums ${
                  isCurrent ? 'text-white' : 'text-stone-800'
                }`}
                dir="ltr"
              >
                {prayer.timeDisplay}
              </span>
            </div>
          );
        })}
      </div>

      {/* 5. قسم وبطاقة حسابات الليل الشرعي (نصف الليل والثلث الأخير) */}
      <div className="pt-2 border-t border-stone-100">
        <button
          type="button"
          onClick={() => setShowNightDetails(!showNightDetails)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-[#2e493b] hover:text-[#20352a] transition-colors py-1 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <MoonStar className="w-3.5 h-3.5 text-[#2e493b]" />
            <span>نصف الليل والثلث الأخير</span>
          </div>
          {showNightDetails ? (
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>

        {showNightDetails && (
          <div className="mt-2 p-3 bg-[#fafbfa] rounded-2xl border border-stone-200/80 space-y-2 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* نصف الليل */}
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#20352a]">نصف الليل الشرعي</p>
                  <p className="text-[10px] text-stone-500">انتهاء وقت صلاة العشاء</p>
                </div>
                <span className="font-mono font-bold text-[#2e493b] text-xs" dir="ltr">
                  {nightTimes.midnightDisplay}
                </span>
              </div>

              {/* الثلث الأخير */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  isLastThird
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-1 ring-emerald-400'
                    : 'bg-white border-stone-200/80'
                }`}
              >
                <div>
                  <p className="font-bold text-[#20352a] flex items-center gap-1">
                    <span>الثلث الأخير من الليل</span>
                    {isLastThird && <span className="text-[9px] px-1 rounded bg-emerald-600 text-white">الآن</span>}
                  </p>
                  <p className="text-[10px] text-stone-500">وقت السحر وصلاة الوتر والتهجد</p>
                </div>
                <span className="font-mono font-bold text-[#2e493b] text-xs" dir="ltr">
                  {nightTimes.lastThirdDisplay}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 leading-relaxed pt-1">
              <MapPin className="w-3 h-3 text-[#2e493b] shrink-0" />
              <span>
                المواقيت معتمدة وفق تقويم أم القرى الرسمي لمدينة {selectedCity.name} (خط عرض {selectedCity.lat.toFixed(4)}، خط طول {selectedCity.lng.toFixed(4)}). صلاة العشاء محددة بـ 90 دقيقة بعد أذان المغرب.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
