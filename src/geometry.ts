import type { Element, Point, View } from './types';

export const HAND_FONT = '"Architects Daughter", "Comic Sans MS", cursive';
export const LINE_HEIGHT = 1.25;

let idCounter = 0;
export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (idCounter++).toString(36);
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

export function center(el: Element): Point {
  return [el.x + el.width / 2, el.y + el.height / 2];
}

/** Axis-aligned bounds of the element after rotation. */
export function elementBounds(el: Element): [number, number, number, number] {
  const [cx, cy] = center(el);
  if (el.points && (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw')) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of el.points) {
      const [rx, ry] = rotatePoint(el.x + px, el.y + py, cx, cy, el.angle);
      minX = Math.min(minX, rx); minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx); maxY = Math.max(maxY, ry);
    }
    return [minX, minY, maxX, maxY];
  }
  const corners: Point[] = [
    [el.x, el.y], [el.x + el.width, el.y], [el.x + el.width, el.y + el.height], [el.x, el.y + el.height],
  ].map(([px, py]) => rotatePoint(px, py, cx, cy, el.angle));
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function commonBounds(els: Element[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    const [a, b, c, d] = elementBounds(el);
    minX = Math.min(minX, a); minY = Math.min(minY, b);
    maxX = Math.max(maxX, c); maxY = Math.max(maxY, d);
  }
  return [minX, minY, maxX, maxY];
}

/** Normalise points so the minimum is at 0,0 and update x/y/width/height. */
export function normalizePoints(el: Element): Element {
  if (!el.points || el.points.length === 0) return el;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of el.points) {
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  // keep the rotation centre stable: compute new centre in world space
  const oldC = center(el);
  const localNewC: Point = [el.x + minX + w / 2, el.y + minY + h / 2];
  const worldNewC = rotatePoint(localNewC[0], localNewC[1], oldC[0], oldC[1], el.angle);
  return {
    ...el,
    points: el.points.map(([px, py]) => [px - minX, py - minY] as Point),
    x: worldNewC[0] - w / 2,
    y: worldNewC[1] - h / 2,
    width: w,
    height: h,
  };
}

export function screenToWorld(sx: number, sy: number, view: View): Point {
  return [sx / view.zoom - view.scrollX, sy / view.zoom - view.scrollY];
}
export function worldToScreen(wx: number, wy: number, view: View): Point {
  return [(wx + view.scrollX) * view.zoom, (wy + view.scrollY) * view.zoom];
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/** Hit test in world coordinates. tol is in world units. */
export function hitTest(el: Element, wx: number, wy: number, tol: number): boolean {
  const [cx, cy] = center(el);
  const [lx, ly] = rotatePoint(wx, wy, cx, cy, -el.angle);
  const x = lx - el.x;
  const y = ly - el.y;
  const w = el.width;
  const h = el.height;
  const filled = el.backgroundColor !== 'transparent';
  switch (el.type) {
    case 'text':
    case 'image':
      return x >= -tol && y >= -tol && x <= w + tol && y <= h + tol;
    case 'rectangle': {
      const inside = x >= 0 && y >= 0 && x <= w && y <= h;
      if (filled && inside) return true;
      const outer = x >= -tol && y >= -tol && x <= w + tol && y <= h + tol;
      const inner = x > tol && y > tol && x < w - tol && y < h - tol;
      return outer && !inner;
    }
    case 'diamond': {
      const hw = w / 2 || 1, hh = h / 2 || 1;
      const d = Math.abs(x - hw) / hw + Math.abs(y - hh) / hh;
      const tolN = tol / Math.min(hw, hh);
      if (filled) return d <= 1 + tolN;
      return Math.abs(d - 1) <= tolN * 1.2;
    }
    case 'ellipse': {
      const rx = w / 2 || 1, ry = h / 2 || 1;
      const nx = (x - rx) / rx, ny = (y - ry) / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      const tolN = tol / Math.min(rx, ry);
      if (filled) return d <= 1 + tolN;
      return Math.abs(d - 1) <= tolN * 1.2;
    }
    case 'line':
    case 'arrow':
    case 'freedraw': {
      const pts = el.points || [];
      if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]) <= tol + el.strokeWidth;
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= tol + el.strokeWidth / 2) return true;
      }
      return false;
    }
  }
  return false;
}

export function measureText(text: string, fontSize: number): { width: number; height: number } {
  const canvas = measureText as unknown as { _c?: HTMLCanvasElement };
  if (!canvas._c) canvas._c = document.createElement('canvas');
  const ctx = canvas._c.getContext('2d')!;
  ctx.font = `${fontSize}px ${HAND_FONT}`;
  const lines = text.split('\n');
  let width = 0;
  for (const line of lines) width = Math.max(width, ctx.measureText(line || ' ').width);
  return { width: Math.ceil(width) + 2, height: Math.ceil(lines.length * fontSize * LINE_HEIGHT) };
}

export function snapAngle(dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy);
  const step = Math.PI / 12;
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return [Math.cos(a) * len, Math.sin(a) * len];
}
