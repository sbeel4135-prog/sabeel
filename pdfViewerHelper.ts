import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    // Prefer same-origin public worker to prevent CORS/iframe origin exceptions
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (e) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || '/pdf.worker.min.mjs';
    } catch {}
  }
}

export { pdfjsLib };

const canvasRenderTaskMap = new WeakMap<HTMLCanvasElement, { task: any; promise: Promise<any> }>();

/**
 * Create a cancellable PDF loading task from ArrayBuffer or URL
 */
export function createPdfLoadingTask(source: string | ArrayBuffer | Uint8Array) {
  const commonOptions: any = {
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/standard_fonts/',
    enableXfa: true,
    isEvalSupported: false,
    useSystemFonts: true,
  };

  if (typeof source === 'string') {
    return pdfjsLib.getDocument({
      url: source,
      ...commonOptions,
    });
  }
  return pdfjsLib.getDocument({
    data: source,
    ...commonOptions,
  });
}

/**
 * Load PDF document from ArrayBuffer or URL (resolves document)
 */
export async function loadPdfDocument(source: string | ArrayBuffer | Uint8Array) {
  const task = createPdfLoadingTask(source);
  return await task.promise;
}

const pdfDocMemoryCache = new Map<string, any>();

/**
 * Loads and caches PDF document in memory by key (e.g. courseId) to allow instant re-opening
 * and prevent white screens during course navigation
 */
export async function getCachedOrLoadPdfDocument(source: string | ArrayBuffer | Uint8Array, cacheKey?: string) {
  if (cacheKey && pdfDocMemoryCache.has(cacheKey)) {
    const existing = pdfDocMemoryCache.get(cacheKey);
    if (existing && !existing._destroyed && !existing.destroyed) {
      return existing;
    }
  }
  const doc = await loadPdfDocument(source);
  if (cacheKey) {
    pdfDocMemoryCache.set(cacheKey, doc);
  }
  return doc;
}

export function clearPdfDocCache(cacheKey?: string) {
  if (cacheKey) {
    const doc = pdfDocMemoryCache.get(cacheKey);
    if (doc) cleanDestroyPdf(doc);
    pdfDocMemoryCache.delete(cacheKey);
  } else {
    for (const doc of pdfDocMemoryCache.values()) {
      cleanDestroyPdf(doc);
    }
    pdfDocMemoryCache.clear();
  }
}

/**
 * Safely dispose and clean up a PDF document from memory
 */
export function cleanDestroyPdf(pdfDoc: any) {
  if (!pdfDoc) return;
  // If document is cached, don't destroy prematurely
  for (const [key, cached] of pdfDocMemoryCache.entries()) {
    if (cached === pdfDoc) {
      return; // Keep cached for navigation persistence
    }
  }
  try {
    if (typeof pdfDoc.cleanup === 'function') {
      pdfDoc.cleanup();
    }
  } catch (e) {
    console.warn('PDF doc cleanup warning:', e);
  }
  try {
    if (typeof pdfDoc.destroy === 'function') {
      pdfDoc.destroy();
    }
  } catch (e) {
    console.warn('PDF doc destroy warning:', e);
  }
}

/**
 * Extract clean textual content from a single page using page.getTextContent()
 */
export async function extractTextFromSinglePage(
  pdfDoc: any,
  pageNumber: number
): Promise<string> {
  if (!pdfDoc) return '';
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    if (!textContent || !Array.isArray(textContent.items)) return '';
    
    // Join items preserving line endings when hasEOL is true
    let result = '';
    for (const item of textContent.items) {
      if (!item) continue;
      const str = typeof item.str === 'string' ? item.str : '';
      if (!str) continue;
      result += str;
      if (item.hasEOL) {
        result += '\n';
      } else {
        result += ' ';
      }
    }
    return result.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn(`Error extracting text from page ${pageNumber}:`, err);
    return '';
  }
}

/**
 * Extract clean textual content from a specific range of pages [from, to]
 */
