/**
 * Shape Recognition, Stroke Smoothing & Line/Bracket Snapping Engine
 * Designed for academic PDF annotation, margin bracketing, and note-taking.
 */

export interface Point {
  x: number;
  y: number;
}

export type RecognizedShapeType =
  | 'line'
  | 'bracket-corner' // 2 segments, 90° (∟, ┌, └, ┐)
  | 'bracket-open'   // 3 segments, 90° ([ or ] or U)
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'triangle';

export interface RecognizedShape {
  type: RecognizedShapeType;
  label: string; // Arabic label for toast/indicator e.g. "خط مستقيم", "قوس هامش", "مستطيل"
  points?: Point[];
  center?: Point;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
}

/**
 * Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Total path length along points
 */
export function getPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

/**
 * Bounding box of points
 */
export function getBoundingBox(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Perpendicular distance from a point to a line segment (a, b)
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);

  // Projection scalar t clamped to segment [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Ramer-Douglas-Peucker (RDP) polyline simplification algorithm
 */
export function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const recResults1 = simplifyRDP(points.slice(0, index + 1), epsilon);
    const recResults2 = simplifyRDP(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [start, end];
  }
}

/**
 * Smooth raw stroke points using moving average filter to remove micro-jitter
 */
export function smoothPointsMovingAverage(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const smoothed: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    // Weighted Gaussian-like kernel [0.25, 0.5, 0.25]
    smoothed.push({
      x: prev.x * 0.25 + curr.x * 0.5 + next.x * 0.25,
      y: prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25,
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Draw smoothed continuous path using midpoint quadratic curves
 */
export function drawSmoothedPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const smoothed = smoothPointsMovingAverage(points);

  ctx.beginPath();
  ctx.moveTo(smoothed[0].x, smoothed[0].y);

  if (smoothed.length === 2) {
    ctx.lineTo(smoothed[1].x, smoothed[1].y);
  } else {
    for (let i = 1; i < smoothed.length - 1; i++) {
      const midX = (smoothed[i].x + smoothed[i + 1].x) / 2;
      const midY = (smoothed[i].y + smoothed[i + 1].y) / 2;
      ctx.quadraticCurveTo(smoothed[i].x, smoothed[i].y, midX, midY);
    }
    ctx.lineTo(smoothed[smoothed.length - 1].x, smoothed[smoothed.length - 1].y);
  }
  ctx.stroke();
}

/**
 * Straight line snapping helper:
 * Snaps to exact horizontal (0°) or exact vertical (90°) if within ±15 degrees,
 * or draws clean straight line between start and end.
 */
export function snapStraightLine(startPt: Point, endPt: Point): Point {
  const deltaX = endPt.x - startPt.x;
  const deltaY = endPt.y - startPt.y;
  const dist = Math.hypot(deltaX, deltaY);

  if (dist > 15) {
    const angle = Math.abs(Math.atan2(deltaY, deltaX));
    // Horizontal alignment (0 rad or PI rad within ~16 degrees)
    const isHorizontal =
      Math.abs(deltaY) < 20 || angle < 0.28 || Math.abs(Math.PI - angle) < 0.28;
    if (isHorizontal) {
      return { x: endPt.x, y: startPt.y };
    }

    // Vertical alignment (PI/2 rad within ~16 degrees)
    const isVertical =
      Math.abs(deltaX) < 20 || Math.abs(angle - Math.PI / 2) < 0.28;
    if (isVertical) {
      return { x: startPt.x, y: endPt.y };
    }
  }

  return { x: endPt.x, y: endPt.y };
}

/**
 * Shape Recognition Algorithm:
 * Evaluates the drawn stroke points on Hold (~400ms) and classifies it into:
 * - Straight line (with horizontal/vertical snap)
 * - Margin brackets (2-segment corner ∟ or 3-segment [ bracket)
 * - Circle or Ellipse
 * - Rectangle or Square
 * - Triangle
 */
export function recognizeShape(rawPoints: Point[]): RecognizedShape {
  if (rawPoints.length < 3) {
    const start = rawPoints[0] || { x: 0, y: 0 };
    const end = rawPoints[rawPoints.length - 1] || start;
    const snapped = snapStraightLine(start, end);
    return {
      type: 'line',
      label: 'خط مستقيم',
      points: [start, snapped],
    };
  }

  const startPt = rawPoints[0];
  const endPt = rawPoints[rawPoints.length - 1];
  const totalLength = getPathLength(rawPoints);
  const endToEndDist = distance(startPt, endPt);
  const bbox = getBoundingBox(rawPoints);
  const diagonal = Math.hypot(bbox.width, bbox.height);

  // Check if stroke is closed or nearly closed (start meets end)
  const isClosed = endToEndDist < Math.max(diagonal * 0.32, 28) || endToEndDist < totalLength * 0.25;

  // 1. =======================================================================
  // CLOSED SHAPES: Circle, Ellipse, Rectangle, Triangle
  // =======================================================================
  if (isClosed && diagonal > 20) {
    // A) Circle / Ellipse Detection
    const centerX = bbox.centerX;
    const centerY = bbox.centerY;
    const radii: number[] = rawPoints.map((p) => Math.hypot(p.x - centerX, p.y - centerY));
    const avgRadius = radii.reduce((acc, r) => acc + r, 0) / radii.length;
    const variance =
      radii.reduce((acc, r) => acc + Math.pow(r - avgRadius, 2), 0) / radii.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (avgRadius || 1); // Coefficient of variation

    const aspectRatio = bbox.width / bbox.height;

    // Check circularity
    if (cv < 0.26 && avgRadius > 10) {
      if (aspectRatio >= 0.8 && aspectRatio <= 1.25) {
        // Crisp Perfect Circle
        const radius = (bbox.width + bbox.height) / 4;
        return {
          type: 'circle',
          label: 'دائرة منتظمة',
          center: { x: centerX, y: centerY },
          radius,
        };
      } else {
        // Crisp Ellipse
        return {
          type: 'ellipse',
          label: 'شكل بيضاوي',
          center: { x: centerX, y: centerY },
          radiusX: bbox.width / 2,
          radiusY: bbox.height / 2,
        };
      }
    }

    // B) Polygons (Triangle or Rectangle/Square) using RDP with adaptive epsilon
    const epsilon = Math.max(diagonal * 0.12, 10);
    const simplified = simplifyRDP(rawPoints, epsilon);
    const cornerCount = simplified.length - 1; // last point connects back to start

    if (cornerCount === 3) {
      // Crisp Triangle
      const p1 = simplified[0];
      const p2 = simplified[1];
      const p3 = simplified[2];
      return {
        type: 'triangle',
        label: 'مثلث متناسق',
        points: [p1, p2, p3, p1],
      };
    }

    // Rectangle or Square
    const isSquare = Math.abs(bbox.width - bbox.height) / Math.max(bbox.width, bbox.height) < 0.16;
    let rectPoints: Point[];

    if (isSquare) {
      const side = (bbox.width + bbox.height) / 2;
      const x0 = centerX - side / 2;
      const y0 = centerY - side / 2;
      rectPoints = [
        { x: x0, y: y0 },
        { x: x0 + side, y: y0 },
        { x: x0 + side, y: y0 + side },
        { x: x0, y: y0 + side },
        { x: x0, y: y0 },
      ];
      return {
        type: 'rectangle',
        label: 'مربع منتظم',
        points: rectPoints,
      };
    } else {
      rectPoints = [
        { x: bbox.minX, y: bbox.minY },
        { x: bbox.maxX, y: bbox.minY },
        { x: bbox.maxX, y: bbox.maxY },
        { x: bbox.minX, y: bbox.maxY },
        { x: bbox.minX, y: bbox.minY },
      ];
      return {
        type: 'rectangle',
        label: 'مستطيل منتظم',
        points: rectPoints,
      };
    }
  }

  // 2. =======================================================================
  // OPEN SHAPES: Margin Brackets & Lines
  // =======================================================================

  // Test for Margin Brackets using RDP with epsilon tuned for right angles
  const openEpsilon = Math.max(diagonal * 0.12, 12);
  const openSimplified = simplifyRDP(rawPoints, openEpsilon);

  // A) 3-segment open bracket: [ or ] or U (Margin Bracket for paragraphs)
  // Usually has 4 points: start -> corner1 -> corner2 -> end
  if (openSimplified.length === 4) {
    const [p0, p1, p2, p3] = openSimplified;
    const seg1Len = distance(p0, p1);
    const seg2Len = distance(p1, p2);
    const seg3Len = distance(p2, p3);

    // Spine is usually the longer middle segment (seg2)
    if (seg2Len > 15 && seg1Len > 8 && seg3Len > 8) {
      // Determine if spine is vertical (margin along page) or horizontal
      const isVerticalSpine = Math.abs(p2.y - p1.y) > Math.abs(p2.x - p1.x);

      if (isVerticalSpine) {
        // Vertical margin bracket: [ or ]
        const spineX = (p1.x + p2.x) / 2;
        const topY = Math.min(p1.y, p2.y);
        const bottomY = Math.max(p1.y, p2.y);
        // Arms are horizontal
        const armLength = (seg1Len + seg3Len) / 2;
        // Direction of arms: left (-1) or right (+1)
        const dir1 = p0.x < spineX ? -1 : 1;
        const dir2 = p3.x < spineX ? -1 : 1;
        const avgDir = dir1 === dir2 ? dir1 : p0.x < spineX ? -1 : 1;

        const armEndX = spineX + avgDir * armLength;
        const bracketPoints: Point[] = [
          { x: armEndX, y: topY },
          { x: spineX, y: topY },
          { x: spineX, y: bottomY },
          { x: armEndX, y: bottomY },
        ];

        return {
          type: 'bracket-open',
          label: 'قوس هامش ثلاثي [ ]',
          points: bracketPoints,
        };
      } else {
        // Horizontal bracket (top/bottom)
        const spineY = (p1.y + p2.y) / 2;
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        const armLength = (seg1Len + seg3Len) / 2;
        const dir = p0.y < spineY ? -1 : 1;
        const armEndY = spineY + dir * armLength;

        const bracketPoints: Point[] = [
          { x: leftX, y: armEndY },
          { x: leftX, y: spineY },
          { x: rightX, y: spineY },
          { x: rightX, y: armEndY },
        ];

        return {
          type: 'bracket-open',
          label: 'قوس هامش ثلاثي [ ]',
          points: bracketPoints,
        };
      }
    }
  }

  // B) 2-segment corner bracket: ∟, ┌, └, ┐ (half-square or L-corner)
  // Has 3 points: start -> corner -> end
  if (openSimplified.length === 3) {
    const [p0, p1, p2] = openSimplified;
    const seg1Len = distance(p0, p1);
    const seg2Len = distance(p1, p2);

    if (seg1Len > 12 && seg2Len > 12) {
      // Calculate angle at corner P1
      const a1 = Math.atan2(p0.y - p1.y, p0.x - p1.x);
      const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let diffAngle = Math.abs(a1 - a2);
      if (diffAngle > Math.PI) diffAngle = 2 * Math.PI - diffAngle;

      // If angle is roughly perpendicular (between 60° and 120°):
      if (diffAngle >= Math.PI * 0.33 && diffAngle <= Math.PI * 0.67) {
        // Snap segments to strict 90° horizontal & vertical
        const isP0Horizontal = Math.abs(p0.x - p1.x) > Math.abs(p0.y - p1.y);
        let snappedP0: Point;
        let snappedP2: Point;

        if (isP0Horizontal) {
          // p0 -> p1 is horizontal, p1 -> p2 is vertical
          snappedP0 = { x: p0.x, y: p1.y };
          snappedP2 = { x: p1.x, y: p2.y };
        } else {
          // p0 -> p1 is vertical, p1 -> p2 is horizontal
          snappedP0 = { x: p1.x, y: p0.y };
          snappedP2 = { x: p2.x, y: p1.y };
        }

        return {
          type: 'bracket-corner',
          label: 'زاوية هامش 90° (∟)',
          points: [snappedP0, p1, snappedP2],
        };
      }
    }
  }

  // C) Straight Line (default for open strokes held at the end)
  const snappedEnd = snapStraightLine(startPt, endPt);
  return {
    type: 'line',
    label: 'خط مستقيم',
    points: [startPt, snappedEnd],
  };
}

/**
 * Render a recognized shape onto a 2D canvas context
 */
export function drawRecognizedShape(
  ctx: CanvasRenderingContext2D,
  shape: RecognizedShape
): void {
  ctx.beginPath();

  if (shape.type === 'circle' && shape.center && shape.radius) {
    ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (shape.type === 'ellipse' && shape.center && shape.radiusX && shape.radiusY) {
    ctx.ellipse(
      shape.center.x,
      shape.center.y,
      shape.radiusX,
      shape.radiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    return;
  }

  if (shape.points && shape.points.length > 0) {
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    if (shape.type === 'rectangle' || shape.type === 'triangle') {
      ctx.closePath();
    }
    ctx.stroke();
  }
}
