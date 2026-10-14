import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playCelebrationSound } from '../utils/soundEffects';
import {
  Bookmark,
  ChevronRight,
  ChevronLeft,
  List,
  Search,
  PenLine,
  Highlighter,
  PenTool,
  Eraser,
  Undo2,
  RotateCcw,
  X,
  Sparkles,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Check,
  CheckCircle2,
  Sliders,
  ChevronDown,
  Palette,
  HelpCircle,
  FileText,
  Loader2,
  SlidersHorizontal,
  Droplet,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Award,
  Hand,
  Shapes,
} from 'lucide-react';
import {
  createPdfLoadingTask,
  getCachedOrLoadPdfDocument,
  extractTextFromPdfDoc,
  extractTextFromSinglePage,
  extractAllPagesText,
  renderPdfPageToCanvas,
  renderPdfThumbnail,
  cleanDestroyPdf,
  renderPdfPageToBase64Jpeg,
} from '../utils/pdfViewerHelper';
import { getStoredBookPdfFile } from '../utils/bookStorage';
import {
  Point,
  RecognizedShape,
  drawSmoothedPath,
  drawRecognizedShape,
  recognizeShape,
  snapStraightLine,
} from '../utils/shapeRecognizer';

export interface BookBookmark {
  id: string;
  pageNumber: number;
  label: string;
  createdAt: string;
}

export interface BookInteractiveData {
  bookmarks: BookBookmark[];
  currentPage?: number;
  pageDrawings?: Record<number, string>; // Page number -> dataURL
  lastReadDate?: string;
}

interface InteractiveBookViewerProps {
  fileName: string;
  fileSize: string;
  uploadDate: string;
  bookPdfUrl: string | null;
  courseId: string;
  courseTitle: string;
  onAskAiAboutBook?: (selectedText: string) => void;
  onExtractedText?: (text: string) => void;
  onBack?: () => void;
}

/**
 * Tool configuration structure persisted per user
 */
interface ToolSettings {
  color: string;
  opacity: number; // percentage (15 to 100)
  width: number;
}

interface MarkupToolsConfig {
  highlighter: ToolSettings;
  pen: ToolSettings;
}

// Default settings: 39% opacity for highlighter (matching Apple Books screenshot 0.35 - 0.45)
// and 18px stroke width for natural text-line height highlighting
const DEFAULT_MARKUP_CONFIG: MarkupToolsConfig = {
  highlighter: {
    color: '#fde047', // Warm fluorescent yellow
    opacity: 39, // 39% matching Apple Books default
    width: 18, // 18px matching single text line height perfectly
  },
  pen: {
    color: '#1c1917', // Deep academic ink
    opacity: 100, // 100% opaque
    width: 3,
  },
};

const MARKUP_STORAGE_KEY = 'sabeel_markup_tool_settings_v3';

function loadSavedMarkupConfig(): MarkupToolsConfig {
  try {
    const raw = localStorage.getItem(MARKUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        highlighter: {
          color: parsed.highlighter?.color || DEFAULT_MARKUP_CONFIG.highlighter.color,
          opacity:
            typeof parsed.highlighter?.opacity === 'number'
              ? parsed.highlighter.opacity
              : DEFAULT_MARKUP_CONFIG.highlighter.opacity,
          width: parsed.highlighter?.width || DEFAULT_MARKUP_CONFIG.highlighter.width,
        },
        pen: {
          color: parsed.pen?.color || DEFAULT_MARKUP_CONFIG.pen.color,
          opacity:
            typeof parsed.pen?.opacity === 'number'
              ? parsed.pen.opacity
              : DEFAULT_MARKUP_CONFIG.pen.opacity,
          width: parsed.pen?.width || DEFAULT_MARKUP_CONFIG.pen.width,
        },
      };
    }
  } catch (e) {}
  return DEFAULT_MARKUP_CONFIG;
}

/**
 * Hex to RGBA helper for custom opacity and multiply blend
 */