export async function extractPageRangeText(
  pdfDoc: any,
  startPage: number,
  endPage: number
): Promise<{ text: string; hasEnoughText: boolean }> {
  if (!pdfDoc) return { text: '', hasEnoughText: false };
  const from = Math.max(1, startPage);
  const to = Math.min(pdfDoc.numPages || 1, endPage);
  const pages: string[] = [];
  for (let p = from; p <= to; p++) {
    const pageText = await extractTextFromSinglePage(pdfDoc, p);
    if (pageText && pageText.trim().length > 0) {
      pages.push(`[صفحة ${p}]:\n${pageText.trim()}`);
    }
  }
  const joined = pages.join('\n\n').trim();
  return {
    text: joined,
    hasEnoughText: joined.length >= 20,
  };
}

/**
 * Extract clean textual content from PDF across ALL pages sequentially
 * With progress callback for UI feedback
 */
export async function extractAllPagesText(
  pdfDoc: any,
  onProgress?: (current: number, total: number) => void
): Promise<{
  text: string;
  hasEnoughText: boolean;
  pageCountExtracted: number;
  pagesWithTextCount: number;
  pageMap: Record<number, string>;
}> {
  if (!pdfDoc) {
    return { text: '', hasEnoughText: false, pageCountExtracted: 0, pagesWithTextCount: 0, pageMap: {} };
  }

  const total = pdfDoc.numPages || 1;
  const pagesText: string[] = [];
  const pageMap: Record<number, string> = {};
  let pagesWithTextCount = 0;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    try {
      if (onProgress) {
        onProgress(pageNum, total);
      }
      const pageText = await extractTextFromSinglePage(pdfDoc, pageNum);
      if (pageText && pageText.trim().length >= 10) {
        pagesText.push(`[صفحة ${pageNum}]:\n${pageText.trim()}`);
        pageMap[pageNum] = pageText.trim();
        pagesWithTextCount++;
      }
      // Yield to the browser event loop every page to avoid freezing the UI thread on large PDFs
      await new Promise((resolve) => setTimeout(resolve, 0));
    } catch (pageErr) {
      console.warn(`Skipping page ${pageNum} during full extraction:`, pageErr);
    }
  }

  const fullText = pagesText.join('\n\n').trim();
  const cleanChars = fullText.replace(/\[صفحة \d+\]:/g, '').trim();
  const hasEnoughText = cleanChars.length >= 30;

  return {
    text: fullText,
    hasEnoughText,
    pageCountExtracted: total,
    pagesWithTextCount,
    pageMap,
  };
}

/**
 * Extract clean textual content from PDF with optional page range using page.getTextContent()
 * Iterates through all target pages resiliently without stopping on empty or failed pages.
 */
export async function extractTextFromPdfDoc(
  pdfDoc: any,
  maxPages = 150,
  startPage = 1,
  endPage?: number,
  onProgress?: (current: number, total: number) => void
): Promise<{ text: string; hasEnoughText: boolean; pageCountExtracted: number; pagesWithTextCount: number }> {
  try {
    if (!pdfDoc) return { text: '', hasEnoughText: false, pageCountExtracted: 0, pagesWithTextCount: 0 };
    const total = pdfDoc.numPages || 1;
    const start = Math.max(1, Math.min(startPage, total));
    const targetEnd = endPage
      ? Math.max(start, Math.min(endPage, total))
      : Math.min(start + maxPages - 1, total);
    const pagesText: string[] = [];
    let pagesWithTextCount = 0;

    for (let pageNum = start; pageNum <= targetEnd; pageNum++) {
      try {
        if (onProgress) {
          onProgress(pageNum, targetEnd);
        }
        const pageText = await extractTextFromSinglePage(pdfDoc, pageNum);
        if (pageText && pageText.length >= 10) {
          pagesText.push(`[صفحة ${pageNum}]:\n${pageText}`);
          pagesWithTextCount++;
        }
        // Yield to prevent thread locking
        await new Promise((resolve) => setTimeout(resolve, 0));
      } catch (pageErr) {
        console.warn(`Skipping page ${pageNum} during text extraction:`, pageErr);
      }
    }

    const fullText = pagesText.join('\n\n').trim();
    const cleanChars = fullText.replace(/\[صفحة \d+\]:/g, '').trim();
    const hasEnoughText = cleanChars.length >= 30;

    return {
      text: fullText,
      hasEnoughText,
      pageCountExtracted: targetEnd - start + 1,
      pagesWithTextCount,
    };
  } catch (err) {
    console.warn('PDF text extraction error:', err);
    return { text: '', hasEnoughText: false, pageCountExtracted: 0, pagesWithTextCount: 0 };
  }
}

