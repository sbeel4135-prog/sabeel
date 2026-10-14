import { jsPDF } from 'jspdf';

export interface SummaryPdfPayload {
  courseTitle: string;
  instructorName?: string;
  lectureTitle: string;
  lectureDate: string;
  transcript?: string;
  summary: {
    mainTopics: string[];
    scientificIssues: string[];
    benefitsAndRules: string[];
  };
}

// SVG path of the Arabic letter Seen (س) from /public/sabeel-logo.svg
const SABEEL_SEEN_PATH =
  'M 374 154 C 382 178 395 208 395 233 C 395 249 388 257 376 255 C 358 252 349 229 344 209 C 338 227 329 257 310 261 C 292 264 282 245 278 225 C 275 253 266 287 244 313 C 214 348 168 359 128 333 C 102 315 88 285 88 253 C 88 239 94 231 100 233 C 107 235 105 253 110 267 C 120 295 146 317 178 317 C 212 317 238 291 250 259 C 260 227 264 191 262 155 C 270 157 274 165 275 175 C 276 199 282 233 298 239 C 310 243 320 229 324 215 C 328 195 329 173 330 153 C 338 155 343 163 344 173 C 348 195 353 227 370 231 C 378 233 381 223 380 211 C 378 191 370 169 366 151 Z';

/**
 * Helper to wrap RTL Arabic text into lines that fit within maxWidth
 */
function wrapArabicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      continue;
    }
    const words = trimmed.split(/\s+/);
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
  }

  return lines.length > 0 ? lines : ['—'];
}

/**
 * Draws the Sabeel Seen (س) icon at a specific box position and opacity
 */
function drawSabeelLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options: { isWatermark?: boolean; opacity?: number } = {}
) {
  ctx.save();
  ctx.globalAlpha = options.opacity ?? 1;

  const scale = size / 512;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (!options.isWatermark) {
    // Draw rounded icon box for header logo
    ctx.fillStyle = '#faf8f4';
    ctx.strokeStyle = '#d5ded7';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(24, 24, 464, 464, 110);
    ctx.fill();
    ctx.stroke();
  }

  // Diagonal line above Seen
  ctx.strokeStyle = options.isWatermark ? '#2e493b' : '#68836b';
  ctx.lineWidth = options.isWatermark ? 8 : 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(198, 200);
  ctx.lineTo(350, 115);
  ctx.stroke();

  // Seen Calligraphy Path
  const path = new Path2D(SABEEL_SEEN_PATH);
  ctx.fillStyle = options.isWatermark ? '#2e493b' : '#4a6b55';
  ctx.fill(path);

  ctx.restore();
}

/**
 * Generates and downloads an academic A4 portrait PDF for a lecture summary
 */