function hexToRgba(hex: string, alpha: number = 0.39): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(253, 224, 71, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Quick Academic Color Swatches
 */
const HIGHLIGHTER_PRESETS = [
  { color: '#fde047', label: 'أصفر فسفوري' },
  { color: '#86efac', label: 'أخضر زمردي' },
  { color: '#7dd3fc', label: 'أزرق سماوي' },
  { color: '#fdba74', label: 'برتقالي مشرق' },
  { color: '#f472b6', label: 'وردي لطيف' },
  { color: '#c084fc', label: 'بنفسجي هادئ' },
];

const PEN_PRESETS = [
  { color: '#1c1917', label: 'أسود حبري' },
  { color: '#1d4ed8', label: 'أزرق ملكي' },
  { color: '#b91c1c', label: 'أحمر أكاديمي' },
  { color: '#047857', label: 'أخضر شجري' },
  { color: '#6b21a8', label: 'بنفسجي داكن' },
  { color: '#78350f', label: 'بني عسلي' },
];

/**
 * 5 Slanted Thickness Presets matching Apple Books (IMG_1057.jpeg)
 */
const HIGHLIGHTER_WIDTH_PRESETS = [
  { width: 12, label: 'رفيع جداً' },
  { width: 18, label: 'سطر قياسي' },
  { width: 24, label: 'متوسط' },
  { width: 30, label: 'عريض' },
  { width: 38, label: 'عريض جداً' },
];

const PEN_WIDTH_PRESETS = [
  { width: 1.5, label: 'دقيق' },
  { width: 3, label: 'قياسي' },
  { width: 5, label: 'متوسط' },
  { width: 8, label: 'عريض' },
  { width: 12, label: 'عريض جداً' },
];

/**
 * Miniature Page Card for Scrubber and Grid View
 */
interface ThumbnailCardProps {
  pdfDoc: any;
  pageNumber: number;
  isActive: boolean;
  isBookmarked: boolean;
  hasDrawings: boolean;
  onClick: () => void;
  variant?: 'strip' | 'grid';
}

const PdfThumbnailCard: React.FC<ThumbnailCardProps> = ({
  pdfDoc,
  pageNumber,
  isActive,
  isBookmarked,
  hasDrawings,
  onClick,
  variant = 'strip',
}) => {
  const containerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [shouldRender, setShouldRender] = useState(() => {
    return isActive;
  });

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      return;
    }
    if (shouldRender) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { root: variant === 'strip' ? el.parentElement : null, rootMargin: '80px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, isActive, variant]);

  useEffect(() => {
    let active = true;
    if (!shouldRender || !pdfDoc || !canvasRef.current) return;

    renderPdfThumbnail(pdfDoc, pageNumber, canvasRef.current, variant === 'strip' ? 62 : 160)
      .then(() => {
        if (active) setRendered(true);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [shouldRender, pdfDoc, pageNumber, variant]);

  if (variant === 'strip') {
    return (
      <button
        ref={containerRef}
        id={`thumb-scrubber-${pageNumber}`}
        type="button"
        onClick={onClick}
        className={`group relative shrink-0 flex flex-col items-center transition-all cursor-pointer rounded-lg p-0.5 ${
          isActive
            ? 'scale-105 ring-2 ring-black bg-white shadow-md z-10'
            : 'opacity-70 hover:opacity-100 hover:bg-white/80'
        }`}
        title={`صفحة ${pageNumber}`}
      >
        <div className="relative w-11 h-15 sm:w-12 sm:h-16 bg-white rounded-md border border-stone-200 overflow-hidden shadow-2xs flex items-center justify-center">
          <canvas ref={canvasRef} className="block max-w-full max-h-full mx-auto" />
          {!rendered && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-[9px] text-stone-400 font-bold">
              {pageNumber}
            </div>
          )}
          {isBookmarked && (
            <div className="absolute top-0 right-0.5 z-10">
              <Bookmark className="w-3 h-3 text-black fill-black drop-shadow-xs" />
            </div>
          )}
          {hasDrawings && (
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
        </div>
        <span
          className={`mt-0.5 text-[9px] font-bold ${
            isActive ? 'text-black' : 'text-stone-500'
          }`}
        >
          {pageNumber}
        </span>
      </button>
    );
  }

  // Grid View in Drawer
  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`group relative flex flex-col bg-white rounded-xl border transition-all cursor-pointer overflow-hidden p-2.5 shadow-2xs hover:shadow-md ${
        isActive
          ? 'ring-2 ring-black border-black bg-stone-50'
          : 'border-stone-200 hover:border-stone-400'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 text-xs font-bold text-stone-700">
        <span>صفحة {pageNumber}</span>
        {isBookmarked && <Bookmark className="w-3.5 h-3.5 fill-black text-black" />}
      </div>
      <div className="relative aspect-[3/4] w-full bg-stone-50 rounded-lg border border-stone-100 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="block max-w-full max-h-full mx-auto" />
        {!rendered && (
          <div className="text-[10px] text-stone-400 font-bold">صفحة {pageNumber}</div>
        )}
      </div>
    </div>
  );
};

export const InteractiveBookViewer: React.FC<InteractiveBookViewerProps> = ({
  fileName,
  fileSize,
  uploadDate,
  bookPdfUrl,
  courseId,
  courseTitle,
  onAskAiAboutBook,
  onExtractedText,
  onBack,
}) => {
  const storageKey = `sabeel_apple_books_v3_${courseId}`;
  const lastReadPageKey = `sabeel_last_page_${courseId}`;

  // Load saved state (Auto-resume reading)
  const loadInitialData = (): BookInteractiveData => {
    try {
      const savedLastPage = localStorage.getItem(lastReadPageKey);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (savedLastPage) {
          const p = parseInt(savedLastPage, 10);
          if (!isNaN(p) && p >= 1) parsed.currentPage = p;
        }
        return parsed;
      }
      const legacyV2 = localStorage.getItem(`sabeel_book_interactive_v2_${courseId}`);
      if (legacyV2) {
        const parsed = JSON.parse(legacyV2);
        if (savedLastPage) {
          const p = parseInt(savedLastPage, 10);
          if (!isNaN(p) && p >= 1) parsed.currentPage = p;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading book interactive data:', e);
    }
    const initialPage = Number(localStorage.getItem(lastReadPageKey)) || 1;
    return { bookmarks: [], currentPage: initialPage, pageDrawings: {} };
  };

  const [interactiveData, setInteractiveData] = useState<BookInteractiveData>(() =>
    loadInitialData()
  );

  // PDF.js State & Lifecycle Refs
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  const pdfDocRef = useRef<any | null>(null);
  const loadingTaskRef = useRef<any | null>(null);
  const renderTaskRef = useRef<any | null>(null);

  // Apple Books UI Bars Toggle (Tap in middle of screen)
  const [showUIBars, setShowUIBars] = useState<boolean>(true);

  // Tools & Settings: Load and persist per-user config
  const [markupConfig, setMarkupConfig] = useState<MarkupToolsConfig>(() => loadSavedMarkupConfig());
  const [isMarkupModeActive, setIsMarkupModeActive] = useState<boolean>(false);
  const [drawWithFinger, setDrawWithFinger] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sabeel_draw_with_finger') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDrawWithFinger = () => {
    setDrawWithFinger((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sabeel_draw_with_finger', String(next));
      } catch {}
      return next;
    });
  };

  const [activeTool, setActiveTool] = useState<'highlighter' | 'pen' | 'eraser'>('highlighter');
  const [showToolSettingsPopover, setShowToolSettingsPopover] = useState<boolean>(false);

  // Color picker hidden input ref
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  // Save tool settings to LocalStorage automatically whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(MARKUP_STORAGE_KEY, JSON.stringify(markupConfig));
    } catch (e) {}
  }, [markupConfig]);

  // Active Tool dynamic properties
  const activeToolConfig = activeTool === 'highlighter' ? markupConfig.highlighter : markupConfig.pen;
  const currentToolColor = activeToolConfig.color;
  const currentToolOpacity = activeToolConfig.opacity;
  const currentToolWidth = activeToolConfig.width;

  const updateCurrentColor = (color: string) => {
    setMarkupConfig((prev) => ({
      ...prev,
      [activeTool === 'highlighter' ? 'highlighter' : 'pen']: {
        ...prev[activeTool === 'highlighter' ? 'highlighter' : 'pen'],
        color,
      },
    }));
  };

  const updateCurrentOpacity = (opacity: number) => {
    setMarkupConfig((prev) => ({
      ...prev,
      [activeTool === 'highlighter' ? 'highlighter' : 'pen']: {
        ...prev[activeTool === 'highlighter' ? 'highlighter' : 'pen'],
        opacity,
      },
    }));
  };

  const updateCurrentWidth = (width: number) => {
    setMarkupConfig((prev) => ({
      ...prev,
      [activeTool === 'highlighter' ? 'highlighter' : 'pen']: {
        ...prev[activeTool === 'highlighter' ? 'highlighter' : 'pen'],
        width,
      },
    }));
  };

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);
  const strokeHistoryRef = useRef<string[]>([]);

  // Drawers & Popovers
  const [showContentsDrawer, setShowContentsDrawer] = useState<boolean>(false);
  const [contentsTab, setContentsTab] = useState<'grid' | 'bookmarks'>('grid');
  const [showDisplaySettings, setShowDisplaySettings] = useState<boolean>(false);
  const [showSearchPopover, setShowSearchPopover] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paperTone, setPaperTone] = useState<'white' | 'sepia' | 'gray'>('white');

  // =========================================================================
  // Pinch to Zoom & Smooth Pan Gesture State (ثبات طبقة الرسم والصفحة معاً)
  // =========================================================================
  const [zoomTransform, setZoomTransform] = useState<{ scale: number; panX: number; panY: number }>({
    scale: 1,
    panX: 0,
    panY: 0,
  });
  const zoomTransformRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const isPinchingRef = useRef<boolean>(false);
  const touchGestureRef = useRef<{
    initialDist: number;
    initialScale: number;
    initialPanX: number;
    initialPanY: number;
    initialMidX: number;
    initialMidY: number;
    touchCount: number;
    lastTapTime: number;
  }>({
    initialDist: 0,
    initialScale: 1,
    initialPanX: 0,
    initialPanY: 0,
    initialMidX: 0,
    initialMidY: 0,
    touchCount: 0,
    lastTapTime: 0,
  });

  // Strict Context Grounding: Page-Level Quick Summary & Quiz Modals
  const [pageAiModal, setPageAiModal] = useState<{
    isOpen: boolean;
    type: 'summary' | 'quiz';
    pageNumber: number;
    isLoading: boolean;
    error: string | null;
    summaryData?: any;
    quizQuestions?: any[];
    currentQIdx?: number;
    selectedAnswer?: number | null;
    answeredState?: 'none' | 'correct' | 'wrong';
  }>({
    isOpen: false,
    type: 'summary',
    pageNumber: 1,
    isLoading: false,
    error: null,
  });

  const [pageSummaryCopied, setPageSummaryCopied] = useState(false);
  const [explanationCopied, setExplanationCopied] = useState(false);

  // Canvas & Stage Refs
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const currentStrokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw & Hold Shape Recognition & Snapping refs
  const snapTimerRef = useRef<any | null>(null);
  const isHoldSnappedRef = useRef<boolean>(false);
  const activeRecognizedShapeRef = useRef<RecognizedShape | null>(null);
  const [shapeSnapFeedback, setShapeSnapFeedback] = useState<string | null>(null);
  const [enableShapeRecognition, setEnableShapeRecognition] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('sabeel_enable_shape_snap');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });

  const currentPage = interactiveData.currentPage || 1;

  // Auto-save interactive state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(interactiveData));
    } catch (e) {
      console.error('Failed to auto-save book data:', e);
    }
  }, [interactiveData, storageKey]);

  const onExtractedTextRef = useRef(onExtractedText);
  useEffect(() => {
    onExtractedTextRef.current = onExtractedText;
  }, [onExtractedText]);

  // =========================================================================
  // Clean Reload & State Reset: Complete disposal of PDF memory, cancel tasks & clear canvas
  // =========================================================================
  useEffect(() => {
    let isCancelled = false;

    // 1. Cleanly cancel pending render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (err) {}
      renderTaskRef.current = null;
    }

    // 2. Cleanly cancel pending PDF loading task if in progress
    if (loadingTaskRef.current) {
      try {
        loadingTaskRef.current.destroy?.();
      } catch (err) {}
      loadingTaskRef.current = null;
    }

    const initDocLoad = async () => {
      let resolvedUrl = bookPdfUrl;
      if (!resolvedUrl) {
        try {
          const blob = await getStoredBookPdfFile(courseId);
          if (blob && !isCancelled) {
            resolvedUrl = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.warn('Storage check fallback notice:', e);
        }
      }

      if (!resolvedUrl) {
        setIsLoadingPdf(false);
        setPdfLoadError('لم يتم إرفاق ملف كتاب (PDF) لهذا المقرر بعد. يمكنك إرفاق الكتاب من الأعلى للبدء بالتصفح.');
        return;
      }

      setIsLoadingPdf(true);
      setPdfLoadError(null);

      // Safe timeout guard of 20 seconds for heavy documents
      const loadTimeout = setTimeout(() => {
        if (!pdfDocRef.current && !isCancelled) {
          setIsLoadingPdf(false);
          setPdfLoadError('استغرق تحميل وتجهيز صفحات الكتاب وقتاً أطول من المتوقع. يمكنك النقر أدناه لإعادة المحاولة.');
        }
      }, 20000);

      try {
        const doc = await getCachedOrLoadPdfDocument(resolvedUrl, courseId);
        clearTimeout(loadTimeout);
        if (isCancelled) return;

        loadingTaskRef.current = null;
        pdfDocRef.current = doc;
        setPdfDoc(doc);
        const total = doc.numPages || 1;
        setTotalPages(total);
        setIsLoadingPdf(false);

        // Restore Last Read Page automatically from LocalStorage
        try {
          const savedLastPageStr = localStorage.getItem(lastReadPageKey);
          if (savedLastPageStr) {
            const pNum = parseInt(savedLastPageStr, 10);
            if (!isNaN(pNum) && pNum >= 1 && pNum <= total) {
              setInteractiveData((prev) => ({
                ...prev,
                currentPage: pNum,
              }));
            }
          }
        } catch (e) {}
      } catch (err: any) {
        clearTimeout(loadTimeout);
        if (isCancelled) return;
        loadingTaskRef.current = null;
        console.warn('Failed to load PDF with pdfjs:', err?.message || err);
        setPdfLoadError('تعذر عرض ملف PDF بالمعالج المدمج. يُرجى التحقق من صحة الملف وإعادة إرفاقه.');
        setIsLoadingPdf(false);
      }
    };

    initDocLoad();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
        renderTaskRef.current = null;
      }
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy?.();
        } catch (e) {}
        loadingTaskRef.current = null;
      }
      if (pdfCanvasRef.current) {
        const ctx = pdfCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, pdfCanvasRef.current.width, pdfCanvasRef.current.height);
      }
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
      pdfDocRef.current = null;
    };
  }, [bookPdfUrl, courseId, lastReadPageKey]);

  // Restore saved drawing for page onto overlay canvas
  const restorePageDrawing = useCallback(
    (pageNum: number) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const savedDrawing = interactiveData.pageDrawings?.[pageNum];
      if (savedDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setCanvasHasDrawing(true);
        };
        img.src = savedDrawing;
      } else {
        setCanvasHasDrawing(false);
      }
    },
    [interactiveData.pageDrawings]
  );

  // Render current page onto background PDF canvas with clean task cancellation
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }

    try {
      const pageNum = Math.min(Math.max(1, currentPage), pdfDoc.numPages || 1);
      const containerWidth = containerRef.current?.clientWidth || 800;
      // High-definition baseline render scale: crisp vector text that remains sharp even when zoomed
      const effectiveScale = Math.min(Math.max(containerWidth / 620, 1.35), 2.1);

      await renderPdfPageToCanvas(
        pdfDoc,
        pageNum,
        pdfCanvasRef.current,
        effectiveScale,
        (task) => {
          renderTaskRef.current = task;
        }
      );

      renderTaskRef.current = null;

      // Align overlay canvas dimensions with rendered PDF page canvas exactly
      if (overlayCanvasRef.current && pdfCanvasRef.current) {
        overlayCanvasRef.current.width = pdfCanvasRef.current.width;
        overlayCanvasRef.current.height = pdfCanvasRef.current.height;
        restorePageDrawing(pageNum);
      }
    } catch (e) {
      console.warn('Page render error:', e);
    }
  }, [pdfDoc, currentPage, restorePageDrawing]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Auto-scroll Scrubber to active page thumbnail
  useEffect(() => {
    const activeThumbnail = document.getElementById(`thumb-scrubber-${currentPage}`);
    if (activeThumbnail && scrubberRef.current) {
      activeThumbnail.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentPage]);

  // Reset zoom on page navigation to provide a clean fit
  const resetZoom = () => {
    const defaultTransform = { scale: 1, panX: 0, panY: 0 };
    zoomTransformRef.current = defaultTransform;
    setZoomTransform(defaultTransform);
  };

  // Handle Page navigation with immediate LocalStorage persistence & Zoom reset
  const goToPage = (targetPage: number) => {
    const pageNum = Math.min(Math.max(1, targetPage), totalPages);
    try {
      localStorage.setItem(lastReadPageKey, String(pageNum));
    } catch (e) {}
    resetZoom();
    setInteractiveData((prev) => ({
      ...prev,
      currentPage: pageNum,
      lastReadDate: new Date().toISOString(),
    }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        goToPage(currentPage + 1);
      } else if (e.key === 'ArrowRight') {
        goToPage(currentPage - 1);
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // =========================================================================
  // Pinch-to-Zoom & Pan Touch Gestures Handling (Natural 2-finger zoom)
  // Safely guarded against undefined touch access
  // =========================================================================
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e || !e.touches) return;

    if (e.touches.length >= 2) {
      // 2 Fingers detected: Initialize Pinch-to-Zoom & Pan
      isPinchingRef.current = true;
      setIsDrawing(false); // Stop any single-finger drawing immediately to prevent stray marks
      currentStrokePointsRef.current = [];
      snapshotCanvasRef.current = null;
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      if (!t0 || !t1) return;

      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;

      touchGestureRef.current = {
        ...touchGestureRef.current,
        initialDist: dist,
        initialScale: zoomTransformRef.current?.scale || 1,
        initialPanX: zoomTransformRef.current?.panX || 0,
        initialPanY: zoomTransformRef.current?.panY || 0,
        initialMidX: midX,
        initialMidY: midY,
        touchCount: 2,
      };
    } else if (e.touches.length === 1 && !isMarkupModeActive) {
      const t0 = e.touches[0];
      if (!t0) return;

      const now = Date.now();
      const lastTap = touchGestureRef.current?.lastTapTime || 0;
      // Double-tap detected: toggle zoom between 1.0x and 2.2x
      if (now - lastTap < 300) {
        e.preventDefault();
        if (zoomTransformRef.current.scale > 1.1) {
          resetZoom();
        } else {
          const newT = { scale: 2.2, panX: 0, panY: 0 };
          zoomTransformRef.current = newT;
          setZoomTransform(newT);
        }
        touchGestureRef.current.lastTapTime = 0;
        return;
      }
      touchGestureRef.current.lastTapTime = now;

      if (zoomTransformRef.current.scale > 1.05) {
        touchGestureRef.current = {
          ...touchGestureRef.current,
          initialDist: 0,
          initialScale: zoomTransformRef.current.scale,
          initialPanX: zoomTransformRef.current.panX,
          initialPanY: zoomTransformRef.current.panY,
          initialMidX: t0.clientX,
          initialMidY: t0.clientY,
          touchCount: 1,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e || !e.touches) return;

    if (e.touches.length === 2 && isPinchingRef.current) {
      // 2-finger pinch gesture: scale and pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      if (!t0 || !t1) return;

      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;

      const scaleFactor = dist / (touchGestureRef.current.initialDist || dist || 1);
      const newScale = Math.min(
        Math.max((touchGestureRef.current.initialScale || 1) * scaleFactor, 0.9),
        4.0
      );

      const deltaX = midX - (touchGestureRef.current.initialMidX || midX);
      const deltaY = midY - (touchGestureRef.current.initialMidY || midY);
      const newPanX = (touchGestureRef.current.initialPanX || 0) + deltaX;
      const newPanY = (touchGestureRef.current.initialPanY || 0) + deltaY;

      zoomTransformRef.current = { scale: newScale, panX: newPanX, panY: newPanY };
      setZoomTransform({ scale: newScale, panX: newPanX, panY: newPanY });
    } else if (
      e.touches.length === 1 &&
      !isMarkupModeActive &&
      touchGestureRef.current.touchCount === 1 &&
      zoomTransformRef.current.scale > 1.05
    ) {
      const t0 = e.touches[0];
      if (!t0) return;

      const deltaX = t0.clientX - (touchGestureRef.current.initialMidX || t0.clientX);
      const deltaY = t0.clientY - (touchGestureRef.current.initialMidY || t0.clientY);
      const newPanX = (touchGestureRef.current.initialPanX || 0) + deltaX;
      const newPanY = (touchGestureRef.current.initialPanY || 0) + deltaY;

      zoomTransformRef.current = { ...zoomTransformRef.current, panX: newPanX, panY: newPanY };
      setZoomTransform({ scale: zoomTransformRef.current.scale, panX: newPanX, panY: newPanY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!e || !e.touches || (e.touches.length < 2 && isPinchingRef.current)) {
      isPinchingRef.current = false;
      // Snap back if scaled below 1.05x
      if (zoomTransformRef.current.scale < 1.05) {
        resetZoom();
      }
    }
  };

  // Wheel zoom / Trackpad pinch on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.008;
      const newScale = Math.min(Math.max(zoomTransformRef.current.scale + zoomFactor, 1.0), 4.0);
      const newPanX = newScale === 1.0 ? 0 : zoomTransformRef.current.panX;
      const newPanY = newScale === 1.0 ? 0 : zoomTransformRef.current.panY;
      const updated = { scale: newScale, panX: newPanX, panY: newPanY };
      zoomTransformRef.current = updated;
      setZoomTransform(updated);
    }
  };

  // Safe Pointer & Touch Coordinates Helper (Coordinates remain 100% mathematically locked to PDF canvas)
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    const rawX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: Math.max(0, Math.min(rawX, canvas.width)),
      y: Math.max(0, Math.min(rawY, canvas.height)),
    };
  };

  // =========================================================================
  // Drawing, Stroke Smoothing & Shape Recognition (Hold-to-Snap) Engine
  // =========================================================================

  // Configure brush styles according to active tool and selected settings
  const applyToolStyles = (ctx: CanvasRenderingContext2D) => {
    if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      const alpha = Math.min(Math.max(markupConfig.highlighter.opacity / 100, 0.15), 0.85);
      ctx.strokeStyle = hexToRgba(markupConfig.highlighter.color, alpha);
      ctx.fillStyle = hexToRgba(markupConfig.highlighter.color, alpha);
      ctx.lineWidth = markupConfig.highlighter.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const alpha = markupConfig.pen.opacity / 100;
      ctx.strokeStyle = hexToRgba(markupConfig.pen.color, alpha);
      ctx.fillStyle = hexToRgba(markupConfig.pen.color, alpha);
      ctx.lineWidth = markupConfig.pen.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  // Render stroke onto overlay canvas: either recognized shape or freehand smoothed path
  const renderCurrentStroke = (
    shape: RecognizedShape | null,
    pts: Point[]
  ) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Restore clean canvas state from snapshot
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (snapshotCanvasRef.current) {
      ctx.drawImage(snapshotCanvasRef.current, 0, 0);
    }

    applyToolStyles(ctx);

    if (shape) {
      drawRecognizedShape(ctx, shape);
    } else if (pts.length > 0) {
      drawSmoothedPath(ctx, pts);
    }
  };

  // Trigger Hold-to-Snap recognition when user holds for ~400ms without lifting
  const triggerHoldToSnap = () => {
    if (!isDrawing || currentStrokePointsRef.current.length < 2) return;
    if (!enableShapeRecognition || activeTool === 'eraser') return;

    const rawPoints = currentStrokePointsRef.current;
    const shape = recognizeShape(rawPoints);
    isHoldSnappedRef.current = true;
    activeRecognizedShapeRef.current = shape;

    // Render the recognized shape
    renderCurrentStroke(shape, []);

    // Visual feedback badge
    setShapeSnapFeedback(shape.label);
    if ((window as any)._shapeFeedbackTimeout) {
      clearTimeout((window as any)._shapeFeedbackTimeout);
    }
    (window as any)._shapeFeedbackTimeout = setTimeout(() => {
      setShapeSnapFeedback(null);
    }, 2200);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMarkupModeActive) return;
    if (isPinchingRef.current) return;

    // Finger touch vs stylus separation
    if (e.pointerType === 'touch' && !drawWithFinger) {
      return;
    }

    setShowToolSettingsPopover(false);

    const canvas = overlayCanvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear any previous snapping timer
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    isHoldSnappedRef.current = false;
    activeRecognizedShapeRef.current = null;

    // Save undo state
    try {
      strokeHistoryRef.current.push(canvas.toDataURL('image/png'));
      if (strokeHistoryRef.current.length > 12) strokeHistoryRef.current.shift();
    } catch {}

    // 1. Take snapshot of existing drawing into offscreen canvas for zero-artifact restoration
    if (!snapshotCanvasRef.current) {
      snapshotCanvasRef.current = document.createElement('canvas');
    }
    snapshotCanvasRef.current.width = canvas.width;
    snapshotCanvasRef.current.height = canvas.height;
    const snapCtx = snapshotCanvasRef.current.getContext('2d');
    if (snapCtx) {
      snapCtx.clearRect(0, 0, canvas.width, canvas.height);
      snapCtx.drawImage(canvas, 0, 0);
    }

    setIsDrawing(true);
    const pt = getCanvasCoordinates(e);
    currentStrokePointsRef.current = [pt];

    // Hold-to-snap initial timer
    if (enableShapeRecognition && activeTool !== 'eraser') {
      snapTimerRef.current = setTimeout(() => {
        triggerHoldToSnap();
      }, 400);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentStrokePointsRef.current.length === 0) return;
    if (e.pointerType === 'touch' && !drawWithFinger) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e);
    const pts = currentStrokePointsRef.current;
    const lastPt = pts[pts.length - 1];

    // Discard micro-jitter within 1.0px
    const dist = Math.hypot(x - lastPt.x, y - lastPt.y);
    if (dist < 1.0) return;

    // A) If already snapped on hold:
    // Follow the pointer continuously to adjust the snapped shape!
    if (isHoldSnappedRef.current && activeRecognizedShapeRef.current) {
      const active = activeRecognizedShapeRef.current;
      if (active.type === 'line' && active.points && active.points.length > 0) {
        const startPt = active.points[0];
        const snappedEnd = snapStraightLine(startPt, { x, y });
        active.points = [startPt, snappedEnd];
      } else if (active.type === 'circle' && active.center) {
        active.radius = Math.max(Math.hypot(x - active.center.x, y - active.center.y), 6);
      } else if (active.type === 'ellipse' && active.center) {
        active.radiusX = Math.max(Math.abs(x - active.center.x), 8);
        active.radiusY = Math.max(Math.abs(y - active.center.y), 8);
      } else if (active.type === 'rectangle' && active.points && active.points.length > 0) {
        const p0 = active.points[0];
        const minX = Math.min(p0.x, x);
        const maxX = Math.max(p0.x, x);
        const minY = Math.min(p0.y, y);
        const maxY = Math.max(p0.y, y);
        active.points = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
          { x: minX, y: minY },
        ];
      } else if (active.type === 'bracket-open' || active.type === 'bracket-corner') {
        const updatedRaw = [...pts, { x, y }];
        const reRecognized = recognizeShape(updatedRaw);
        if (reRecognized.type === active.type) {
          active.points = reRecognized.points;
        }
      }
      renderCurrentStroke(active, []);
      return;
    }

    // B) Freehand stroke rendering with stroke smoothing (تنعيم الخط الحر)
    pts.push({ x, y });
    renderCurrentStroke(null, pts);

    // C) Hold-to-Snap Detection:
    // When the stylus / finger pauses at the end for ~400ms without lifting:
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }

    if (enableShapeRecognition && activeTool !== 'eraser' && pts.length >= 2) {
      snapTimerRef.current = setTimeout(() => {
        triggerHoldToSnap();
      }, 400);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Clear hold timer immediately
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }

    try {
      if (
        e.currentTarget &&
        typeof e.currentTarget.hasPointerCapture === 'function' &&
        e.currentTarget.hasPointerCapture(e.pointerId)
      ) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = currentStrokePointsRef.current;

    if (isHoldSnappedRef.current && activeRecognizedShapeRef.current) {
      // 1. Finalize the snapped shape permanently into markup canvas
      renderCurrentStroke(activeRecognizedShapeRef.current, []);
    } else if (pts.length > 1) {
      // 2. Finalize the smoothed freehand stroke
      renderCurrentStroke(null, pts);
    } else if (pts.length === 1 && ctx) {
      // 3. Single-tap without dragging: draw a clean stamp dot
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (snapshotCanvasRef.current) {
        ctx.drawImage(snapshotCanvasRef.current, 0, 0);
      }

      ctx.beginPath();
      const dotRadius =
        activeTool === 'highlighter'
          ? Math.max(markupConfig.highlighter.width / 2, 4)
          : Math.max(markupConfig.pen.width / 2, 2);
      ctx.arc(pts[0].x, pts[0].y, dotRadius, 0, Math.PI * 2);

      if (activeTool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        const alpha = Math.min(Math.max(markupConfig.highlighter.opacity / 100, 0.15), 0.85);
        ctx.fillStyle = hexToRgba(markupConfig.highlighter.color, alpha);
        ctx.fill();
      } else if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        const alpha = markupConfig.pen.opacity / 100;
        ctx.fillStyle = hexToRgba(markupConfig.pen.color, alpha);
        ctx.fill();
      }
    }

    // Reset stroke tracking refs
    isHoldSnappedRef.current = false;
    activeRecognizedShapeRef.current = null;
    currentStrokePointsRef.current = [];
    snapshotCanvasRef.current = null;

    // Auto-save the updated drawing for current page in LocalStorage
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setCanvasHasDrawing(true);
      setInteractiveData((prev) => ({
        ...prev,
        pageDrawings: {
          ...(prev.pageDrawings || {}),
          [currentPage]: dataUrl,
        },
      }));
    } catch (e) {
      console.warn('Could not save canvas drawing:', e);
    }
  };

  // Undo last stroke
  const handleUndo = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || strokeHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = strokeHistoryRef.current.pop();
    if (!lastState) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setInteractiveData((prev) => ({
        ...prev,
        pageDrawings: {
          ...(prev.pageDrawings || {}),
          [currentPage]: dataUrl,
        },
      }));
    };
    img.src = lastState;
  };

  // Clear drawings for current page
  const clearCurrentPageDrawing = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasDrawing(false);
    setInteractiveData((prev) => {
      const updated = { ...(prev.pageDrawings || {}) };
      delete updated[currentPage];
      return { ...prev, pageDrawings: updated };
    });
  };

  // Bookmark Toggle
  const isCurrentPageBookmarked = interactiveData.bookmarks.some(
    (b) => b.pageNumber === currentPage
  );

  const toggleBookmark = () => {
    if (isCurrentPageBookmarked) {
      setInteractiveData((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.pageNumber !== currentPage),
      }));
    } else {
      const newBookmark: BookBookmark = {
        id: `bm_${Date.now()}`,
        pageNumber: currentPage,
        label: `صفحة ${currentPage}`,
        createdAt: new Date().toLocaleDateString('ar-SA'),
      };
      setInteractiveData((prev) => ({
        ...prev,
        bookmarks: [...prev.bookmarks, newBookmark].sort((a, b) => a.pageNumber - b.pageNumber),
      }));
    }
  };

  // Handle tap in middle of reading screen (Toggles Top Bar & Bottom Scrubber)
  const handleScreenTap = () => {
    if (!isMarkupModeActive && !isPinchingRef.current && zoomTransform.scale <= 1.05) {
      setShowUIBars((prev) => !prev);
      setShowDisplaySettings(false);
      setShowSearchPopover(false);
      setShowToolSettingsPopover(false);
    }
  };

  // =========================================================================
  // Strict Context Grounding: Page-Level Direct Summarization & Quiz Generation
  // =========================================================================
  const handleTriggerPageSummary = async () => {
    if (!pdfDoc) return;
    setPageAiModal({
      isOpen: true,
      type: 'summary',
      pageNumber: currentPage,
      isLoading: true,
      error: null,
    });

    try {
      const pageText = await extractTextFromSinglePage(pdfDoc, currentPage);
      const hasEnoughText = Boolean(pageText && pageText.trim().length >= 25);

      let pageImageBase64: string | undefined = undefined;
      if (!hasEnoughText) {
        // Fallback to Multimodal Image Input: capture currently rendered page canvas directly
        if (pdfCanvasRef.current && pdfCanvasRef.current.width > 0) {
          try {
            pageImageBase64 = pdfCanvasRef.current.toDataURL('image/jpeg', 0.85);
          } catch {}
        }
        if (!pageImageBase64 && pdfDoc) {
          pageImageBase64 = await renderPdfPageToBase64Jpeg(pdfDoc, currentPage, 1.5);
        }
        if (!pageImageBase64) {
          throw new Error('تعذر قراءة نص أو صورة هذه الصفحة (تأكد من وضوح الصفحة والمحاولة مجدداً).');
        }
      }

      const res = await fetch('/api/gemini/summarize-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: hasEnoughText ? `[صفحة ${currentPage}]:\n${pageText}` : undefined,
          pageImageBase64: !hasEnoughText ? pageImageBase64 : undefined,
          fileName: `${fileName} (صفحة ${currentPage})`,
          courseTitle,
          summaryType: 'balanced',
          scope: 'range',
          startPage: currentPage,
          endPage: currentPage,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `[خطأ ${res.status}] تعذر إعداد تلخيص الصفحة.`);
      }

      setPageAiModal((prev) => ({
        ...prev,
        isLoading: false,
        summaryData: data?.summary,
      }));
    } catch (err: any) {
      console.warn('[InteractiveBookViewer] Page summarize notice:', err?.message || err);
      setPageAiModal((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'حدث خطأ أثناء تلخيص الصفحة.',
      }));
    }
  };

  const handleTriggerPageQuiz = async () => {
    if (!pdfDoc) return;
    setPageAiModal({
      isOpen: true,
      type: 'quiz',
      pageNumber: currentPage,
      isLoading: true,
      error: null,
      currentQIdx: 0,
      selectedAnswer: null,
      answeredState: 'none',
    });

    try {
      const pageText = await extractTextFromSinglePage(pdfDoc, currentPage);
      const hasEnoughText = Boolean(pageText && pageText.trim().length >= 25);

      let pageImageBase64: string | undefined = undefined;
      if (!hasEnoughText) {
        // Fallback to Multimodal Image Input: capture currently rendered page canvas directly
        if (pdfCanvasRef.current && pdfCanvasRef.current.width > 0) {
          try {
            pageImageBase64 = pdfCanvasRef.current.toDataURL('image/jpeg', 0.85);
          } catch {}
        }
        if (!pageImageBase64 && pdfDoc) {
          pageImageBase64 = await renderPdfPageToBase64Jpeg(pdfDoc, currentPage, 1.5);
        }
        if (!pageImageBase64) {
          throw new Error('تعذر التقاط صورة الصفحة الممسوحة ضوئياً لتوليد الأسئلة.');
        }
      }

      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: courseTitle,
          quizMode: 'mixed',
          sourceText: hasEnoughText ? `[صفحة ${currentPage} من كتاب ${fileName}]:\n${pageText}` : undefined,
          pageImageBase64: !hasEnoughText ? pageImageBase64 : undefined,
          count: 3,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `[خطأ ${res.status}] تعذر توليد أسئلة من هذه الصفحة.`);
      }

      setPageAiModal((prev) => ({
        ...prev,
        isLoading: false,
        quizQuestions: data?.questions || [],
      }));
    } catch (err: any) {
      console.warn('[InteractiveBookViewer] Page quiz notice:', err?.message || err);
      setPageAiModal((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'حدث خطأ أثناء توليد الأسئلة.',
      }));
    }
  };

  // Tone background styles
  const toneBgClass =
    paperTone === 'sepia'
      ? 'bg-[#f7f2e7]'
      : paperTone === 'gray'
      ? 'bg-[#ececec]'
      : 'bg-[#fbfbfb]';

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[740px] sm:min-h-[820px] rounded-3xl overflow-hidden text-right select-none transition-colors duration-300 ${toneBgClass}`}
    >
      {/* 1. Apple Books Clean Top Navigation Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/60 px-4 sm:px-6 py-3 flex items-center justify-between transition-all duration-300 ${
          showUIBars
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        {/* Right side (RTL): Back Button (<) + Table of Contents Icon */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (onBack) onBack();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-1.5 text-stone-800 hover:text-black hover:bg-stone-100/80 rounded-full transition-colors cursor-pointer"
            title="رجوع"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowContentsDrawer(true);
              setShowToolSettingsPopover(false);
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              showContentsDrawer
                ? 'bg-stone-200 text-black'
                : 'text-stone-800 hover:text-black hover:bg-stone-100/80'
            }`}
            title="فهرس ومحتويات الكتاب"
          >
            <List className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Quick Page Actions: ملخص الصفحة وأسئلة الصفحة فقط */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <button
              type="button"
              onClick={handleTriggerPageSummary}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="تلخيص الصفحة الحالية بنسبة 100% من نصها"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ملخص الصفحة</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerPageQuiz}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="توليد أسئلة مقيدة بنص هذه الصفحة فقط"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>أسئلة الصفحة</span>
            </button>
          </div>
        </div>

        {/* Center-Left: Markup Pen Circle + 'عع' + Search + Bookmark Ribbon */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Apple Pencil Markup Tool Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMarkupModeActive(!isMarkupModeActive);
              setShowDisplaySettings(false);
              setShowSearchPopover(false);
              setShowToolSettingsPopover(false);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMarkupModeActive
                ? 'bg-black text-white shadow-xs scale-105'
                : 'text-stone-800 hover:text-black hover:bg-stone-100/80'
            }`}
            title="تفعيل التظليل والكتابة في الهوامش"
          >
            <PenLine className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Font & Display Popover Toggle (عع) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDisplaySettings(!showDisplaySettings);
                setShowSearchPopover(false);
                setShowToolSettingsPopover(false);
              }}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                showDisplaySettings
                  ? 'bg-stone-200 text-black'
                  : 'text-stone-800 hover:text-black hover:bg-stone-100/80'
              }`}
              title="التحكم بالخط والعرض (عع)"
            >
              <span className="font-serif font-black text-base leading-none tracking-tighter select-none">
                ع<span className="text-xs font-sans">ع</span>
              </span>
            </button>

            {/* Display Settings Popover */}
            {showDisplaySettings && (
              <div className="absolute left-0 mt-2 z-50 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl p-4 text-xs font-bold space-y-3.5 animate-scale-in">
                <div className="flex items-center justify-between text-stone-500 pb-1 border-b border-stone-100">
                  <span>إعدادات العرض والتكبير</span>
                  <span>{Math.round(zoomTransform.scale * 100)}%</span>
                </div>

                {/* Direct Zoom Controls */}
                <div className="flex items-center justify-between bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      const newS = Math.max(zoomTransform.scale - 0.25, 1.0);
                      zoomTransformRef.current = { scale: newS, panX: newS === 1 ? 0 : zoomTransform.panX, panY: newS === 1 ? 0 : zoomTransform.panY };
                      setZoomTransform({ ...zoomTransformRef.current });
                    }}
                    className="px-3 py-1 bg-white hover:bg-stone-50 text-stone-800 rounded-lg shadow-2xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-stone-700 font-extrabold">{Math.round(zoomTransform.scale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newS = Math.min(zoomTransform.scale + 0.25, 4.0);
                      zoomTransformRef.current = { ...zoomTransformRef.current, scale: newS };
                      setZoomTransform({ ...zoomTransformRef.current });
                    }}
                    className="px-3 py-1 bg-white hover:bg-stone-50 text-stone-800 rounded-lg shadow-2xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Paper Tone (White / Sepia / Soft Gray) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-stone-500 block">لون الخلفية:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'white', label: 'أبيض', bg: 'bg-white border-stone-200' },
                      { id: 'sepia', label: 'دافئ', bg: 'bg-[#f7f2e7] border-amber-200' },
                      { id: 'gray', label: 'رمادي', bg: 'bg-[#ececec] border-stone-300' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPaperTone(t.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          t.bg
                        } ${
                          paperTone === t.id
                            ? 'ring-2 ring-black font-extrabold'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetZoom}
                  className="w-full py-1.5 text-center text-[11px] text-stone-500 hover:text-black cursor-pointer hover:underline"
                >
                  إعادة ضبط الحجم الافتراضي (100%)
                </button>
              </div>
            )}
          </div>

          {/* Search inside book */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSearchPopover(!showSearchPopover);
                setShowDisplaySettings(false);
                setShowToolSettingsPopover(false);
              }}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                showSearchPopover
                  ? 'bg-stone-200 text-black'
                  : 'text-stone-800 hover:text-black hover:bg-stone-100/80'
              }`}
              title="البحث داخل الكتاب"
            >
              <Search className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Search Popover */}
            {showSearchPopover && (
              <div className="absolute left-0 mt-2 z-50 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl p-4 text-xs font-bold space-y-3 animate-scale-in">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100 text-stone-500">
                  <span>البحث في الكتاب</span>
                  <button
                    type="button"
                    onClick={() => setShowSearchPopover(false)}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن كلمة، مسألة، أو رقم صفحة..."
                    className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:border-black focus:outline-none text-xs"
                  />
                </div>

                {/* Quick Page Jump */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-stone-500">انتقال لصفحة:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder="1"
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10);
                      if (!isNaN(p) && p >= 1 && p <= totalPages) {
                        goToPage(p);
                      }
                    }}
                    className="w-16 py-1 px-2 text-center bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                  <span className="text-stone-400 text-[11px]">من {totalPages}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bookmark Ribbon Icon */}
          <button
            type="button"
            onClick={toggleBookmark}
            className="p-1.5 text-stone-800 hover:text-black hover:bg-stone-100/80 rounded-full transition-all cursor-pointer"
            title={
              isCurrentPageBookmarked
                ? `صفحة ${currentPage} محفوظة في الإشارات (انقر للإزالة)`
                : `حفظ صفحة ${currentPage} كإشارة مرجعية`
            }
          >
            <Bookmark
              className={`w-5 h-5 stroke-[2.2] transition-colors ${
                isCurrentPageBookmarked ? 'fill-black text-black scale-105' : 'text-stone-800'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Page Counter Pill */}
      <div
        className={`absolute top-16 left-6 z-30 transition-all duration-300 ${
          showUIBars
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-stone-200/85 backdrop-blur-md text-stone-800 text-xs font-extrabold px-3 py-1 rounded-lg select-none shadow-2xs">
          {currentPage} من {totalPages}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Apple Books Markup Toolbar (IMG_1057.jpeg: Chisel tip, 39 opacity, popover) */}
      {/* ========================================================================= */}
      {isMarkupModeActive && (
        <div className="absolute top-16 sm:top-18 inset-x-0 mx-auto max-w-fit z-40 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-stone-200/90 shadow-xl flex items-center gap-2 animate-fade-in text-xs font-bold">
          {/* 1. Highlighter Marker with Chisel tip and opacity badge (matching Apple Pencil 39 in IMG_1057) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (activeTool === 'highlighter') {
                  setShowToolSettingsPopover(!showToolSettingsPopover);
                } else {
                  setActiveTool('highlighter');
                  setShowToolSettingsPopover(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-100 text-amber-950 ring-2 ring-amber-400 font-extrabold shadow-2xs'
                  : 'hover:bg-stone-100 text-stone-700'
              }`}
              title="قلم تظليل شفاف ناعم (انقر لضبط السماكة والشفافية)"
            >
              <Highlighter className="w-4 h-4 text-amber-500" />
              <span>تظليل</span>
              {/* Opacity Number badge on marker (39 in IMG_1057) */}
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-200/80 text-amber-950 font-mono">
                {markupConfig.highlighter.opacity}
              </span>
              <ChevronDown className="w-3 h-3 text-amber-700 opacity-60" />
            </button>
          </div>

          {/* 2. Fine Pen Tool */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (activeTool === 'pen') {
                  setShowToolSettingsPopover(!showToolSettingsPopover);
                } else {
                  setActiveTool('pen');
                  setShowToolSettingsPopover(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTool === 'pen'
                  ? 'bg-stone-900 text-white font-extrabold shadow-xs'
                  : 'hover:bg-stone-100 text-stone-700'
              }`}
              title="قلم كتابة حرة في الهوامش"
            >
              <PenTool className="w-4 h-4" />
              <span>قلم الهوامش</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* 3. Eraser */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
              setShowToolSettingsPopover(false);
            }}
            className={`p-1.5 rounded-xl cursor-pointer transition-all ${
              activeTool === 'eraser'
                ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-400'
                : 'hover:bg-stone-100 text-stone-700'
            }`}
            title="ممحاة"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-stone-200 mx-1" />

          {/* 4. Color Wheel Button */}
          {activeTool !== 'eraser' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="relative w-7 h-7 rounded-full p-0.5 shadow-2xs cursor-pointer hover:scale-105 transition-transform flex items-center justify-center border border-stone-200"
                style={{
                  background:
                    'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
                }}
                title="تغيير اللون بحرية (عجلة الألوان)"
              >
                <div
                  className="w-full h-full rounded-full border-2 border-white flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: currentToolColor }}
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={currentToolColor}
                  onChange={(e) => updateCurrentColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-stone-200 mx-1" />

          {/* Dedicated Toggle Switch: [ ارسم بإصبعك / Draw with Finger ] */}
          <button
            type="button"
            onClick={toggleDrawWithFinger}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow-2xs ${
              drawWithFinger
                ? 'bg-[#2e493b] text-white ring-1 ring-[#2e493b]'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title={
              drawWithFinger
                ? 'الرسم بالإصبع مفعّل (انقر لتعطيله وقصر الرسم على القلم الإلكتروني فقط)'
                : 'الرسم بالقلم فقط (الإصبع للتمرير والتنقل السلس ومنع الخطوط العرضية)'
            }
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {drawWithFinger ? 'ارسم بإصبعك: مفعّل' : 'ارسم بإصبعك: معطّل'}
            </span>
            <span className="sm:hidden">
              {drawWithFinger ? 'بالإصبع' : 'بالقلم'}
            </span>
          </button>

          {/* Toggle Switch: [ تعديل الأشكال الذكي / Shape Snap (Hold 400ms) ] */}
          <button
            type="button"
            onClick={() => {
              setEnableShapeRecognition((prev) => {
                const next = !prev;
                try {
                  localStorage.setItem('sabeel_enable_shape_snap', String(next));
                } catch {}
                return next;
              });
            }}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow-2xs ${
              enableShapeRecognition
                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
            title="تعديل الأشكال والخطوط تلقائياً عند التثبيت لـ 400ms (Hold to Snap)"
          >
            <Shapes className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">
              {enableShapeRecognition ? 'تعديل الأشكال: مفعّل' : 'تعديل الأشكال: معطّل'}
            </span>
            <span className="sm:hidden">أشكال</span>
          </button>

          <div className="h-4 w-px bg-stone-200 mx-1" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            className="p-1.5 hover:bg-stone-100 text-stone-700 rounded-lg cursor-pointer"
            title="تراجع"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Clear */}
          {canvasHasDrawing && (
            <button
              type="button"
              onClick={clearCurrentPageDrawing}
              className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer text-[11px]"
              title="مسح رسومات هذه الصفحة"
            >
              مسح
            </button>
          )}

          {/* Close Markup */}
          <button
            type="button"
            onClick={() => {
              setIsMarkupModeActive(false);
              setShowToolSettingsPopover(false);
            }}
            className="p-1 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer mr-1"
            title="إغلاق التوصيف"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ========================================================================= */}
          {/* Apple Books Native Floating Tool Popover (IMG_1057.jpeg layout)           */}
          {/* ========================================================================= */}
          {showToolSettingsPopover && activeTool !== 'eraser' && (
            <div className="absolute top-full mt-2.5 right-0 z-50 w-72 bg-white/98 backdrop-blur-xl rounded-3xl border border-stone-200/90 shadow-2xl p-4 text-xs font-bold space-y-3.5 animate-scale-in text-right">
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-stone-100 text-stone-700">
                <span className="text-[11px] font-extrabold">
                  {activeTool === 'highlighter' ? 'خصائص قلم التظليل' : 'خصائص قلم الهوامش'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowToolSettingsPopover(false)}
                  className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 1. 5 Slanted Thickness Presets matching Apple Books (IMG_1057.jpeg) */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-stone-500 block">عرض الخط وسماكة التظليل:</span>
                <div className="grid grid-cols-5 gap-1.5 p-1 bg-stone-100/80 rounded-2xl">
                  {(activeTool === 'highlighter'
                    ? HIGHLIGHTER_WIDTH_PRESETS
                    : PEN_WIDTH_PRESETS
                  ).map((preset) => {
                    const isSelected = currentToolWidth === preset.width;
                    return (
                      <button
                        key={preset.width}
                        type="button"
                        onClick={() => updateCurrentWidth(preset.width)}
                        className={`h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-black text-white shadow-sm ring-1 ring-black'
                            : 'bg-white hover:bg-stone-50 text-stone-700'
                        }`}
                        title={preset.label}
                      >
                        {/* Slanted angled chisel line (like IMG_1057) */}
                        <div
                          className="transform rotate-45 rounded-full"
                          style={{
                            width: Math.min(Math.max(preset.width / 2.2, 2), 9),
                            height: 18,
                            backgroundColor: isSelected ? '#ffffff' : '#1c1917',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Apple Books Checkered Transparency Opacity Slider (IMG_1057.jpeg) */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-600">نسبة الشفافية:</span>
                  <span className="font-mono font-extrabold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                    {currentToolOpacity}%
                  </span>
                </div>

                {/* Track with checkered background transitioning to color */}
                <div className="relative py-1">
                  <input
                    type="range"
                    min="15"
                    max="80"
                    step="1"
                    value={currentToolOpacity}
                    onChange={(e) => updateCurrentOpacity(parseInt(e.target.value, 10))}
                    className="w-full h-5 rounded-full appearance-none cursor-pointer border border-stone-300/80 shadow-inner"
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.05), ${currentToolColor}), repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%) 50% / 10px 10px`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-stone-400">
                  <span>خفيف جداً (15%)</span>
                  <span className="font-bold text-stone-600">المثالي (39%)</span>
                  <span>غامق (80%)</span>
                </div>
              </div>

              {/* 3. Color Palette & Wheel Trigger */}
              <div className="space-y-1.5 pt-1 border-t border-stone-100">
                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span>الألوان السريعة:</span>
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="text-stone-800 hover:text-black underline cursor-pointer font-bold"
                  >
                    عجلة الألوان الكاملة
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {(activeTool === 'highlighter' ? HIGHLIGHTER_PRESETS : PEN_PRESETS).map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => updateCurrentColor(p.color)}
                      style={{ backgroundColor: p.color }}
                      className={`h-6 rounded-lg cursor-pointer transition-transform border border-black/10 ${
                        currentToolColor.toLowerCase() === p.color.toLowerCase()
                          ? 'ring-2 ring-black scale-110 shadow-xs'
                          : 'hover:scale-105'
                      }`}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              {/* 4. Live Readability Preview Box with True Multiply Blend */}
              <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <span className="text-[10px] text-stone-500 block">معاينة مباشرة ووضوح الكلمات تحت التظليل:</span>
                <div className="h-8 bg-white border border-stone-200 rounded-xl relative flex items-center justify-center overflow-hidden px-2 shadow-xs">
                  <span className="text-[11px] text-stone-950 font-bold z-10 select-none">
                    سَبيلُ العِلمِ النَّافِع - النَّصُّ وَاضِحٌ تَمَاماً
                  </span>
                  <div
                    className="absolute inset-y-1 inset-x-2 rounded-md pointer-events-none"
                    style={{
                      backgroundColor: hexToRgba(currentToolColor, currentToolOpacity / 100),
                      mixBlendMode: 'multiply',
                    }}
                  />
                </div>
                <span className="text-[9px] text-emerald-700 block text-center font-bold">
                  ✓ نمط المزج (Multiply) يدمج التظليل خلف الحروف ليظهر النص الأسود ناصعاً
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shape Snapping Feedback Floating Pill */}
      {shapeSnapFeedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#20352a]/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-[#2e493b] text-xs font-bold flex items-center gap-2 animate-fade-in pointer-events-none">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>تم تعديل وضبط الشكل: <strong className="text-amber-200 font-black">{shapeSnapFeedback}</strong></span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Main PDF Reading Stage with Hardware-Accelerated Pinch to Zoom & Pan      */}
      {/* ========================================================================= */}
      <div
        ref={stageContainerRef}
        onClick={handleScreenTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full min-h-[700px] flex items-center justify-center p-2 sm:p-6 pt-20 sm:pt-22 pb-24 sm:pb-28 overflow-hidden touch-none cursor-default"
      >
        {isLoadingPdf || (!pdfDoc && !pdfLoadError) ? (
          <div className="py-32 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-700">جاري فتح وتصفح الكتاب بدقة عالية...</p>
          </div>
        ) : pdfLoadError ? (
          <div className="py-24 text-center space-y-4 max-w-md bg-white p-6 rounded-3xl border border-stone-200 shadow-sm mx-auto">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-sm font-bold text-stone-800">{pdfLoadError}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPdfLoadError(null);
                  setIsLoadingPdf(true);
                  if (bookPdfUrl) {
                    const task = createPdfLoadingTask(bookPdfUrl);
                    loadingTaskRef.current = task;
                    task.promise
                      .then((doc: any) => {
                        loadingTaskRef.current = null;
                        pdfDocRef.current = doc;
                        setPdfDoc(doc);
                        setTotalPages(doc.numPages || 1);
                        setIsLoadingPdf(false);
                      })
                      .catch((err: any) => {
                        console.error('Retry failed:', err);
                        setPdfLoadError('تعذر فتح الملف بالمعالج المدمج. تأكد من صحة الملف.');
                        setIsLoadingPdf(false);
                      });
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2e493b] text-white text-xs font-bold rounded-xl hover:bg-[#20352a] transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة داخل العارض</span>
              </button>
            </div>
          </div>
        ) : (
          /* Locked Unified Wrapper: PDF Canvas and Drawing Canvas scale and pan together */
          <div
            ref={pageWrapperRef}
            onClick={(e) => {
              if (isMarkupModeActive) e.stopPropagation();
            }}
            style={{
              transform: `translate3d(${zoomTransform.panX}px, ${zoomTransform.panY}px, 0) scale(${zoomTransform.scale})`,
              transformOrigin: 'center center',
              transition: isPinchingRef.current ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
              willChange: 'transform',
            }}
            className="relative inline-block max-w-full shadow-xl rounded-sm overflow-hidden bg-white cursor-default select-none border border-stone-300/70"
          >
            {/* Background PDF Page Canvas */}
            <canvas
              ref={pdfCanvasRef}
              className="block max-w-full h-auto mx-auto bg-white select-none pointer-events-none"
            />

            {/* Foreground Overlay Canvas: Permanently linked to PDF page with Multiply blend mode */}
            <canvas
              ref={overlayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                mixBlendMode: 'multiply',
                touchAction: !isMarkupModeActive || !drawWithFinger ? 'pan-x pan-y pinch-zoom' : 'none',
              }}
              className={`absolute inset-0 w-full h-full ${
                isMarkupModeActive
                  ? activeTool === 'highlighter'
                    ? 'cursor-crosshair'
                    : activeTool === 'eraser'
                    ? 'cursor-pointer'
                    : 'cursor-crosshair'
                  : 'pointer-events-none'
              }`}
            />
          </div>
        )}
      </div>

      {/* Floating Zoom Indicator & Reset Button when zoomed in */}
      {zoomTransform.scale > 1.05 && (
        <div className="absolute bottom-20 left-6 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-stone-200 shadow-lg text-xs font-bold text-stone-800 animate-fade-in">
          <span>{Math.round(zoomTransform.scale * 100)}%</span>
          <button
            type="button"
            onClick={resetZoom}
            className="text-[11px] text-stone-500 hover:text-black underline cursor-pointer pr-1 border-r border-stone-200"
          >
            إعادة التوسيط
          </button>
        </div>
      )}

      {/* 3. Apple Books Bottom Thumbnail Scrubber */}
      <div
        className={`absolute bottom-3 inset-x-0 mx-auto max-w-2xl px-3 z-30 transition-all duration-300 ${
          showUIBars
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-lg p-2 sm:p-2.5">
          {/* Horizontal Scrubber Strip */}
          <div
            ref={scrubberRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scroll-smooth px-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              const isBookmarked = interactiveData.bookmarks.some((b) => b.pageNumber === pNum);
              const hasDrawings = !!interactiveData.pageDrawings?.[pNum];
              return (
                <PdfThumbnailCard
                  key={pNum}
                  pdfDoc={pdfDoc}
                  pageNumber={pNum}
                  isActive={pNum === currentPage}
                  isBookmarked={isBookmarked}
                  hasDrawings={hasDrawings}
                  onClick={() => goToPage(pNum)}
                  variant="strip"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Apple Books Contents Drawer / Slide-Over Sheet (أيقونة الفهرس) */}
      {showContentsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-right animate-scale-in">
            {/* Drawer Header */}
            <div className="p-4 sm:px-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                  <List className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{fileName}</h4>
                  <p className="text-[11px] text-stone-500">إجمالي الصفحات: {totalPages}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContentsDrawer(false)}
                className="p-1.5 text-stone-400 hover:text-black rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switchers */}
            <div className="px-6 pt-3 flex items-center gap-3 border-b border-stone-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setContentsTab('grid')}
                className={`pb-2.5 transition-colors border-b-2 cursor-pointer ${
                  contentsTab === 'grid'
                    ? 'border-black text-black font-extrabold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                شبكة الصفحات ({totalPages})
              </button>
              <button
                type="button"
                onClick={() => setContentsTab('bookmarks')}
                className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  contentsTab === 'bookmarks'
                    ? 'border-black text-black font-extrabold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>الإشارات المرجعية ({interactiveData.bookmarks.length})</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {contentsTab === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                    const isBookmarked = interactiveData.bookmarks.some((b) => b.pageNumber === pNum);
                    const hasDrawings = !!interactiveData.pageDrawings?.[pNum];
                    return (
                      <PdfThumbnailCard
                        key={pNum}
                        pdfDoc={pdfDoc}
                        pageNumber={pNum}
                        isActive={pNum === currentPage}
                        isBookmarked={isBookmarked}
                        hasDrawings={hasDrawings}
                        onClick={() => {
                          goToPage(pNum);
                          setShowContentsDrawer(false);
                        }}
                        variant="grid"
                      />
                    );
                  })}
                </div>
              ) : (
                /* Bookmarks Tab */
                <div className="space-y-3">
                  {interactiveData.bookmarks.length === 0 ? (
                    <div className="py-16 text-center space-y-2 text-stone-400">
                      <Bookmark className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-xs font-bold text-stone-600">
                        لم تقم بحفظ أي إشارة مرجعية حتى الآن
                      </p>
                      <p className="text-[11px] text-stone-400">
                        اضغط على أيقونة الإشارة في الشريط العلوي لحفظ الصفحة الحالية
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {interactiveData.bookmarks.map((bm) => (
                        <div
                          key={bm.id}
                          onClick={() => {
                            goToPage(bm.pageNumber);
                            setShowContentsDrawer(false);
                          }}
                          className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-stone-100/80 transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Bookmark className="w-4 h-4 fill-black text-black" />
                            <div>
                              <p className="text-xs font-bold text-stone-900">
                                صفحة {bm.pageNumber}
                              </p>
                              <span className="text-[10px] text-stone-400">{bm.createdAt}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-stone-700">تصفح</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Page-Level Strict Grounding Modal (Summary or Quiz of Current Page)     */}
      {/* ========================================================================= */}
      {pageAiModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden text-right animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-2xs">
                  {pageAiModal.type === 'summary' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <HelpCircle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {pageAiModal.type === 'summary'
                      ? pageAiModal.pageNumber > 0
                        ? `التلخيص العلمي لصفحة ${pageAiModal.pageNumber}`
                        : 'التلخيص الشامل لكامل فصول وأبواب الكتاب'
                      : `أسئلة مراجعة من صفحة ${pageAiModal.pageNumber}`}
                  </h4>
                  <span className="text-[10px] text-emerald-800 font-bold">
                    ✓ مقيد بنسبة 100% بنص صفحات الكتاب المرفقة فقط
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPageAiModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-stone-400 hover:text-black rounded-full hover:bg-stone-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
              {pageAiModal.isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-9 h-9 border-3 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-stone-800">
                    {pageAiModal.type === 'summary'
                      ? pageAiModal.pageNumber > 0
                        ? 'جاري استخراج نص الصفحة وتلخيصه بدقة تامة...'
                        : 'جاري استخراج كافة صفحات الكتاب وتلخيصها بالأبواب...'
                      : 'جاري استخراج نص الصفحة وصياغة الأسئلة المباشرة منها...'}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    نحن مقيدون بنسبة 100% بالنص المرفق ولا نختلق أي معلومة خارجية.
                  </p>
                </div>
              ) : pageAiModal.error ? (
                <div className="py-8 text-center space-y-3 bg-amber-50/70 p-5 rounded-2xl border border-amber-200">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <p className="text-xs font-bold text-amber-950 leading-relaxed">
                    {pageAiModal.error}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (pageAiModal.type === 'summary') {
                        handleTriggerPageSummary();
                      } else {
                        handleTriggerPageQuiz();
                      }
                    }}
                    className="mt-2 px-4 py-2 bg-[#2e493b] text-white rounded-xl text-xs font-bold hover:bg-[#20352a] transition-colors cursor-pointer shadow-2xs"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : pageAiModal.type === 'summary' && pageAiModal.summaryData ? (
                /* Page Summary View */
                <div className="space-y-3.5 leading-relaxed">
                  {pageAiModal.summaryData.executiveSummary && (
                    <div className="p-3 bg-stone-100/70 rounded-2xl border border-stone-200">
                      <p className="font-bold text-stone-900 mb-1">الخلاصة الجوهرية:</p>
                      <p className="text-stone-700">{pageAiModal.summaryData.executiveSummary}</p>
                    </div>
                  )}

                  {/* Main Topics */}
                  <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/70 space-y-1">
                    <p className="font-bold text-amber-950">أبرز المحاور المذكورة بالصفحة:</p>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 pr-1">
                      {pageAiModal.summaryData.mainTopics?.map((t: string, idx: number) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Scientific Issues */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                    <p className="font-bold text-stone-900">المسائل العلمية والفقهية المذكورة:</p>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 pr-1">
                      {pageAiModal.summaryData.scientificIssues?.map((i: string, idx: number) => (
                        <li key={idx}>{i}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Benefits & Rules */}
                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-emerald-950">الفوائد والضوابط المستنبطة:</p>
                    <ul className="list-disc list-inside space-y-1 text-emerald-900 pr-1">
                      {pageAiModal.summaryData.benefitsAndRules?.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Universal Copy Button for Page Summary */}
                  <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const s = pageAiModal.summaryData;
                        const text = `تلخيص صفحة ${pageAiModal.pageNumber} من كتاب (${fileName}):\n\nالخلاصة:\n${s.executiveSummary || ''}\n\nأبرز المحاور:\n- ${(s.mainTopics || []).join('\n- ')}\n\nالمسائل العلمية والفقهية:\n- ${(s.scientificIssues || []).join('\n- ')}\n\nالفوائد والضوابط المستنبطة:\n- ${(s.benefitsAndRules || []).join('\n- ')}`;
                        navigator.clipboard.writeText(text);
                        setPageSummaryCopied(true);
                        setTimeout(() => setPageSummaryCopied(false), 2000);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#20352a] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {pageSummaryCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم نسخ التلخيص</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#2e493b]" />
                          <span>نسخ التلخيص</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : pageAiModal.type === 'quiz' && pageAiModal.quizQuestions && pageAiModal.quizQuestions.length > 0 ? (
                /* Page Quiz View */
                (() => {
                  const qIdx = pageAiModal.currentQIdx || 0;
                  const currentQ = pageAiModal.quizQuestions[qIdx];
                  if (!currentQ) return null;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 pb-2 border-b border-stone-100">
                        <span>
                          السؤال {qIdx + 1} من {pageAiModal.quizQuestions.length}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-100 rounded-lg font-bold text-stone-700">
                          {currentQ.questionType}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-stone-900 leading-relaxed">
                        {currentQ.question}
                      </p>

                      <div className="space-y-2 pt-1">
                        {currentQ.options?.map((opt: string, optIdx: number) => {
                          const isSelected = pageAiModal.selectedAnswer === optIdx;
                          const isCorrect = optIdx === currentQ.correctIndex;
                          const hasAnswered = pageAiModal.answeredState !== 'none';

                          let btnStyle = 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800';
                          if (hasAnswered) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold';
                            } else if (isSelected) {
                              btnStyle = 'bg-rose-100 border-rose-500 text-rose-950 font-bold';
                            } else {
                              btnStyle = 'opacity-50 bg-stone-50 border-stone-200 text-stone-500';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={hasAnswered}
                              onClick={() => {
                                const correct = optIdx === currentQ.correctIndex;
                                setPageAiModal((prev) => ({
                                  ...prev,
                                  selectedAnswer: optIdx,
                                  answeredState: correct ? 'correct' : 'wrong',
                                }));

                                if (correct) {
                                  playCelebrationSound();
                                  try {
                                    confetti({
                                      particleCount: 80,
                                      spread: 70,
                                      origin: { y: 0.6 },
                                      colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24'],
                                    });
                                  } catch (e) {}
                                }
                              }}
                              className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {hasAnswered && isCorrect && (
                                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Gender-Aware Celebratory Banner */}
                      {pageAiModal.answeredState === 'correct' && (
                        <div className="p-3 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm animate-scale-in shadow-md">
                          <Award className="w-4 h-4 text-amber-200" />
                          <span>
                            {(() => {
                              try {
                                const raw = localStorage.getItem('sabeel_current_user');
                                const u = raw ? JSON.parse(raw) : null;
                                return u?.gender === 'ذكر' ? 'أحسنتَ بارك الله فيكَ!' : 'أحسنتِ بارك الله فيكِ!';
                              } catch {
                                return 'أحسنتِ بارك الله فيكِ!';
                              }
                            })()}
                          </span>
                        </div>
                      )}

                      {/* Explanation with Universal Copy Button */}
                      {pageAiModal.answeredState !== 'none' && currentQ.explanation && (
                        <div className="p-3 bg-stone-100/80 rounded-2xl border border-stone-200 text-[11px] leading-relaxed animate-fade-in space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-stone-900">التعليل العلمي من نص الصفحة:</p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(currentQ.explanation);
                                setExplanationCopied(true);
                                setTimeout(() => setExplanationCopied(false), 2000);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-[10px] font-bold text-stone-600 hover:text-black flex items-center gap-1 cursor-pointer"
                            >
                              {explanationCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>نسخ التعليل</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-stone-700">{currentQ.explanation}</p>
                        </div>
                      )}

                      {/* Next Question Navigation */}
                      {pageAiModal.answeredState !== 'none' && qIdx < pageAiModal.quizQuestions.length - 1 && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setPageAiModal((prev) => ({
                                ...prev,
                                currentQIdx: qIdx + 1,
                                selectedAnswer: null,
                                answeredState: 'none',
                              }));
                            }}
                            className="px-4 py-2 bg-black text-white font-bold rounded-xl cursor-pointer hover:bg-stone-800 transition-colors"
                          >
                            السؤال التالي
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
