import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  UploadCloud,
  FileText,
  File,
  CheckCircle2,
  AlertCircle,
  Music,
  Image as ImageIcon,
} from 'lucide-react';
import { FileCategory, FileFormat } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourseId?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, defaultCourseId }) => {
  const { courses, addFile, currentUser, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [category, setCategory] = useState<FileCategory>('summary');
  const [description, setDescription] = useState('');
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: globalThis.File) => {
    setFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSize(`${sizeInMb} MB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setFileFormat('pdf');
    else if (ext === 'docx' || ext === 'doc') setFileFormat('docx');
    else if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') setFileFormat('audio');
    else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') setFileFormat('image');

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Try reading sample text for preview if it is a text or markdown or small doc
    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewText(event.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      setPreviewText(`[مستند تم رفعه واعتماده]: ${file.name}\nالمحتوى معتمد لطلاب كلية الشريعة والدراسات الإسلامية.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !courseId || !fileName) {
      showToast('الرجاء اختيار الملف وإدخال عنوانه والمقرر التابع له', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    // Realistic upload simulation with progress increments
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            const course = courses.find((c) => c.id === courseId);
            addFile({
              courseId,
              courseTitle: course?.title || 'مقرر عام',
              title,
              fileName,
              fileFormat,
              category,
              fileSize: fileSize || '1.8 MB',
              uploadedBy: currentUser?.name || 'مشرف البوابة',
              description,
              previewText,
            });
            setIsUploading(false);
            setUploadProgress(0);
            onClose();
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-right">
        {/* Header */}
        <div className="bg-[#14532d] text-white p-5 flex items-start justify-between">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold">رفع مستند أو مقرر دراسي</h3>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              يدعم ملفات PDF، DOCX، الصور، والتسجيلات الصوتية بجودة عالية
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-[#14532d] bg-emerald-50/50'
                : fileName
                ? 'border-emerald-600 bg-emerald-50/20'
                : 'border-stone-300 hover:border-[#14532d] bg-stone-50/60'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf,.docx,.doc,.mp3,.wav,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            {fileName ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-stone-900">{fileName}</p>
                <p className="text-xs text-stone-500 tabular-nums">{fileSize} · اضغط لتغيير الملف</p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 text-stone-400 mx-auto" />
                <div>
                  <span className="text-xs font-semibold text-[#14532d]">انقر لاختيار ملف</span>
                  <span className="text-xs text-stone-500"> أو اسحبه وأفلته هنا</span>
                </div>
                <p className="text-[11px] text-stone-400">PDF, DOCX, MP3, PNG, JPG (حتى 50 ميغابايت)</p>
              </div>
            )}
          </div>

          {/* Title & Target Course */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                عنوان المستند / المرجع <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: ملخص كتاب الطهارة من الروض المربع"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:bg-white focus:border-[#14532d] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">المقرر المرتبط</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-[#14532d] focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">تصنيف المحتوى</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FileCategory)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-[#14532d] focus:outline-none"
                >
                  <option value="summary">ملخص دراسي</option>
                  <option value="book">كتاب / متن معتمد</option>
                  <option value="transcription">تفريغ محاضرة</option>
                  <option value="audio">تسجيل صوتي</option>
                  <option value="questions">بنك أسئلة وتطبيقات</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                نبذة توضيحية أو ملاحظات الطالب / المشرف
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="بيان أهم المباحث المشمولة في هذا الملف..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:border-[#14532d] focus:outline-none"
              />
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-stone-600">
                <span className="font-semibold text-[#14532d]">جاري التحقق وتشفير الملف...</span>
                <span className="tabular-nums font-mono">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#14532d] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUploading || !fileName}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#14532d] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isUploading ? 'جاري الرفع والاعتماد...' : 'اعتماد ورفع الملف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
