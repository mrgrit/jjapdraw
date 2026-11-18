import type { Element, Point } from './types';
import { center, measureText, rotatePoint } from './geometry';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

/** Resize one element by dragging handle `h` to world point (wx, wy). */
export function resizeSingle(o: Element, h: string, wx: number, wy: number, keepAspect: boolean, fromCenter: boolean): Element {
  const [ocx, ocy] = center(o);
  const [lx0, ly0] = rotatePoint(wx, wy, ocx, ocy, -o.angle);
  const px = lx0 - o.x;
  const py = ly0 - o.y;
  const w = o.width;
  const hh = o.height;
  let left = 0, right = w, top = 0, bottom = hh;
  if (h.includes('e')) right = px;
  if (h.includes('w')) left = px;
  if (h.includes('s')) bottom = py;
  if (h.includes('n')) top = py;
  if (fromCenter) {
    if (h.includes('e')) left = w - right;
    if (h.includes('w')) right = w - left;
    if (h.includes('s')) top = hh - bottom;
    if (h.includes('n')) bottom = hh - top;
  }
  const forceAspect = o.type === 'text' || o.type === 'image';
  if ((keepAspect || forceAspect) && w > 0 && hh > 0) {
    const corner = h.length === 2;
    const sx0 = (right - left) / w;
    const sy0 = (bottom - top) / hh;
    const k = corner ? Math.max(Math.abs(sx0), Math.abs(sy0)) : h === 'e' || h === 'w' ? Math.abs(sx0) : Math.abs(sy0);
    const nw = w * k * (Math.sign(sx0) || 1);
    const nh = hh * k * (Math.sign(sy0) || 1);
    if (corner) {
      if (h.includes('w')) left = right - nw;
      else right = left + nw;
      if (h.includes('n')) top = bottom - nh;
      else bottom = top + nh;
    } else if (h === 'e' || h === 'w') {
      top = hh / 2 - Math.abs(nh) / 2;
      bottom = hh / 2 + Math.abs(nh) / 2;
      if (h === 'w') left = right - nw;
      else right = left + nw;
    } else {
      left = w / 2 - Math.abs(nw) / 2;
      right = w / 2 + Math.abs(nw) / 2;
      if (h === 'n') top = bottom - nh;
      else bottom = top + nh;
    }
  }
  if (w <= 1e-6) right = left + w;
  if (hh <= 1e-6) bottom = top + hh;
  const sx = w > 1e-6 ? (right - left) / w : 1;
  const sy = hh > 1e-6 ? (bottom - top) / hh : 1;
  const minX = Math.min(left, right);
  const minY = Math.min(top, bottom);
  let nw = Math.abs(right - left);
  let nh = Math.abs(bottom - top);
  if (!o.points && o.type !== 'text') {
    nw = Math.max(1, nw);
    nh = Math.max(1, nh);
  }
  const lcx = (left + right) / 2;
  const lcy = (top + bottom) / 2;
  const [ncx, ncy] = rotatePoint(o.x + lcx, o.y + lcy, ocx, ocy, o.angle);
  let next: Element = { ...o, x: ncx - nw / 2, y: ncy - nh / 2, width: nw, height: nh, version: o.version + 1 };
  if (o.points) {
    next.points = o.points.map(([qx, qy]) => [left + qx * sx - minX, top + qy * sy - minY] as Point);
  }
  if (o.type === 'text') {
    const fs = Math.max(4, (o.fontSize || 20) * Math.abs(hh > 1e-6 ? sy : sx));
    const m = measureText(o.text || '', fs);
    next = { ...next, fontSize: fs, width: m.width, height: m.height };
    const lcx2 = h.includes('w') ? right - m.width / 2 : h.includes('e') ? left + m.width / 2 : lcx;
    const lcy2 = h.includes('n') ? bottom - m.height / 2 : h.includes('s') ? top + m.height / 2 : lcy;
    const [c2x, c2y] = rotatePoint(o.x + lcx2, o.y + lcy2, ocx, ocy, o.angle);
    next.x = c2x - m.width / 2;
    next.y = c2y - m.height / 2;
  }
  return next;
}

/** Scale several elements relative to the opposite side of their common frame. */
export function resizeMany(orig: Map<string, Element>, f: Frame, h: string, wx: number, wy: number, keepAspect: boolean) {
  let ax = h.includes('w') ? f.x + f.w : h.includes('e') ? f.x : f.x + f.w / 2;
  let ay = h.includes('n') ? f.y + f.h : h.includes('s') ? f.y : f.y + f.h / 2;
  let sx = 1, sy = 1;
  if (h.includes('e')) sx = (wx - f.x) / (f.w || 1);
  if (h.includes('w')) sx = (f.x + f.w - wx) / (f.w || 1);
  if (h.includes('s')) sy = (wy - f.y) / (f.h || 1);
  if (h.includes('n')) sy = (f.y + f.h - wy) / (f.h || 1);
  if (h.length === 2 || keepAspect) {
    const k = h.length === 2 ? Math.max(sx, sy) : h === 'e' || h === 'w' ? sx : sy;
    sx = sy = k;
    if (h.length === 1) {
      if (h === 'e' || h === 'w') ay = f.y + f.h / 2;
      else ax = f.x + f.w / 2;
    }
  }
  sx = Math.max(0.02, sx);
  sy = Math.max(0.02, sy);
  return (el: Element): Element => {
    const o = orig.get(el.id);
    if (!o) return el;
    const [ocx, ocy] = center(o);
    const ncx = ax + (ocx - ax) * sx;
    const ncy = ay + (ocy - ay) * sy;
    let nw = o.width * sx;
    let nh = o.height * sy;
    const next: Element = { ...o, version: o.version + 1 };
    if (o.points) next.points = o.points.map(([qx, qy]) => [qx * sx, qy * sy] as Point);
    if (o.type === 'text') {
      const fs = Math.max(4, (o.fontSize || 20) * Math.min(sx, sy));
      const m = measureText(o.text || '', fs);
      nw = m.width;
      nh = m.height;
      next.fontSize = fs;
    }
    if (o.type === 'image') {
      const k = Math.min(sx, sy);
      nw = o.width * k;
      nh = o.height * k;
    }
    return { ...next, width: nw, height: nh, x: ncx - nw / 2, y: ncy - nh / 2 };
  };
}
