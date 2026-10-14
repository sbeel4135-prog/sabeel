import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Maximize2,
  X,
  Sparkles,
  AlertCircle,
  LayoutGrid,
  ListFilter,
  Edit3,
  Eye,
  BookOpen,
} from 'lucide-react';
import { ScheduleItem } from '../../types';

interface ScheduleViewProps {
  onBack: () => void;
  userKey?: string;
  isShariaMajor?: boolean;
  isGuest?: boolean;
  onRequestAuth?: (reason?: string) => void;
}

const DEFAULT_SHARIA_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'sch_1',
    day: 'الأحد',
    time: '08:00 ص - 09:30 ص',
    title: 'مدخل أصول الفقه',
    courseCode: 'شرح 101',
    type: 'محاضرة',
    location: 'قاعة 104 - الدور الأول',
    instructor: 'د. أحمد المنصور',
  },
  {
    id: 'sch_2',
    day: 'الأحد',
    time: '10:00 ص - 11:30 ص',
    title: 'فقه الصلاة والطهارة',
    courseCode: 'شرح 102',
    type: 'محاضرة',
    location: 'قاعة 201 - الدور الثاني',
    instructor: 'د. صالح الفوزان',
  },
  {
    id: 'sch_3',
    day: 'الإثنين',
    time: '08:30 ص - 10:00 ص',
    title: 'فقه المعاملات المالية',
    courseCode: 'شرح 103',
    type: 'محاضرة',
    location: 'المدرج الكبير',
    instructor: 'د. سعد الشثري',
  },
];

const DEFAULT_GENERAL_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'sch_g1',
    day: 'الأحد',
    time: '08:00 ص - 09:30 ص',
    title: 'محاضرة المقرر التخصصي الأول',
    courseCode: 'عام 101',
    type: 'محاضرة',
    location: 'قاعة 104 - الدور الأول',
    instructor: 'أستاذ المقرر',
  },
  {
    id: 'sch_g2',
    day: 'الإثنين',
    time: '10:00 ص - 11:30 ص',
    title: 'مهارات البحث الأكاديمي',
    courseCode: 'عام 102',
    type: 'محاضرة',
    location: 'قاعة 201 - الدور الثاني',
    instructor: 'أستاذ المقرر',
  },
];

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const;

export const GRID_HOURS = [
  { hour: 8, label: '08:00 ص' },
  { hour: 9, label: '09:00 ص' },
  { hour: 10, label: '10:00 ص' },
  { hour: 11, label: '11:00 ص' },
  { hour: 12, label: '12:00 م' },
  { hour: 13, label: '01:00 م' },
  { hour: 14, label: '02:00 م' },
  { hour: 15, label: '03:00 م' },
  { hour: 16, label: '04:00 م' },
  { hour: 17, label: '05:00 م' },
];

export const HOUR_ROW_HEIGHT = 76; // Height per 60 minutes in pixels

// Parse time string e.g. "08:00 ص - 09:30 ص" or "08:30 - 10:10" into start & end minutes from 00:00
export function parseTimeToMinutes(str: string, fallbackMinutes: number): number {
  if (!str) return fallbackMinutes;
  const isPM = /م|pm/i.test(str);
  const isAM = /ص|am/i.test(str);
  const clean = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallbackMinutes;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  if (!isPM && !isAM && hours >= 1 && hours <= 7) hours += 12;

  return hours * 60 + minutes;
}

