import { jsPDF } from 'jspdf';
import { Course, LectureItem } from '../types';
import { SABEEL_LOGO_BASE64 } from '../assets/sabeelLogoBase64';

/**
 * Generates and downloads an academic A4 PDF for a lecture summary directly from the browser.
 * Renders Arabic typography, header with Sabeel logo, subtle watermark (opacity ~0.05),
 * structured sections, and a bottom centered page number footer onto high-DPI A4 canvases
 * to guarantee 100% accurate Arabic RTL shaping and Classical Amiri/Traditional Arabic typography.
 */
export async function exportSummaryAsAcademicPdf(course: Course, lecture: LectureItem): Promise<void> {
  // Ensure fonts are loaded if supported
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // Prepare filename: تلخيص_[اسم المقرر]_[التاريخ].pdf
  const safeCourseName = (course.title || 'مقرر').replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeDate = (lecture.date || new Date().toLocaleDateString('ar-SA'))
    .replace(/[\\/:*?"<>|\s]/g, '-')
    .trim();
  const fileName = `تلخيص_${safeCourseName}_${safeDate}.pdf`;

  // Load Sabeel high-DPI transparent logo image from Base64
  const loadLogoImage = (): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = SABEEL_LOGO_BASE64;
    });
  };

  const logoImg = await loadLogoImage();

  // Build structured blocks for pagination across A4 pages
  interface RenderBlock {
    type: 'section-header' | 'bullet' | 'paragraph' | 'table-row';
    title?: string;
    badge?: string;
    text?: string;
    col1?: string;
    col2?: string;
    accentColor?: string;
    bgColor?: string;
  }

  const blocks: RenderBlock[] = [];

  if (lecture.summary) {
    // 1. النقاط الجوهرية وأبرز المحاور
    blocks.push({
      type: 'section-header',
      badge: 'أولاً',
      title: 'النقاط الجوهرية وأبرز المحاور',
      accentColor: '#2e493b',
      bgColor: '#f2f6f3',
    });

    const mainTopics = lecture.summary.mainTopics || [];
    if (mainTopics.length > 0) {
      mainTopics.forEach((item, idx) => {
        blocks.push({
          type: 'table-row',
          col1: `المحور ${idx + 1}`,
          col2: item,
        });
      });
    } else {
      blocks.push({ type: 'bullet', text: 'لم ترد محاور في هذا التسجيل.' });
    }

    // 2. المسائل الفقهية والعلمية والأدلة
    blocks.push({
      type: 'section-header',
      badge: 'ثانياً',
      title: 'المسائل الفقهية والعلمية والأدلة المذكورة',
      accentColor: '#20352a',
      bgColor: '#f5f7f5',
    });

    const issues = lecture.summary.scientificIssues || [];
    if (issues.length > 0) {
      issues.forEach((item, idx) => {
        blocks.push({
          type: 'table-row',
          col1: `المسألة ${idx + 1}`,
          col2: item,
        });
      });
    } else {
      blocks.push({ type: 'bullet', text: 'لم تُذكر مسائل فقهية أو أدلة في هذا التسجيل.' });
    }

    // 3. الفوائد والفرائد والضوابط المستنبطة
    blocks.push({
      type: 'section-header',
      badge: 'ثالثاً',
      title: 'الفوائد والفرائد والضوابط المستنبطة',
      accentColor: '#14532d',
      bgColor: '#eef7f1',
    });

    const benefits = lecture.summary.benefitsAndRules || [];
    if (benefits.length > 0) {
      benefits.forEach((item) => {
        blocks.push({
          type: 'bullet',
          text: item,
        });
      });
    } else {
      blocks.push({ type: 'bullet', text: 'لم ترد فوائد أو ضوابط في هذا التسجيل.' });
    }
  }

  // Optional Verbatim Transcript if present
  if (lecture.transcript) {
    blocks.push({
      type: 'section-header',
      badge: 'رابعاً',
      title: 'النص المفرّغ للمحاضرة (مطابق لكلام المحاضر)',
      accentColor: '#3a5d4a',
      bgColor: '#f7f7f5',
    });

    const paragraphs = lecture.transcript
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    paragraphs.forEach((p) => {
      blocks.push({
        type: 'paragraph',
        text: p,
      });
    });
  }

  // A4 dimensions in pixels at 2x scale (794 x 1123 base -> 1588 x 2246)
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const SCALE = 2;
  const MARGIN_X = 56;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const HEADER_H = 148;
  const FOOTER_H = 60;

  const fontStack = `'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', serif`;

  // Helper to wrap Arabic RTL text accurately using canvas measureText
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [''];
  };

  // Create measurement context
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  // Pre-calculate block heights and paginate
  interface LayoutBlock extends RenderBlock {
    lines: string[];
    height: number;
  }

  const layoutBlocks: LayoutBlock[] = blocks.map((b) => {
    if (b.type === 'section-header') {
      return { ...b, lines: [b.title || ''], height: 48 };
    }
    if (b.type === 'table-row') {
      mCtx.font = `18px ${fontStack}`;
      const col2Width = CONTENT_W - 135;
      const lines = wrapText(mCtx, b.col2 || '', col2Width);
      const height = Math.max(42, lines.length * 28 + 18);
      return { ...b, lines, height };
    }
    if (b.type === 'bullet') {
      mCtx.font = `18px ${fontStack}`;
      const lines = wrapText(mCtx, b.text || '', CONTENT_W - 36);
      const height = lines.length * 28 + 14;
      return { ...b, lines, height };
    }
    // paragraph
    mCtx.font = `17px ${fontStack}`;
    const lines = wrapText(mCtx, b.text || '', CONTENT_W - 24);
    const height = lines.length * 28 + 16;
    return { ...b, lines, height };
  });

  // Group into pages
  const pages: LayoutBlock[][] = [];
  let currentPageBlocks: LayoutBlock[] = [];
  let currentY = HEADER_H + 16;
  const maxContentY = PAGE_H - FOOTER_H - 16;

  for (const lb of layoutBlocks) {
    // Avoid orphaned section headers at bottom of page
    const minNeeded = lb.type === 'section-header' ? lb.height + 55 : lb.height;
    if (currentY + minNeeded > maxContentY && currentPageBlocks.length > 0) {
      pages.push(currentPageBlocks);
      currentPageBlocks = [];
      currentY = 70; // Subsequent pages have a compact top margin
    }
    currentPageBlocks.push(lb);
    currentY += lb.height + 8;
  }
  if (currentPageBlocks.length > 0 || pages.length === 0) {
    pages.push(currentPageBlocks);
  }

  // Initialize jsPDF A4 portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Render each page onto a high-DPI canvas and add to PDF
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage();
    }

    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // 1. Page Background (Warm Academic Ivory White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle double academic page frame
    ctx.strokeStyle = 'rgba(46, 73, 59, 0.18)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(28, 28, PAGE_W - 56, PAGE_H - 56);

    // 2. Center Watermark: High-Resolution Transparent Sabeel Logo with very low opacity (~0.05)
    ctx.save();
    ctx.globalAlpha = 0.05;
    if (logoImg) {
      const ratio = logoImg.naturalWidth && logoImg.naturalHeight ? logoImg.naturalWidth / logoImg.naturalHeight : 1.59;
      const wmW = 380;
      const wmH = wmW / ratio;
      ctx.drawImage(
        logoImg,
        (PAGE_W - wmW) / 2,
        (PAGE_H - wmH) / 2,
        wmW,
        wmH
      );
    } else {
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 240px ${fontStack}`;
      ctx.fillStyle = '#35523f';
      ctx.fillText('سَبِيل', PAGE_W / 2, PAGE_H / 2);
    }
    ctx.restore();

    // 3. Top Header
    let cursorY = 54;
    if (pageIdx === 0) {
      // Header Box
      ctx.fillStyle = '#f8faf8';
      ctx.beginPath();
      ctx.roundRect(MARGIN_X, 46, CONTENT_W, 92, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(46, 73, 59, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Official High-DPI Transparent Sabeel Logo on the right side of the header (preserving aspect ratio)
      let logoHeaderWidth = 0;
      if (logoImg) {
        const ratio = logoImg.naturalWidth && logoImg.naturalHeight ? logoImg.naturalWidth / logoImg.naturalHeight : 1.59;
        const logoH = 54;
        const logoW = Math.round(logoH * ratio);
        logoHeaderWidth = logoW;
        ctx.drawImage(logoImg, PAGE_W - MARGIN_X - logoW - 16, 65, logoW, logoH);
      }

      // Platform Name: «سَبيل - رفيقك في رحلتك العلمية»
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1f3328';
      ctx.font = `bold 22px ${fontStack}`;
      const headerTextRightX = PAGE_W - MARGIN_X - (logoImg ? logoHeaderWidth + 30 : 20);
      ctx.fillText('سَبيل - رفيقك في رحلتك العلمية', headerTextRightX, 80);

      // Lecture Metadata Line: [اسم المقرر] · [تاريخ المحاضرة] · [اسم المحاضر/الموضوع]
      ctx.fillStyle = '#3a5d4a';
      ctx.font = `bold 15px ${fontStack}`;
      const topicOrInstructor = lecture.title
        ? `${lecture.title}${course.instructor ? ` (${course.instructor})` : ''}`
        : course.instructor || 'محاضرة دراسية';
      const metaLine = `${course.title}  ·  ${lecture.date}  ·  ${topicOrInstructor}`;
      ctx.fillText(metaLine, headerTextRightX, 112);

      cursorY = HEADER_H + 18;
    } else {
      // Compact running header on subsequent pages
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#5a7062';
      ctx.font = `13px ${fontStack}`;
      ctx.fillText(
        `سَبيل - رفيقك في رحلتك العلمية  |  ${course.title}  ·  ${lecture.title}`,
        PAGE_W - MARGIN_X,
        52
      );
      ctx.strokeStyle = 'rgba(46, 73, 59, 0.15)';
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, 62);
      ctx.lineTo(PAGE_W - MARGIN_X, 62);
      ctx.stroke();
      cursorY = 78;
    }

    // 4. Render Page Blocks
    const pageBlocks = pages[pageIdx];
    for (const block of pageBlocks) {
      if (block.type === 'section-header') {
        ctx.fillStyle = block.bgColor || '#f2f6f3';
        ctx.beginPath();
        ctx.roundRect(MARGIN_X, cursorY, CONTENT_W, 38, 8);
        ctx.fill();

        // Right accent bar
        ctx.fillStyle = block.accentColor || '#2e493b';
        ctx.beginPath();
        ctx.roundRect(PAGE_W - MARGIN_X - 6, cursorY, 6, 38, 3);
        ctx.fill();

        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = block.accentColor || '#20352a';
        ctx.font = `bold 19px ${fontStack}`;
        const headerTitle = block.badge ? `${block.badge}: ${block.title}` : block.title || '';
        ctx.fillText(headerTitle, PAGE_W - MARGIN_X - 18, cursorY + 25);

        cursorY += block.height + 8;
      } else if (block.type === 'table-row') {
        // Structured Table Row
        ctx.fillStyle = '#fcfdfc';
        ctx.beginPath();
        ctx.roundRect(MARGIN_X, cursorY, CONTENT_W, block.height, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(46, 73, 59, 0.16)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Column divider (Right column 115px wide for label)
        const dividerX = PAGE_W - MARGIN_X - 115;
        ctx.fillStyle = '#f4f7f4';
        ctx.beginPath();
        ctx.roundRect(dividerX, cursorY, 115, block.height, 6);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(dividerX, cursorY);
        ctx.lineTo(dividerX, cursorY + block.height);
        ctx.stroke();

        // Col 1 Label
        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2e493b';
        ctx.font = `bold 16px ${fontStack}`;
        ctx.fillText(block.col1 || '', dividerX + 57.5, cursorY + 26);

        // Col 2 Wrapped Lines
        ctx.textAlign = 'right';
        ctx.fillStyle = '#20352a';
        ctx.font = `18px ${fontStack}`;
        block.lines.forEach((line, lIdx) => {
          ctx.fillText(line, dividerX - 14, cursorY + 26 + lIdx * 28);
        });

        cursorY += block.height + 6;
      } else if (block.type === 'bullet') {
        // Ordered / Bullet Point
        ctx.fillStyle = '#2e493b';
        ctx.beginPath();
        ctx.arc(PAGE_W - MARGIN_X - 10, cursorY + 18, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#20352a';
        ctx.font = `18px ${fontStack}`;
        block.lines.forEach((line, lIdx) => {
          ctx.fillText(line, PAGE_W - MARGIN_X - 24, cursorY + 24 + lIdx * 28);
        });

        cursorY += block.height + 6;
      } else if (block.type === 'paragraph') {
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#2b3d32';
        ctx.font = `17px ${fontStack}`;
        block.lines.forEach((line, lIdx) => {
          ctx.fillText(line, PAGE_W - MARGIN_X - 12, cursorY + 24 + lIdx * 28);
        });
        cursorY += block.height + 6;
      }
    }

    // 5. Footer: ONLY the page number in the bottom center without any extra phrases
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a5d50';
    ctx.font = `bold 15px ${fontStack}`;
    ctx.fillText(`${pageIdx + 1}`, PAGE_W / 2, PAGE_H - 42);

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  pdf.save(fileName);
}