export async function exportLectureSummaryAsPdf(payload: SummaryPdfPayload): Promise<void> {
  // Wait for fonts (such as Amiri) to be ready in the browser
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // continue
    }
  }

  // High-DPI A4 Canvas dimensions (210mm x 297mm at ~150 DPI -> 1240 x 1754)
  const PAGE_W = 1240;
  const PAGE_H = 1754;
  const MARGIN_X = 90;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const TOP_START_Y = 250;
  const BOTTOM_LIMIT_Y = PAGE_H - 130;

  const fontFamily = '"Amiri", "Traditional Arabic", "Noto Naskh Arabic", serif';

  const pages: HTMLCanvasElement[] = [];
  let currentCanvas = document.createElement('canvas');
  let ctx = currentCanvas.getContext('2d')!;

  const initNewPage = () => {
    const c = document.createElement('canvas');
    c.width = PAGE_W;
    c.height = PAGE_H;
    const context = c.getContext('2d')!;

    // 1. Clean Warm Ivory Academic Paper Background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle page border frame
    context.strokeStyle = '#e5e7eb';
    context.lineWidth = 2;
    context.strokeRect(48, 48, PAGE_W - 96, PAGE_H - 96);

    // 2. Centered Watermark (Sabeel Seen logo at ~0.05 opacity)
    const wmSize = 540;
    drawSabeelLogo(context, (PAGE_W - wmSize) / 2, (PAGE_H - wmSize) / 2, wmSize, {
      isWatermark: true,
      opacity: 0.05,
    });

    // 3. Top Header
    context.save();
    context.direction = 'rtl';
    context.textAlign = 'right';

    // Logo on the top right
    const logoSize = 68;
    const logoX = PAGE_W - MARGIN_X - logoSize;
    const logoY = 82;
    drawSabeelLogo(context, logoX, logoY, logoSize, { isWatermark: false, opacity: 1 });

    // Platform Name next to Logo
    context.fillStyle = '#1f3328';
    context.font = `bold 30px ${fontFamily}`;
    context.fillText('سَبيل - رفيقك في رحلتك العلمية', logoX - 18, 118);

    // Lecture Metadata Line: [اسم المقرر] · [تاريخ المحاضرة] · [اسم المحاضر/الموضوع]
    const topicOrInstructor = payload.instructorName
      ? `${payload.lectureTitle} (${payload.instructorName})`
      : payload.lectureTitle;
    const metaLine = `${payload.courseTitle}  ·  ${payload.lectureDate}  ·  ${topicOrInstructor}`;
    context.fillStyle = '#4b5563';
    context.font = `21px ${fontFamily}`;
    context.fillText(metaLine, logoX - 18, 152);

    // Header separator line
    context.strokeStyle = '#2e493b';
    context.globalAlpha = 0.25;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(MARGIN_X, 182);
    context.lineTo(PAGE_W - MARGIN_X, 182);
    context.stroke();
    context.restore();

    pages.push(c);
    currentCanvas = c;
    ctx = context;
  };

  initNewPage();
  let cursorY = TOP_START_Y;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > BOTTOM_LIMIT_Y) {
      initNewPage();
      cursorY = TOP_START_Y;
    }
  };

  // Document Main Title Banner
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f7f4';
  ctx.strokeStyle = '#cbd8ce';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(MARGIN_X, cursorY - 36, CONTENT_W, 74, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1f3328';
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.fillText(`ملخص محاضرة: ${payload.lectureTitle}`, PAGE_W / 2, cursorY + 10);
  ctx.restore();
  cursorY += 72;

  // Helper to render a structured academic table/box section
  const renderSectionTable = (
    sectionNumber: string,
    sectionTitle: string,
    items: string[],
    accentColor: string,
    headerBg: string
  ) => {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    // Measure wrapped lines for each bullet point
    ctx.font = `23px ${fontFamily}`;
    const rowBlocks: string[][] = items.map((item) =>
      wrapArabicText(ctx, item, CONTENT_W - 85)
    );

    const headerHeight = 52;
    ensureSpace(headerHeight + 70);

    // Draw Section Header Row
    ctx.fillStyle = headerBg;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(MARGIN_X, cursorY, CONTENT_W, headerHeight, [12, 12, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Section Title Text
    ctx.fillStyle = accentColor;
    ctx.font = `bold 25px ${fontFamily}`;
    ctx.fillText(
      `${sectionNumber}. ${sectionTitle}`,
      PAGE_W - MARGIN_X - 20,
      cursorY + 34
    );
    cursorY += headerHeight;

    // Draw each item row in a structured table style
    rowBlocks.forEach((lines, idx) => {
      const lineHeight = 36;
      const rowPadding = 22;
      const rowHeight = lines.length * lineHeight + rowPadding;

      if (cursorY + rowHeight > BOTTOM_LIMIT_Y) {
        initNewPage();
        cursorY = TOP_START_Y;
      }

      // Table row background (very subtle alternating tint, transparent enough to keep watermark visible)
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#fafbfa';
      ctx.fillRect(MARGIN_X, cursorY, CONTENT_W, rowHeight);
      ctx.restore();

      // Table row border
      ctx.strokeStyle = '#d8e0da';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(MARGIN_X, cursorY, CONTENT_W, rowHeight);

      // Bullet / Number cell indicator on the right
      ctx.fillStyle = accentColor;
      ctx.font = `bold 21px ${fontFamily}`;
      ctx.fillText(`•`, PAGE_W - MARGIN_X - 22, cursorY + 34);

      // Text lines
      ctx.fillStyle = '#1f2937';
      ctx.font = `23px ${fontFamily}`;
      lines.forEach((line, lineIdx) => {
        ctx.fillText(
          line,
          PAGE_W - MARGIN_X - 48,
          cursorY + 34 + lineIdx * lineHeight
        );
      });

      cursorY += rowHeight;
    });

    cursorY += 34;
    ctx.restore();
  };

  // Render the 3 Structured Academic Sections:
  // 1) النقاط الجوهرية وأبرز المحاور
  renderSectionTable(
    'أولاً',
    'النقاط الجوهرية وأبرز المحاور',
    payload.summary.mainTopics.length > 0
      ? payload.summary.mainTopics
      : ['لم ترد محاور إضافية في هذا التسجيل.'],
    '#2e493b',
    '#eef3ef'
  );

  // 2) المسائل الفقهية والعلمية والأدلة
  renderSectionTable(
    'ثانياً',
    'المسائل الفقهية والعلمية والأدلة المذكورة',
    payload.summary.scientificIssues.length > 0
      ? payload.summary.scientificIssues
      : ['لم تُذكر مسائل فقهية إضافية في هذا التسجيل.'],
    '#1e3a2f',
    '#f2f6f3'
  );

  // 3) الفوائد والفرائد والضوابط المستنبطة
  renderSectionTable(
    'ثالثاً',
    'الفوائد والفرائد والضوابط المستنبطة',
    payload.summary.benefitsAndRules.length > 0
      ? payload.summary.benefitsAndRules
      : ['لم ترد فوائد أو ضوابط إضافية في هذا التسجيل.'],
    '#14532d',
    '#ecfdf5'
  );

  // 4) Optional Verbatim Transcript if present
  if (payload.transcript && payload.transcript.trim()) {
    renderSectionTable(
      'رابعاً',
      'النص المفرّغ للمحاضرة',
      [payload.transcript.trim()],
      '#374151',
      '#f3f4f6'
    );
  }

  // 5. Footer on every page: ONLY the page number centered at the bottom without any extra words
  const totalPages = pages.length;
  pages.forEach((pageCanvas, index) => {
    const pageCtx = pageCanvas.getContext('2d')!;
    pageCtx.save();
    pageCtx.direction = 'rtl';
    pageCtx.textAlign = 'center';
    pageCtx.fillStyle = '#4b5563';
    pageCtx.font = `bold 22px ${fontFamily}`;
    pageCtx.fillText(`${index + 1}`, PAGE_W / 2, PAGE_H - 72);
    pageCtx.restore();
  });

  // 6. Assemble A4 Portrait PDF using jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  pages.forEach((pageCanvas, idx) => {
    if (idx > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  });

  // Clean filename: تلخيص_[اسم المقرر]_[التاريخ].pdf
  const safeCourse = payload.courseTitle.trim().replace(/[\\/:*?"<>|]/g, '_');
  const safeDate = payload.lectureDate.trim().replace(/[\\/:*?"<>|\s]/g, '-');
  const fileName = `تلخيص_${safeCourse}_${safeDate}.pdf`;

  pdf.save(fileName);
}

export const exportLectureSummaryPdf = exportLectureSummaryAsPdf;