export function parseLectureTimeRange(timeStr: string): { startMinutes: number; endMinutes: number } {
  const clean = (timeStr || '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .trim();

  const parts = clean.split(/[-–]|إلى/).map((s) => s.trim());
  if (parts.length >= 2) {
    const startM = parseTimeToMinutes(parts[0], 8 * 60);
    let endM = parseTimeToMinutes(parts[1], startM + 90);
    if (endM <= startM) endM = startM + 60;
    return { startMinutes: startM, endMinutes: endM };
  }
  return { startMinutes: 8 * 60, endMinutes: 9 * 60 + 30 };
}

// Distinct academic course color themes for visual differentiation (Color Coding)
export const COURSE_COLOR_SCHEMES = [
  {
    card: 'bg-emerald-50/95 border-emerald-300 text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400',
    badge: 'bg-emerald-700 text-white',
    accentBorder: 'border-r-4 border-r-emerald-600',
    timeText: 'text-emerald-800',
    iconText: 'text-emerald-700',
  },
  {
    card: 'bg-amber-50/95 border-amber-300 text-amber-950 hover:bg-amber-100 hover:border-amber-400',
    badge: 'bg-amber-700 text-white',
    accentBorder: 'border-r-4 border-r-amber-600',
    timeText: 'text-amber-800',
    iconText: 'text-amber-700',
  },
  {
    card: 'bg-sky-50/95 border-sky-300 text-sky-950 hover:bg-sky-100 hover:border-sky-400',
    badge: 'bg-sky-700 text-white',
    accentBorder: 'border-r-4 border-r-sky-600',
    timeText: 'text-sky-800',
    iconText: 'text-sky-700',
  },
  {
    card: 'bg-purple-50/95 border-purple-300 text-purple-950 hover:bg-purple-100 hover:border-purple-400',
    badge: 'bg-purple-700 text-white',
    accentBorder: 'border-r-4 border-r-purple-600',
    timeText: 'text-purple-800',
    iconText: 'text-purple-700',
  },
  {
    card: 'bg-teal-50/95 border-teal-300 text-teal-950 hover:bg-teal-100 hover:border-teal-400',
    badge: 'bg-teal-700 text-white',
    accentBorder: 'border-r-4 border-r-teal-600',
    timeText: 'text-teal-800',
    iconText: 'text-teal-700',
  },
  {
    card: 'bg-rose-50/95 border-rose-300 text-rose-950 hover:bg-rose-100 hover:border-rose-400',
    badge: 'bg-rose-700 text-white',
    accentBorder: 'border-r-4 border-r-rose-600',
    timeText: 'text-rose-800',
    iconText: 'text-rose-700',
  },
  {
    card: 'bg-indigo-50/95 border-indigo-300 text-indigo-950 hover:bg-indigo-100 hover:border-indigo-400',
    badge: 'bg-indigo-700 text-white',
    accentBorder: 'border-r-4 border-r-indigo-600',
    timeText: 'text-indigo-800',
    iconText: 'text-indigo-700',
  },
];

export function getCourseColor(courseKey: string) {
  let hash = 0;
  for (let i = 0; i < (courseKey || '').length; i++) {
    hash = (hash << 5) - hash + courseKey.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COURSE_COLOR_SCHEMES.length;
  return COURSE_COLOR_SCHEMES[index];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onBack,
  userKey = 'guest',
  isShariaMajor = true,
  isGuest = false,
  onRequestAuth,
}) => {
  // Mode: Upload image/file OR interactive table
  const [activeTab, setActiveTab] = useState<'interactive' | 'upload'>('interactive');

  // Timetable display mode: 'grid' (Weekly Grid Timetable) OR 'list' (Day grouped cards)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const scheduleStorageKey = `sabeel_schedule_items_${userKey}`;
  const imageStorageKey = `sabeel_schedule_image_${userKey}`;

  // Schedule items state (persisted in localStorage per account)
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(scheduleStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return isShariaMajor ? DEFAULT_SHARIA_SCHEDULE_ITEMS : DEFAULT_GENERAL_SCHEDULE_ITEMS;
  });

  // Uploaded schedule image / file state (persisted in localStorage per account)
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(imageStorageKey) || null;
    } catch {
      return null;
    }
  });

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLectureForDetails, setSelectedLectureForDetails] = useState<ScheduleItem | null>(null);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const [previewZoom, setPreviewZoom] = useState(false);
  const [isParsingSchedule, setIsParsingSchedule] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // New item form state (supports selecting multiple days at once!)
  const [selectedDays, setSelectedDays] = useState<(typeof DAYS)[number][]>(['الأحد']);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('08:00 ص - 09:30 ص');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newInstructor, setNewInstructor] = useState('');

  // Edit item form state
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editInstructor, setEditInstructor] = useState('');
  const [editDay, setEditDay] = useState<(typeof DAYS)[number]>('الأحد');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(scheduleStorageKey, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items, scheduleStorageKey]);

  const toggleSelectedDay = (day: (typeof DAYS)[number]) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.length > 1 ? prev.filter((d) => d !== day) : prev;
      }
      return [...prev, day];
    });
  };

  // Handle schedule image/PDF upload AND automatic AI extraction into weekly days
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScheduleNotice(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        setUploadedImage(dataUrl);
        try {
          localStorage.setItem(imageStorageKey, dataUrl);
        } catch (err) {
          console.error(err);
        }
      }

      const base64Only = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setIsParsingSchedule(true);
      setActiveTab('interactive');

      try {
        const res = await fetch('/api/gemini/parse-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Only,
            mimeType: file.type || 'image/png',
            isShariaMajor,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const parsedList: ScheduleItem[] = Array.isArray(data.items) ? data.items : [];
          if (parsedList.length > 0) {
            setItems(parsedList);
            setSelectedDayFilter('all');
            setScheduleNotice({
              type: 'success',
              text: `تم قراءة الجدول المرفق بنجاح وتوزيع ${parsedList.length} محاضرات تلقائياً على أيام الأسبوع!`,
            });
          } else {
            setScheduleNotice({
              type: 'error',
              text: 'تم حفظ صورة الجدول، ولكن لم نتمكن من قراءة المحاضرات تلقائياً منها. يمكنكِ إضافة المواد يدوياً من زر «إضافة مادة / محاضرة للجدول».',
            });
          }
        } else {
          setScheduleNotice({
            type: 'error',
            text: 'تم حفظ ملف الجدول، ويمكنكِ إضافة أو تعديل المواد يدوياً في الجدول التفاعلي.',
          });
        }
      } catch (err) {
        console.error('Schedule parse error:', err);
        setScheduleNotice({
          type: 'error',
          text: 'تم حفظ صورة الجدول، ويمكنكِ إضافة المواد يدوياً عبر زر «إضافة مادة / محاضرة للجدول».',
        });
      } finally {
        setIsParsingSchedule(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedImage = () => {
    setUploadedImage(null);
    localStorage.removeItem(imageStorageKey);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لإضافة المحاضرات للجدول الدراسي.');
      return;
    }
    if (!newTitle.trim()) return;

    const daysToAdd: (typeof DAYS)[number][] =
      selectedDays.length > 0 ? selectedDays : ['الأحد'];

    const createdItems: ScheduleItem[] = daysToAdd.map((dayName, idx) => ({
      id: `sch_${Date.now()}_${idx}`,
      day: dayName,
      title: newTitle.trim(),
      time: newTime.trim() || '08:00 ص - 09:30 ص',
      courseCode: newCourseCode.trim(),
      location: newLocation.trim() || 'قاعة المحاضرات',
      instructor: newInstructor.trim() || '',
      type: 'محاضرة',
    }));

    setItems((prev) => [...createdItems, ...prev]);
    setShowAddModal(false);
    setActiveTab('interactive');
    if (daysToAdd.length === 1 && selectedDayFilter !== 'all') {
      setSelectedDayFilter(daysToAdd[0]);
    } else {
      setSelectedDayFilter('all');
    }

    setScheduleNotice({
      type: 'success',
      text: `تمت إضافة «${newTitle.trim()}» وتوزيعها في الجدول ليوم (${daysToAdd.join('، ')}) بنجاح.`,
    });

    setNewTitle('');
    setNewCourseCode('');
    setNewLocation('');
    setNewInstructor('');
    setSelectedDays(['الأحد']);
  };

  const handleOpenEditModal = (item: ScheduleItem) => {
    if (isGuest) {
      onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لتعديل الجدول الدراسي.');
      return;
    }
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTime(item.time);
    setEditCourseCode(item.courseCode || '');
    setEditLocation(item.location || '');
    setEditInstructor(item.instructor || '');
    setEditDay(item.day as (typeof DAYS)[number]);
    setSelectedLectureForDetails(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لتعديل الجدول الدراسي.');
      return;
    }
    if (!editingItem || !editTitle.trim()) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              title: editTitle.trim(),
              time: editTime.trim() || '08:00 ص - 09:30 ص',
              courseCode: editCourseCode.trim(),
              location: editLocation.trim() || 'قاعة المحاضرات',
              instructor: editInstructor.trim() || '',
              day: editDay,
            }
          : it
      )
    );

    setScheduleNotice({
      type: 'success',
      text: `تم تحديث بيانات المحاضرة «${editTitle.trim()}» بنجاح.`,
    });
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (isGuest) {
      onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لحذف وتعديل المحاضرات.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedLectureForDetails?.id === id) {
      setSelectedLectureForDetails(null);
    }
  };

  const handleClearAllItems = () => {
    if (isGuest) {
      onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لتعديل الجدول الدراسي.');
      return;
    }
    setItems([]);
    setSelectedLectureForDetails(null);
    setScheduleNotice({
      type: 'success',
      text: 'تم تفريغ الجدول الأسبوعي، يمكنكِ الآن إضافة موادكِ يدوياً أو إرفاق صورة الجدول.',
    });
  };

  const filteredItems = items.filter(
    (item) => selectedDayFilter === 'all' || item.day === selectedDayFilter
  );

  return (
    <div className="space-y-6 text-right animate-fade-in max-w-5xl mx-auto w-full px-2 sm:px-4">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#2e493b] transition-colors cursor-pointer group"
        >
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          <span>العودة للرئيسية</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            disabled={isParsingSchedule}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-white border border-[#2e493b]/20 hover:bg-[#f0f4f1] text-[#2e493b] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {isParsingSchedule ? 'جاري قراءة وتوزيع الجدول...' : 'إرفاق الجدول وتوزيعه تلقائياً'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مادة / محاضرة يدوياً</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#20352a] font-cairo">
              الجدول الدراسي الأكاديمي
            </h1>
            <p className="text-xs text-stone-500">
              عند إرفاق صورة أو ملف الجدول يقوم النظام بقراءته وتوزيع المحاضرات تلقائياً على أيام الأسبوع، كما يمكنكِ إضافة المواد يدوياً واختيار أيامها.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Tab switch between interactive table and uploaded image */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('interactive')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'interactive'
                  ? 'bg-[#2e493b] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>الجدول الموزع على الأيام ({items.length} محاضرات)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-[#2e493b] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>
                {uploadedImage ? 'صورة الجدول المرفقة' : 'معاينة / رفع صورة الجدول'}
              </span>
            </button>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllItems}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ الجدول</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Banner when AI is parsing uploaded schedule */}
      {isParsingSchedule && (
        <div className="bg-white rounded-3xl border border-[#2e493b]/20 p-6 text-center space-y-2.5 shadow-2xs animate-fade-in">
          <div className="w-8 h-8 border-3 border-[#2e493b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#20352a]">
            جاري قراءة الجدول المرفق وتوزيع المحاضرات على أيام الأسبوع (الأحد - الخميس)...
          </p>
          <p className="text-xs text-stone-500">
            يتم استخراج أسماء المواد والأوقات والقاعات ووضع كل محاضرة في يومها المخصص.
          </p>
        </div>
      )}

      {/* Status Notice */}
      {scheduleNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-fade-in ${
            scheduleNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {scheduleNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{scheduleNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduleNotice(null)}
            className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. خيار استعراض صورة أو ملف الجدول المرفوع                                  */}
      {/* ========================================================================= */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#20352a]">
              صورة الجدول الدراسي المرفقة
            </h3>
            {uploadedImage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(true)}
                  className="px-3 py-1.5 bg-[#f0f4f1] hover:bg-stone-200 text-[#20352a] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>تكبير الصورة</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveUploadedImage}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الصورة</span>
                </button>
              </div>
            )}
          </div>

          {uploadedImage ? (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50 p-2 text-center">
              <img
                src={uploadedImage}
                alt="الجدول الدراسي المرفوع"
                className="max-h-[500px] w-auto mx-auto rounded-xl object-contain shadow-xs cursor-pointer"
                onClick={() => setPreviewZoom(true)}
              />
              <p className="text-[11px] text-stone-400 mt-2">
                انقري على الصورة لتكبيرها، وقد تم توزيع المحاضرات المستخرجة منها في تبويب «الجدول الموزع على الأيام».
              </p>
            </div>
          ) : (
            <div className="py-16 border-2 border-dashed border-stone-200 rounded-2xl text-center space-y-3 bg-[#fdfdfc]">
              <div className="w-14 h-14 rounded-2xl bg-[#e8eee9] text-[#2e493b] flex items-center justify-center mx-auto">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#20352a]">
                  أرفقي صورة أو ملف PDF لجدولكِ الدراسي
                </h4>
                <p className="text-xs text-stone-500">
                  سيقوم النظام بقراءة الجدول وتوزيع المحاضرات تلقائياً على أيام الأسبوع (الأحد - الخميس).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isGuest) {
                    onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لإرفاق وتعديل جدولك الدراسي.');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>إرفاق الجدول وتوزيع المحاضرات على الأيام</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. خيار الجدول التفاعلي الأسبوعي (شبكة الجدول الأسبوعي / عرض القوائم)      */}
      {/* ========================================================================= */}
      {activeTab === 'interactive' && (
        <div className="space-y-4">
          {/* View Toggle Bar (Weekly Grid vs List View) & Quick Add */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl border border-[#2e493b]/15 p-2 sm:p-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-[#2e493b] text-white shadow-2xs'
                    : 'bg-[#f4f7f4] text-stone-600 hover:bg-[#e8eee9]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>شبكة الجدول الأسبوعي (Grid)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-[#2e493b] text-white shadow-2xs'
                    : 'bg-[#f4f7f4] text-stone-600 hover:bg-[#e8eee9]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>عرض القوائم (List)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                إجمالي المحاضرات: {items.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isGuest) {
                    onRequestAuth?.('يرجى تسجيل الدخول أو إنشاء حساب لإضافة المحاضرات للجدول الدراسي.');
                    return;
                  }
                  setSelectedDays(['الأحد']);
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة محاضرة</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* A) شبكة جدول المحاضرات الأسبوعي الجامعي (Weekly Timetable Grid View)        */}
          {/* ========================================================================= */}
          {viewMode === 'grid' && (
            <div className="bg-white rounded-3xl border border-[#2e493b]/15 shadow-2xs overflow-hidden">
              {/* Responsive horizontal scroll container for iPad / Tablets */}
              <div className="overflow-x-auto select-none" dir="rtl">
                <div className="min-w-[840px]">
                  {/* Grid Header: Sticky Days Axis */}
                  <div className="grid grid-cols-[85px_repeat(5,1fr)] border-b border-[#2e493b]/15 bg-[#f6f9f6] sticky top-0 z-30">
                    {/* Corner: Sticky Time Axis Header */}
                    <div className="p-3 text-center border-l border-stone-200/80 sticky right-0 bg-[#f6f9f6] z-40 flex items-center justify-center gap-1 shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-[#2e493b]" />
                      <span className="text-xs font-bold text-[#20352a]">الوقت</span>
                    </div>

                    {/* 5 Days Columns Header (الأحد إلى الخميس) */}
                    {DAYS.map((dayName) => {
                      const dayCount = items.filter((it) => it.day === dayName).length;
                      return (
                        <div
                          key={dayName}
                          className="p-3 text-center border-l last:border-l-0 border-stone-200/80 flex items-center justify-between px-3"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#20352a]">
                              {dayName}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-[#2e493b] border border-stone-200 shadow-2xs">
                              {dayCount}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDays([dayName]);
                              setShowAddModal(true);
                            }}
                            title={`إضافة محاضرة في يوم ${dayName}`}
                            className="w-5 h-5 rounded-md bg-white hover:bg-[#2e493b] text-stone-500 hover:text-white border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Body: Hours Rows & Proportional Lecture Blocks */}
                  <div
                    className="grid grid-cols-[85px_repeat(5,1fr)] relative"
                    style={{ height: `${GRID_HOURS.length * HOUR_ROW_HEIGHT}px` }}
                  >
                    {/* Sticky Time Column (right side in RTL) */}
                    <div className="border-l border-stone-200/80 sticky right-0 bg-[#fbfdfb] z-20 shadow-2xs">
                      {GRID_HOURS.map((slot, idx) => (
                        <div
                          key={slot.hour}
                          style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                          className="border-b border-stone-100 flex items-start justify-center pt-2"
                        >
                          <span
                            className="font-mono text-[11px] font-bold text-stone-500"
                            dir="ltr"
                          >
                            {slot.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 5 Days Grid Columns with lecture cards */}
                    {DAYS.map((dayName) => {
                      const dayLectures = items.filter((it) => it.day === dayName);

                      return (
                        <div
                          key={dayName}
                          className="relative border-l last:border-l-0 border-stone-200/70 bg-white"
                        >
                          {/* Background Hour Guidelines */}
                          {GRID_HOURS.map((slot) => (
                            <div
                              key={slot.hour}
                              style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                              className="border-b border-dashed border-stone-100 w-full"
                            />
                          ))}

                          {/* Render Lecture Blocks */}
                          {dayLectures.map((lec) => {
                            const { startMinutes, endMinutes } = parseLectureTimeRange(lec.time);
                            const startOffsetMin = Math.max(0, startMinutes - 8 * 60);
                            const durationMin = Math.max(35, Math.min(300, endMinutes - startMinutes));
                            const topPx = (startOffsetMin / 60) * HOUR_ROW_HEIGHT;
                            const heightPx = Math.max(54, (durationMin / 60) * HOUR_ROW_HEIGHT);

                            const colorTheme = getCourseColor(lec.courseCode || lec.title);

                            return (
                              <div
                                key={lec.id}
                                onClick={() => setSelectedLectureForDetails(lec)}
                                style={{
                                  top: `${topPx + 2}px`,
                                  height: `${heightPx - 4}px`,
                                  left: '4px',
                                  right: '4px',
                                }}
                                className={`absolute rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 transition-all cursor-pointer shadow-2xs hover:shadow-md hover:z-20 flex flex-col justify-between overflow-hidden group ${colorTheme.card} ${colorTheme.accentBorder}`}
                              >
                                <div>
                                  {/* Block Top: Code Badge + Time Range */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    {lec.courseCode ? (
                                      <span
                                        className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${colorTheme.badge}`}
                                      >
                                        {lec.courseCode}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-700">
                                        محاضرة
                                      </span>
                                    )}

                                    <span
                                      className={`font-mono text-[9px] sm:text-[10px] font-bold ${colorTheme.timeText} truncate`}
                                      dir="ltr"
                                    >
                                      {lec.time}
                                    </span>
                                  </div>

                                  {/* Title: Academic Font */}
                                  <h4 className="text-[11px] sm:text-xs font-bold leading-tight line-clamp-2">
                                    {lec.title}
                                  </h4>
                                </div>

                                {/* Block Bottom: Location & Quick Action Hint */}
                                <div className="mt-1 flex items-center justify-between text-[9px] sm:text-[10px] opacity-90 border-t border-black/5 pt-1">
                                  {lec.location && (
                                    <div className="flex items-center gap-1 truncate max-w-[80%]">
                                      <MapPin className={`w-2.5 h-2.5 shrink-0 ${colorTheme.iconText}`} />
                                      <span className="truncate">{lec.location}</span>
                                    </div>
                                  )}

                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <Eye className="w-3 h-3 text-[#2e493b]" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* B) عرض القوائم (List View) الموزعة على الأيام                              */}
          {/* ========================================================================= */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Day Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDayFilter === 'all'
                      ? 'bg-[#2e493b] text-white shadow-2xs'
                      : 'bg-white border border-[#2e493b]/15 text-stone-600 hover:bg-[#f0f4f1]'
                  }`}
                >
                  كامل الأسبوع ({items.length})
                </button>
                {DAYS.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      selectedDayFilter === day
                        ? 'bg-[#2e493b] text-white shadow-2xs'
                        : 'bg-white border border-[#2e493b]/15 text-stone-600 hover:bg-[#f0f4f1]'
                    }`}
                  >
                    {day} ({items.filter((i) => i.day === day).length})
                  </button>
                ))}
              </div>

              {/* Grouped by Day when viewing 'all', or specific day cards */}
              {selectedDayFilter === 'all' ? (
                <div className="space-y-4">
                  {DAYS.map((dayName) => {
                    const dayLectures = items.filter((item) => item.day === dayName);
                    return (
                      <div
                        key={dayName}
                        className="bg-white rounded-3xl border border-[#2e493b]/15 p-5 shadow-2xs space-y-3.5"
                      >
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-[#2e493b] text-white text-xs font-bold">
                              يوم {dayName}
                            </span>
                            <span className="text-xs text-stone-500 font-semibold">
                              ({dayLectures.length} {dayLectures.length === 1 ? 'محاضرة' : 'محاضرات'})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDays([dayName]);
                              setShowAddModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#e8eee9] hover:bg-[#2e493b] text-[#2e493b] hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة في {dayName}</span>
                          </button>
                        </div>

                        {dayLectures.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {dayLectures.map((item) => {
                              const colorTheme = getCourseColor(item.courseCode || item.title);
                              return (
                                <div
                                  key={item.id}
                                  className="p-4 rounded-2xl border border-stone-200/80 bg-[#fcfdfb] hover:border-[#2e493b]/30 transition-all flex flex-col justify-between space-y-2.5 group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h3 className="text-sm sm:text-base font-bold text-[#20352a]">
                                        {item.title}
                                      </h3>
                                      {item.instructor && (
                                        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                                          <UserCheck className="w-3 h-3 text-stone-400" />
                                          <span>{item.instructor}</span>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {item.courseCode && (
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${colorTheme.badge}`}>
                                          {item.courseCode}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(item)}
                                        title="تعديل المحاضرة"
                                        className="text-stone-400 hover:text-[#2e493b] transition-colors cursor-pointer p-1 rounded-lg hover:bg-[#e8eee9]"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        title="حذف المحاضرة"
                                        className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-[#2e493b]">
                                      <Clock className="w-3.5 h-3.5 text-[#3a5d4a]" />
                                      <span>{item.time}</span>
                                    </div>
                                    {item.location && (
                                      <div className="flex items-center gap-1 text-[11px] text-stone-500">
                                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                                        <span>{item.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 py-2 text-center">
                            لا توجد محاضرات مضافة ليوم {dayName}.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => {
                    const colorTheme = getCourseColor(item.courseCode || item.title);
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#2e493b]/15 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white bg-[#2e493b] px-2.5 py-0.5 rounded-lg">
                              {item.day}
                            </span>
                            {item.courseCode && (
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${colorTheme.badge}`}>
                                {item.courseCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              title="تعديل"
                              className="text-stone-400 hover:text-[#2e493b] transition-colors cursor-pointer p-1 rounded-lg hover:bg-[#e8eee9]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              title="حذف من الجدول"
                              className="text-stone-300 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-[#20352a] group-hover:text-[#2e493b] transition-colors">
                            {item.title}
                          </h3>
                          {item.instructor && (
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                              <span>{item.instructor}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-[#2e493b]">
                            <Clock className="w-3.5 h-3.5 text-[#3a5d4a]" />
                            <span>{item.time}</span>
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full bg-white rounded-2xl border border-dashed border-stone-200 p-12 text-center text-xs text-stone-400">
                      لا توجد محاضرات مجدولة لهذا اليوم. يمكنكِ إضافة مادة جديدة عبر زر «إضافة محاضرة».
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Class Modal (Supports manual course addition across one or multiple days) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs text-right animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-[#20352a]">
                إضافة مادة / محاضرة يدوياً للجدول
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  اسم المقرر / المادة الدراسية <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: فقه المعاملات المالية"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  أيام المحاضرة (يمكنكِ اختيار يوم أو أكثر لتوزيعها):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const active = selectedDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleSelectedDay(d)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          active
                            ? 'bg-[#2e493b] text-white border-[#2e493b] shadow-2xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  وقت المحاضرة:
                </label>
                <input
                  type="text"
                  placeholder="مثال: 08:00 ص - 09:30 ص"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    القاعة / الموقع <span className="text-stone-400 font-normal">(اختياري)</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: قاعة 102"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    دكتور المادة <span className="text-stone-400 font-normal">(اختياري)</span>:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: د. أحمد المنصور"
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة وتوزيع في الجدول</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lecture Details Modal (عند النقر على بلوك المحاضرة) */}
      {selectedLectureForDetails && (
        <div
          onClick={() => setSelectedLectureForDetails(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs text-right animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#2e493b] text-white text-xs font-bold">
                    {selectedLectureForDetails.day}
                  </span>
                  {selectedLectureForDetails.courseCode && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#e8eee9] text-[#2e493b] text-xs font-bold">
                      {selectedLectureForDetails.courseCode}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#20352a]">
                  {selectedLectureForDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLectureForDetails(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#f6f9f6] border border-[#2e493b]/10 flex items-center justify-between">
                <span className="text-stone-500 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#2e493b]" />
                  <span>توقيت المحاضرة:</span>
                </span>
                <span className="font-mono font-bold text-[#20352a]" dir="ltr">
                  {selectedLectureForDetails.time}
                </span>
              </div>

              {selectedLectureForDetails.location && (
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-stone-500" />
                    <span>القاعة / الموقع:</span>
                  </span>
                  <span className="font-bold text-[#20352a]">
                    {selectedLectureForDetails.location}
                  </span>
                </div>
              )}

              {selectedLectureForDetails.instructor && (
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-stone-500" />
                    <span>أستاذ المقرر:</span>
                  </span>
                  <span className="font-bold text-[#20352a]">
                    {selectedLectureForDetails.instructor}
                  </span>
                </div>
              )}
            </div>

            {/* Actions: Edit or Delete */}
            <div className="pt-3 flex items-center justify-between gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleDeleteItem(selectedLectureForDetails.id)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المحاضرة</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedLectureForDetails)}
                  className="px-4 py-2 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل البيانات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lecture Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs text-right animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#2e493b]/15 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-[#20352a]">
                تعديل بيانات المحاضرة
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  اسم المقرر الدراسـي <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none text-[#20352a] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    اليوم الدراسي:
                  </label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none font-bold text-[#20352a]"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    رمز المقرر:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شرح 101"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  توقيت المحاضرة:
                </label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="08:00 ص - 09:30 ص"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    القاعة / الموقع:
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    أستاذ المقرر:
                  </label>
                  <input
                    type="text"
                    value={editInstructor}
                    onChange={(e) => setEditInstructor(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-[#2e493b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