/**
 * Determine the most representative content page for scanned PDF visual fallback
 * (Avoiding blank flyleaves or cover pages when multi-page)
 */
export function getRepresentativeContentPage(pdfDoc: any): number {
  if (!pdfDoc || !pdfDoc.numPages) return 1;
  const total = pdfDoc.numPages;
  // If book has 3 or more pages, page 2 or 3 is usually the actual lesson/intro text rather than the cover
  if (total >= 3) return 2;
  if (total >= 2) return 2;
  return 1;
}

/**
 * Render a single page of PDF onto a canvas element with clean cancellation and mutex support
 */
export async function renderPdfPageToCanvas(
  pdfDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.3,
  onTaskCreated?: (task: any) => void
): Promise<void> {
  if (!pdfDoc || !canvas) return;

  // 1. If an existing render task is running on this specific canvas, cancel it cleanly
  const existing = canvasRenderTaskMap.get(canvas);
  if (existing?.task) {
    try {
      existing.task.cancel();
      await existing.promise.catch(() => {});
    } catch {}
    canvasRenderTaskMap.delete(canvas);
  }

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas completely before render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);
    if (onTaskCreated) onTaskCreated(renderTask);

    const renderPromise = renderTask.promise;
    canvasRenderTaskMap.set(canvas, { task: renderTask, promise: renderPromise });

    await renderPromise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      // Clean cancellation, do not throw or crash
      return;
    }
    console.warn(`Render notice on page ${pageNumber}:`, err?.message || err);
  } finally {
    const curr = canvasRenderTaskMap.get(canvas);
    if (curr?.task) {
      canvasRenderTaskMap.delete(canvas);
    }
  }
}

const thumbnailCache = new Map<string, ImageData>();

class ThumbnailQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private maxConcurrent = 1;

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
      this.processNext();
    });
  }

  private processNext() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const nextTask = this.queue.shift()!;
    nextTask().finally(() => {
      this.running--;
      this.processNext();
    });
  }
}

const thumbnailQueue = new ThumbnailQueue();

/**
 * Render a fast thumbnail of a PDF page with memory caching and serial execution queue
 */
export async function renderPdfThumbnail(
  pdfDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth: number = 90
): Promise<void> {
  if (!pdfDoc || !canvas) return;
  const cacheKey = `${pdfDoc.loadingTask?.docId || pdfDoc.fingerprint || 'doc'}_${pageNumber}_${targetWidth}`;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (thumbnailCache.has(cacheKey)) {
      const cached = thumbnailCache.get(cacheKey)!;
      canvas.width = cached.width;
      canvas.height = cached.height;
      ctx.putImageData(cached, 0, 0);
      return;
    }

    await thumbnailQueue.enqueue(async () => {
      if (!canvas || !pdfDoc) return;
      const innerCtx = canvas.getContext('2d');
      if (!innerCtx) return;

      const page = await pdfDoc.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = Math.max(0.12, targetWidth / unscaledViewport.width);
      const viewport = page.getViewport({ scale });

      canvas.height = Math.round(viewport.height);
      canvas.width = Math.round(viewport.width);

      innerCtx.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: innerCtx,
        viewport: viewport,
      }).promise;

      try {
        const imgData = innerCtx.getImageData(0, 0, canvas.width, canvas.height);
        thumbnailCache.set(cacheKey, imgData);
      } catch {}
    });
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.warn(`Thumbnail render error for page ${pageNumber}:`, err);
    }
  }
}

/**
 * Render a single page of PDF to a Base64 JPEG data URL for Multimodal Gemini fallback (scanned pages)
 */
export async function renderPdfPageToBase64Jpeg(
  pdfDoc: any,
  pageNumber: number,
  scale: number = 1.6
): Promise<string> {
  if (!pdfDoc) return '';
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn(`Error rendering page ${pageNumber} to JPEG:`, err);
    return '';
  }
}
