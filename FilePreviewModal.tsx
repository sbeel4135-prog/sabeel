import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Download,
  BookOpen,
  FileText,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Share2,
} from 'lucide-react';

export const FilePreviewModal: React.FC = () => {
  const { previewFile, setPreviewFile, incrementFileDownload, showToast, setActiveView } = useApp();
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  if (!previewFile) return null;

  const handleDownload = () => {
    incrementFileDownload(previewFile.id);

    // Create a mock downloadable blob with preview content or file details
    const content = previewFile.previewText || `مستند: ${previewFile.title}\nالمقرر: ${previewFile.courseTitle}\nالجامعة: جامعة الشريعة`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = previewFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`بدأ تحميل ملف "${previewFile.fileName}" بنجاح`, 'success');
  };

  const handleCopyText = () => {
    if (previewFile.previewText) {
      navigator.clipboard.writeText(previewFile.previewText);
      setCopied(true);
      showToast('تم نسخ النص إلى الحافظة', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAskAIAboutFile = () => {
    setPreviewFile(null);
    setActiveView('ai-assistant');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] text-right">
        {/* Header */}
        <div className="bg-[#14532d] text-white p-5 flex items-start justify-between">
          <button
            onClick={() => setPreviewFile(null)}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-end text-xs text-emerald-200">
              <span>{previewFile.courseTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{previewFile.category === 'book' ? 'كتاب معتمد' : previewFile.category === 'summary' ? 'ملخص دراسي' : previewFile.category === 'audio' ? 'تسجيل صوتي' : 'وثيقة'}</span>
            </div>
            <h3 className="text-lg font-bold">{previewFile.title}</h3>
            <p className="text-xs text-emerald-100/70">{previewFile.fileName} · {previewFile.fileSize}</p>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-stone-50/50">
          {previewFile.description && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold">نبذة المشرف: </span>
              {previewFile.description}
            </div>
          )}

          {/* Audio Lecture Simulation */}
          {previewFile.fileFormat === 'audio' && (
            <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-mono">المدة: {previewFile.audioDuration || '35:00'}</span>
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#14532d]" />
                  مشغل المحاضرات الصوتية
                </span>
              </div>

              {/* Fake waveform / progress */}
              <div className="space-y-2">
                <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[#14532d] transition-all duration-300 ${
                      isPlaying ? 'w-2/5 animate-pulse' : 'w-1/12'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                  <span>{isPlaying ? '14:20' : '02:15'}</span>
                  <span>{previewFile.audioDuration || '42:15'}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1)}
                  className="px-2.5 py-1 text-xs font-mono bg-stone-100 text-stone-700 rounded-md hover:bg-stone-200 cursor-pointer"
                >
                  {playbackSpeed}x
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-6 py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isPlaying ? 'إيقاف مؤقت' : 'تشغيل المحاضرة الآن'}
                </button>
              </div>
            </div>
          )}

          {/* Text preview */}
          {previewFile.previewText ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
                <span className="font-semibold text-stone-800">معاينة النص من المرجع المعتمد:</span>
              </div>
              <div className="p-4 bg-white border border-stone-200 rounded-xl text-stone-800 font-amiri text-base sm:text-lg leading-loose whitespace-pre-line select-text max-h-80 overflow-y-auto">
                {previewFile.previewText}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-dashed border-stone-300 rounded-xl space-y-2">
              <FileText className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="text-sm font-medium text-stone-700">هذا الملف متاح للتحميل المباشر</p>
              <p className="text-xs text-stone-500">تم فحص الملف والتحقق من سلامته الأكاديمية بواسطة المشرف.</p>
            </div>
          )}

          {/* Metadata details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-stone-200">
            <div>
              <span className="text-stone-400 block text-[11px]">المشرف الناشر:</span>
              <span className="font-medium text-stone-800">{previewFile.uploadedBy}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">تاريخ الإضافة:</span>
              <span className="font-medium text-stone-800">{previewFile.uploadDate}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">مرات التحميل:</span>
              <span className="font-medium text-stone-800 tabular-nums">{previewFile.downloadCount}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">صيغة الملف:</span>
              <span className="font-medium text-stone-800 uppercase">{previewFile.fileFormat}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleAskAIAboutFile}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532d] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>اسأل المساعد الذكي عن هذا المقرر</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewFile(null)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف ({previewFile.fileSize})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
