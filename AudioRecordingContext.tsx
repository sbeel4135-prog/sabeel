import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Course } from '../types';

export interface LectureSummaryData {
  mainTopics: string[];
  scientificIssues: string[];
  benefitsAndRules: string[];
}

export interface LectureRecordItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  sourceType: 'recording' | 'upload';
  transcript?: string;
  summary?: LectureSummaryData;
}

interface AudioRecordingContextValue {
  isRecording: boolean;
  recordingCourse: Course | null;
  recordingTitle: string;
  setRecordingTitle: (title: string) => void;
  recordingSeconds: number;
  recordingError: string | null;
  clearRecordingError: () => void;
  isSummarizingGlobal: boolean;
  summarizingCourseId: string | null;
  summarizingLectureId: string | null;
  startRecording: (course: Course, customTitle?: string) => Promise<void>;
  stopRecording: () => void;
  summarizeAndSaveLecture: (
    courseId: string,
    lec: LectureRecordItem,
    overrideBase64?: string,
    overrideMimeType?: string
  ) => Promise<LectureRecordItem | null>;
  lecturesRevision: number;
}

const AudioRecordingContext = createContext<AudioRecordingContextValue | null>(null);

export const useAudioRecording = (): AudioRecordingContextValue => {
  const ctx = useContext(AudioRecordingContext);
  if (!ctx) {
    throw new Error('useAudioRecording must be used within AudioRecordingProvider');
  }
  return ctx;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getSupportedMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

export function getCourseLecturesFromStorage(courseId: string): LectureRecordItem[] {
  try {
    const raw = localStorage.getItem(`sabeel_lectures_v2_${courseId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading course lectures:', e);
  }
  return [];
}

export function saveCourseLecturesToStorage(courseId: string, list: LectureRecordItem[]) {
  try {
    const serializable = list.map(({ audioBase64, ...rest }) => rest);
    localStorage.setItem(`sabeel_lectures_v2_${courseId}`, JSON.stringify(serializable));
  } catch (e) {
    console.error('Error saving course lectures:', e);
  }
}

export const AudioRecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCourse, setRecordingCourse] = useState<Course | null>(null);
  const [recordingTitle, setRecordingTitleState] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isSummarizingGlobal, setIsSummarizingGlobal] = useState(false);
  const [summarizingCourseId, setSummarizingCourseId] = useState<string | null>(null);
  const [summarizingLectureId, setSummarizingLectureId] = useState<string | null>(null);
  const [lecturesRevision, setLecturesRevision] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const recordingCourseRef = useRef<Course | null>(null);
  const recordingTitleRef = useRef<string>('');

  const setRecordingTitle = useCallback((title: string) => {
    setRecordingTitleState(title);
    recordingTitleRef.current = title;
  }, []);

  const clearRecordingError = useCallback(() => {
    setRecordingError(null);
  }, []);

  // Prevent accidental tab close or reload while recording is active
  useEffect(() => {
    if (!isRecording) {
      window.onbeforeunload = null;
      return;
    }

    const warningMessage =
      'تنبيه: التسجيل قيد التشغيل حالياً، مغادرة الصفحة ستؤدي لإيقاف وفقدان التسجيل الحالي';

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = warningMessage;
      return warningMessage;
    };

    window.onbeforeunload = handleBeforeUnload;
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.onbeforeunload = null;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording]);

  // Transcribe and summarize lecture and persist to localStorage
  const summarizeAndSaveLecture = useCallback(
    async (
      courseId: string,
      lec: LectureRecordItem,
      overrideBase64?: string,
      overrideMimeType?: string
    ): Promise<LectureRecordItem | null> => {
      setIsSummarizingGlobal(true);
      setSummarizingCourseId(courseId);
      setSummarizingLectureId(lec.id);
      setRecordingError(null);

      try {
        let base64ToUse = overrideBase64 || lec.audioBase64 || '';
        const mimeToUse = overrideMimeType || lec.mimeType || 'audio/webm';

        if (!base64ToUse && lec.audioUrl && !lec.transcript) {
          try {
            const blobRes = await fetch(lec.audioUrl);
            const blob = await blobRes.blob();
            base64ToUse = await blobToBase64(blob);
          } catch {
            // ignore
          }
        }

        const res = await fetch('/api/gemini/transcribe-and-summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64ToUse || undefined,
            mimeType: mimeToUse,
            existingTranscript: lec.transcript || undefined,
          }),
        });

        if (!res.ok) throw new Error('فشل التفريغ والتلخيص');
        const data = await res.json();

        // Read latest lectures from storage so any title edits aren't overwritten
        const currentList = getCourseLecturesFromStorage(courseId);
        const latestItem = currentList.find((item) => item.id === lec.id) || lec;

        const updatedLec: LectureRecordItem = {
          ...latestItem,
          audioUrl: lec.audioUrl || latestItem.audioUrl,
          transcript: data.transcript || 'لم يتم رصد كلام مسموع وواضح في التسجيل.',
          summary: {
            mainTopics: data.summary?.mainTopics || ['لم ترد محاور في التسجيل.'],
            scientificIssues:
              data.summary?.scientificIssues || ['لم تُذكر مسائل علمية أو فقهية في التسجيل.'],
            benefitsAndRules:
              data.summary?.benefitsAndRules || ['لم ترد فوائد أو ضوابط في التسجيل.'],
          },
        };

        const existsInStorage = currentList.some((item) => item.id === lec.id);
        const newList = existsInStorage
          ? currentList.map((item) => (item.id === lec.id ? updatedLec : item))
          : [updatedLec, ...currentList];

        saveCourseLecturesToStorage(courseId, newList);
        setLecturesRevision((r) => r + 1);
        return updatedLec;
      } catch (err) {
        console.error(err);
        setRecordingError(
          'حدث خطأ أثناء تفريغ وتلخيص الصوت. يرجى التأكد من وضوح الصوت والمحاولة مجدداً.'
        );
        return null;
      } finally {
        setIsSummarizingGlobal(false);
        setSummarizingCourseId(null);
        setSummarizingLectureId(null);
      }
    },
    []
  );

  const startRecording = useCallback(
    async (course: Course, customTitle?: string) => {
      setRecordingError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setRecordingError(
            'متصفحك الحالي لا يدعم ميزة تسجيل الصوت المباشر. يمكنك رفع ملف صوتي جاهز.'
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        recordingSecondsRef.current = 0;
        setRecordingSeconds(0);
        setRecordingCourse(course);
        recordingCourseRef.current = course;

        if (customTitle !== undefined) {
          setRecordingTitleState(customTitle);
          recordingTitleRef.current = customTitle;
        }

        const mimeType = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find(
          (type) =>
            typeof MediaRecorder !== 'undefined' &&
            typeof MediaRecorder.isTypeSupported === 'function' &&
            MediaRecorder.isTypeSupported(type)
        );

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          stream.getTracks().forEach((track) => track.stop());
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }

          const targetCourse = recordingCourseRef.current || course;
          const dateStr = new Date().toLocaleDateString('ar-SA');
          const defaultLectureName = `محاضرة ${targetCourse.title} - ${dateStr}`;
          const finalTitle = recordingTitleRef.current.trim() || defaultLectureName;

          const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
          const audioUrl = URL.createObjectURL(audioBlob);

          const totalSecs = Math.max(1, recordingSecondsRef.current);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          const durStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

          let base64Data = '';
          try {
            base64Data = await blobToBase64(audioBlob);
          } catch (err) {
            console.error('Error converting audio blob to base64:', err);
          }

          const newLec: LectureRecordItem = {
            id: `rec_${Date.now()}`,
            title: finalTitle,
            date: dateStr,
            duration: durStr,
            audioUrl,
            audioBase64: base64Data,
            mimeType: finalMimeType,
            sourceType: 'recording',
          };

          const existingLectures = getCourseLecturesFromStorage(targetCourse.id);
          const updatedLectures = [newLec, ...existingLectures];
          saveCourseLecturesToStorage(targetCourse.id, updatedLectures);

          setIsRecording(false);
          setRecordingSeconds(0);
          setRecordingTitleState('');
          recordingTitleRef.current = '';
          setLecturesRevision((r) => r + 1);

          await summarizeAndSaveLecture(targetCourse.id, newLec, base64Data, finalMimeType);
        };

        recorder.start(500);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = setInterval(() => {
          recordingSecondsRef.current += 1;
          setRecordingSeconds(recordingSecondsRef.current);
        }, 1000);
      } catch (err: any) {
        console.error('Mic error:', err?.name, err?.message);
        setIsRecording(false);
        const isPermissionDenied =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        setRecordingError(
          isPermissionDenied
            ? 'تعذر الوصول إلى الميكروفون. يرجى السماح بإذن استخدام الميكروفون في المتصفح ثم المحاولة مرة أخرى.'
            : (err?.message || 'تعذر تشغيل الميكروفون.')
        );
      }
    },
    [summarizeAndSaveLecture]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  }, []);

  return (
    <AudioRecordingContext.Provider
      value={{
        isRecording,
        recordingCourse,
        recordingTitle,
        setRecordingTitle,
        recordingSeconds,
        recordingError,
        clearRecordingError,
        isSummarizingGlobal,
        summarizingCourseId,
        summarizingLectureId,
        startRecording,
        stopRecording,
        summarizeAndSaveLecture,
        lecturesRevision,
      }}
    >
      {children}
    </AudioRecordingContext.Provider>
  );
};
