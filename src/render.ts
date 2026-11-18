import rough from 'roughjs';
import type { Drawable, Options } from 'roughjs/bin/core';
import { getStroke } from 'perfect-freehand';
import type { Element, Point, View } from './types';
import { HAND_FONT, LINE_HEIGHT, center, commonBounds, elementBounds, rotatePoint } from './geometry';
import handFontUrl from '@fontsource/architects-daughter/files/architects-daughter-latin-400-normal.woff2?url';

const generator = rough.generator();

interface Shape {
  drawables: Drawable[];
  freedrawPath?: string;
}

const shapeCache = new Map<string, { version: number; key: string; shape: Shape }>();

export const SELECTION_COLOR = '#6965db';

function roughOptions(el: Element): Options {
  const sw = el.strokeWidth;
  const opts: Options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: sw,
    roughness: el.roughness,
    bowing: 1,
    fillStyle: el.fillStyle,
    fillWeight: sw / 2,
    hachureGap: sw * 4,
    disableMultiStroke: el.strokeStyle !== 'solid',
    preserveVertices: el.roughness < 2,
    curveFitting: 0.95,
  };
  if (el.strokeStyle === 'dashed') opts.strokeLineDash = [8, 8 + sw];
  if (el.strokeStyle === 'dotted') opts.strokeLineDash = [1.5, 6 + sw];
  if (el.strokeStyle !== 'solid') opts.strokeWidth = sw + 0.5;
  if (el.backgroundColor !== 'transparent' && el.type !== 'line' && el.type !== 'arrow') {
    opts.fill = el.backgroundColor;
  }
  return opts;
}

function roundedPolygonPath(pts: Point[], t: number): string {
  const n = pts.length;
  const pIn: Point[] = [];
  const pOut: Point[] = [];
  for (let i = 0; i < n; i++) {
    const v = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    pIn.push([v[0] + (prev[0] - v[0]) * t, v[1] + (prev[1] - v[1]) * t]);
    pOut.push([v[0] + (next[0] - v[0]) * t, v[1] + (next[1] - v[1]) * t]);
  }
  let d = `M ${pOut[0][0]} ${pOut[0][1]}`;
  for (let k = 1; k <= n; k++) {
    const i = k % n;
    d += ` L ${pIn[i][0]} ${pIn[i][1]} Q ${pts[i][0]} ${pts[i][1]} ${pOut[i][0]} ${pOut[i][1]}`;
  }
  return d + ' Z';
}

function arrowheadDrawables(el: Element, pts: Point[], which: 'start' | 'end', opts: Options): Drawable[] {
  const head = which === 'end' ? el.endArrowhead : el.startArrowhead;
  if (!head || pts.length < 2) return [];
  const tip = which === 'end' ? pts[pts.length - 1] : pts[0];
  let from = which === 'end' ? pts[pts.length - 2] : pts[1];
  // use a point some distance back for curved lines
  if (Math.hypot(tip[0] - from[0], tip[1] - from[1]) < 1 && pts.length > 2) {
    from = which === 'end' ? pts[pts.length - 3] : pts[2];
  }
  const segLen = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (segLen < 1) return [];
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const size = Math.min(15 + el.strokeWidth * 3, segLen * 0.7);
  const lineOpts: Options = { ...opts, fill: undefined, strokeLineDash: undefined, disableMultiStroke: el.strokeStyle !== 'solid' };
  const spread = Math.PI / 7;
  const p1: Point = [tip[0] - size * Math.cos(ang - spread), tip[1] - size * Math.sin(ang - spread)];
  const p2: Point = [tip[0] - size * Math.cos(ang + spread), tip[1] - size * Math.sin(ang + spread)];
  switch (head) {
    case 'arrow':
      return [generator.line(p1[0], p1[1], tip[0], tip[1], lineOpts), generator.line(p2[0], p2[1], tip[0], tip[1], lineOpts)];
    case 'triangle':
      return [generator.polygon([tip, p1, p2], { ...lineOpts, fill: el.strokeColor, fillStyle: 'solid' })];
    case 'dot': {
      const r = Math.min(8 + el.strokeWidth * 2, segLen * 0.6);
      return [generator.circle(tip[0], tip[1], r, { ...lineOpts, fill: el.strokeColor, fillStyle: 'solid' })];
    }
    case 'bar': {
      const s = size * 0.6;
      const px = Math.cos(ang + Math.PI / 2) * s;
      const py = Math.sin(ang + Math.PI / 2) * s;
      return [generator.line(tip[0] - px, tip[1] - py, tip[0] + px, tip[1] + py, lineOpts)];
    }
  }
  return [];
}

export function freedrawSvgPath(el: Element): string {
  const pts = el.points || [];
  const input = pts.map((p, i) => [p[0], p[1], el.pressures?.[i] ?? 0.5]);
  const stroke = getStroke(input, {
    size: el.strokeWidth * 2.6 + 1.6,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !el.pressures,
    last: true,
  });
  if (!stroke.length) return '';
  const d: (string | number)[] = ['M', stroke[0][0], stroke[0][1], 'Q'];
  for (let i = 0; i < stroke.length; i++) {
    const [x0, y0] = stroke[i];
    const [x1, y1] = stroke[(i + 1) % stroke.length];
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  d.push('Z');
  return d.join(' ');
}

function buildShape(el: Element): Shape {
  const w = el.width;
  const h = el.height;
  const o = roughOptions(el);
  switch (el.type) {
    case 'rectangle': {
      if (el.roundness === 'round') {
        const r = Math.min(32, Math.min(w, h) * 0.25);
        const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r} Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r} L 0 ${r} Q 0 0, ${r} 0 Z`;
        return { drawables: [generator.path(d, o)] };
      }
      return { drawables: [generator.rectangle(0, 0, w, h, o)] };
    }
    case 'diamond': {
      const pts: Point[] = [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
      if (el.roundness === 'round') return { drawables: [generator.path(roundedPolygonPath(pts, 0.18), o)] };
      return { drawables: [generator.polygon(pts, o)] };
    }
    case 'ellipse':
      return { drawables: [generator.ellipse(w / 2, h / 2, w, h, o)] };
    case 'line':
    case 'arrow': {
      const pts = el.points || [];
      const ds: Drawable[] = [];
      if (pts.length >= 2) {
        if (el.roundness === 'round' && pts.length > 2) ds.push(generator.curve(pts, o));
        else ds.push(generator.linearPath(pts, o));
      }
      if (el.type === 'arrow') {
        ds.push(...arrowheadDrawables(el, pts, 'end', o));
        ds.push(...arrowheadDrawables(el, pts, 'start', o));
      }
      return { drawables: ds };
    }
    case 'freedraw':
      return { drawables: [], freedrawPath: freedrawSvgPath(el) };
  }
  return { drawables: [] };
}

function getShape(el: Element): Shape {
  const key = `${el.width},${el.height},${el.strokeColor},${el.backgroundColor},${el.fillStyle},${el.strokeWidth},${el.strokeStyle},${el.roughness},${el.roundness},${el.startArrowhead},${el.endArrowhead},${el.points?.length}`;
  const cached = shapeCache.get(el.id);
  if (cached && cached.version === el.version && cached.key === key) return cached.shape;
  const shape = buildShape(el);
  shapeCache.set(el.id, { version: el.version, key, shape });
  return shape;
}

const imageCache = new Map<string, HTMLImageElement>();
let onImageLoad: (() => void) | null = null;
export function setImageLoadCallback(cb: () => void) {
  onImageLoad = cb;
}
function getImage(url: string): HTMLImageElement {
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.onload = () => onImageLoad?.();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

function drawText(ctx: CanvasRenderingContext2D, el: Element) {
  const fs = el.fontSize || 20;
  ctx.font = `${fs}px ${HAND_FONT}`;
  ctx.fillStyle = el.strokeColor;
  ctx.textBaseline = 'top';
  const align = el.textAlign || 'left';
  ctx.textAlign = align;
  const x = align === 'left' ? 0 : align === 'center' ? el.width / 2 : el.width;
  const lines = (el.text || '').split('\n');
  lines.forEach((line, i) => ctx.fillText(line, x, i * fs * LINE_HEIGHT + fs * 0.08));
}

export function drawElement(ctx: CanvasRenderingContext2D, rc: ReturnType<typeof rough.canvas>, el: Element, alphaMul = 1) {
  const [cx, cy] = center(el);
  ctx.save();
  ctx.globalAlpha = (el.opacity / 100) * alphaMul;
  ctx.translate(cx, cy);
  ctx.rotate(el.angle);
  ctx.translate(-el.width / 2, -el.height / 2);
  if (el.type === 'text') {
    drawText(ctx, el);
  } else if (el.type === 'image') {
    if (el.dataURL) {
      const img = getImage(el.dataURL);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, el.width, el.height);
      else {
        ctx.fillStyle = '#ececf4';
        ctx.fillRect(0, 0, el.width, el.height);
      }
    }
  } else {
    const shape = getShape(el);
    if (shape.freedrawPath) {
      ctx.fillStyle = el.strokeColor;
      ctx.fill(new Path2D(shape.freedrawPath));
    }
    for (const d of shape.drawables) rc.draw(d);
  }
  ctx.restore();
}

export interface HandleSet {
  [name: string]: Point;
}

export interface SelectionFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

export function selectionFrame(selected: Element[]): SelectionFrame | null {
  if (!selected.length) return null;
  if (selected.length === 1) {
    const el = selected[0];
    return { x: el.x, y: el.y, w: el.width, h: el.height, angle: el.angle };
  }
  const [a, b, c, d] = commonBounds(selected);
  return { x: a, y: b, w: c - a, h: d - b, angle: 0 };
}

/** Handle centres in world coordinates for a frame. */
export function frameHandles(f: SelectionFrame, zoom: number, withSides = true): HandleSet {
  const pad = 6 / zoom;
  const x0 = f.x - pad, y0 = f.y - pad, x1 = f.x + f.w + pad, y1 = f.y + f.h + pad;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const raw: HandleSet = {
    nw: [x0, y0], ne: [x1, y0], sw: [x0, y1], se: [x1, y1],
    rotation: [cx, y0 - 18 / zoom],
  };
  const sw = (x1 - x0) * zoom, sh = (y1 - y0) * zoom;
  if (withSides && sw > 40) { raw.n = [cx, y0]; raw.s = [cx, y1]; }
  if (withSides && sh > 40) { raw.w = [x0, cy]; raw.e = [x1, cy]; }
  const out: HandleSet = {};
  for (const k in raw) out[k] = rotatePoint(raw[k][0], raw[k][1], cx, cy, f.angle);
  return out;
}

export interface RenderOptions {
  width: number;
  height: number;
  dpr: number;
  view: View;
  background: string;
  selectedIds: Set<string>;
  erasing: Set<string>;
  hiddenIds?: Set<string>;
  selectionBox: [number, number, number, number] | null;
  showHandles: boolean;
  laser: { x: number; y: number; t: number }[];
  lasso: Point[] | null;
  grid: boolean;
}

export function renderScene(canvas: HTMLCanvasElement, elements: Element[], opt: RenderOptions) {
  const ctx = canvas.getContext('2d')!;
  const { view, dpr } = opt;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = opt.background;
  ctx.fillRect(0, 0, opt.width, opt.height);
  ctx.save();
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(view.scrollX, view.scrollY);
  const rc = rough.canvas(canvas);
  if (opt.grid) drawGrid(ctx, view, opt.width, opt.height);
  const vx0 = -view.scrollX, vy0 = -view.scrollY;
  const vx1 = vx0 + opt.width / view.zoom, vy1 = vy0 + opt.height / view.zoom;
  for (const el of elements) {
    if (opt.hiddenIds?.has(el.id)) continue;
    const pad = 50;
    const bb = elementBounds(el);
    const [a, b, c, d] = [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad];
    if (c < vx0 || a > vx1 || d < vy0 || b > vy1) continue;
    drawElement(ctx, rc, el, opt.erasing.has(el.id) ? 0.2 : 1);
  }

  // selection
  const selected = elements.filter((e) => opt.selectedIds.has(e.id));
  const lw = 1 / view.zoom;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = lw;
  if (selected.length > 1) {
    ctx.setLineDash([]);
    for (const el of selected) {
      const f = selectionFrame([el])!;
      strokeFrame(ctx, f, 4 / view.zoom);
    }
  }
  const frame = selectionFrame(selected);
  if (frame && opt.showHandles) {
    if (selected.length > 1) ctx.setLineDash([4 / view.zoom, 4 / view.zoom]);
    strokeFrame(ctx, frame, 6 / view.zoom);
    ctx.setLineDash([]);
    const handles = frameHandles(frame, view.zoom);
    const hs = 8 / view.zoom;
    ctx.fillStyle = '#ffffff';
    for (const [name, [hx, hy]] of Object.entries(handles)) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(frame.angle);
      ctx.beginPath();
      if (name === 'rotation') {
        ctx.arc(0, 0, hs / 2, 0, Math.PI * 2);
      } else if ((ctx as any).roundRect) {
        (ctx as any).roundRect(-hs / 2, -hs / 2, hs, hs, 2 / view.zoom);
      } else {
        ctx.rect(-hs / 2, -hs / 2, hs, hs);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (frame) {
    strokeFrame(ctx, frame, 6 / view.zoom);
  }

  if (opt.selectionBox) {
    const [x0, y0, x1, y1] = opt.selectionBox;
    ctx.fillStyle = 'rgba(105, 101, 219, 0.08)';
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }

  if (opt.lasso && opt.lasso.length > 1) {
    ctx.save();
    ctx.setLineDash([6 / view.zoom, 4 / view.zoom]);
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.fillStyle = 'rgba(105, 101, 219, 0.06)';
    ctx.lineWidth = 1.5 / view.zoom;
    ctx.beginPath();
    opt.lasso.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // laser trail
  if (opt.laser.length > 1) {
    const now = performance.now();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < opt.laser.length; i++) {
      const p0 = opt.laser[i - 1];
      const p1 = opt.laser[i];
      const age = (now - p1.t) / 1000;
      const alpha = Math.max(0, 1 - age);
      if (alpha <= 0) continue;
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.lineWidth = (4 * alpha + 1) / view.zoom;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, view: View, w: number, h: number) {
  const size = 20;
  if (size * view.zoom < 6) return;
  const x0 = Math.floor(-view.scrollX / size) * size;
  const y0 = Math.floor(-view.scrollY / size) * size;
  const x1 = -view.scrollX + w / view.zoom;
  const y1 = -view.scrollY + h / view.zoom;
  ctx.save();
  ctx.lineWidth = 1 / view.zoom;
  for (let x = x0; x < x1; x += size) {
    ctx.strokeStyle = Math.round(x / size) % 5 === 0 ? '#dddddd' : '#efefef';
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  for (let y = y0; y < y1; y += size) {
    ctx.strokeStyle = Math.round(y / size) % 5 === 0 ? '#dddddd' : '#efefef';
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.restore();
}

function strokeFrame(ctx: CanvasRenderingContext2D, f: SelectionFrame, pad: number) {
  ctx.save();
  ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
  ctx.rotate(f.angle);
  ctx.strokeRect(-f.w / 2 - pad, -f.h / 2 - pad, f.w + pad * 2, f.h + pad * 2);
  ctx.restore();
}

/* ---------------- export ---------------- */

export interface ExportOptions {
  background: string | null;
  dark: boolean;
  scale: number;
  padding?: number;
}

export function exportToCanvas(elements: Element[], opt: ExportOptions): HTMLCanvasElement {
  const padding = opt.padding ?? 10;
  const [x0, y0, x1, y1] = elements.length ? commonBounds(elements) : [0, 0, 100, 100];
  const w = Math.ceil(x1 - x0 + padding * 2);
  const h = Math.ceil(y1 - y0 + padding * 2);
  const inner = document.createElement('canvas');
  inner.width = Math.max(1, w * opt.scale);
  inner.height = Math.max(1, h * opt.scale);
  const ctx = inner.getContext('2d')!;
  ctx.scale(opt.scale, opt.scale);
  if (opt.background) {
    ctx.fillStyle = opt.background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.translate(-x0 + padding, -y0 + padding);
  const rc = rough.canvas(inner);
  for (const el of elements) drawElement(ctx, rc, el);
  if (!opt.dark) return inner;
  const out = document.createElement('canvas');
  out.width = inner.width;
  out.height = inner.height;
  const octx = out.getContext('2d')!;
  octx.filter = 'invert(93%) hue-rotate(180deg)';
  octx.drawImage(inner, 0, 0);
  return out;
}

let fontDataPromise: Promise<string> | null = null;
function fontDataUrl(): Promise<string> {
  if (!fontDataPromise) {
    fontDataPromise = fetch(handFontUrl)
      .then((r) => r.blob())
      .then(
        (b) =>
          new Promise<string>((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.readAsDataURL(b);
          }),
      )
      .catch(() => '');
  }
  return fontDataPromise;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export async function exportToSvg(elements: Element[], opt: ExportOptions): Promise<SVGSVGElement> {
  const padding = opt.padding ?? 10;
  const [x0, y0, x1, y1] = elements.length ? commonBounds(elements) : [0, 0, 100, 100];
  const w = Math.ceil(x1 - x0 + padding * 2);
  const h = Math.ceil(y1 - y0 + padding * 2);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('version', '1.1');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w * opt.scale));
  svg.setAttribute('height', String(h * opt.scale));
  if (opt.dark) svg.setAttribute('filter', 'invert(93%) hue-rotate(180deg)');
  if (opt.dark) svg.setAttribute('style', 'filter: invert(93%) hue-rotate(180deg)');
  const hasText = elements.some((e) => e.type === 'text');
  if (hasText) {
    const font = await fontDataUrl();
    const defs = document.createElementNS(SVG_NS, 'defs');
    const style = document.createElementNS(SVG_NS, 'style');
    style.textContent = font ? `@font-face { font-family: "Architects Daughter"; src: url(${font}); }` : '';
    defs.appendChild(style);
    svg.appendChild(defs);
  }
  if (opt.background) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('fill', opt.background);
    svg.appendChild(rect);
  }
  const rs = rough.svg(svg);
  for (const el of elements) {
    const g = document.createElementNS(SVG_NS, 'g');
    const tx = el.x - x0 + padding;
    const ty = el.y - y0 + padding;
    const deg = (el.angle * 180) / Math.PI;
    g.setAttribute('transform', `translate(${tx} ${ty}) rotate(${deg} ${el.width / 2} ${el.height / 2})`);
    if (el.opacity < 100) g.setAttribute('opacity', String(el.opacity / 100));
    if (el.type === 'text') {
      const fs = el.fontSize || 20;
      const align = el.textAlign || 'left';
      const anchor = align === 'left' ? 'start' : align === 'center' ? 'middle' : 'end';
      const x = align === 'left' ? 0 : align === 'center' ? el.width / 2 : el.width;
      (el.text || '').split('\n').forEach((line, i) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(x));
        t.setAttribute('y', String(i * fs * LINE_HEIGHT + fs * 0.08));
        t.setAttribute('font-family', HAND_FONT);
        t.setAttribute('font-size', `${fs}px`);
        t.setAttribute('fill', el.strokeColor);
        t.setAttribute('text-anchor', anchor);
        t.setAttribute('dominant-baseline', 'text-before-edge');
        t.setAttribute('style', 'white-space: pre');
        t.textContent = line;
        g.appendChild(t);
      });
    } else if (el.type === 'image') {
      const img = document.createElementNS(SVG_NS, 'image');
      img.setAttribute('href', el.dataURL || '');
      img.setAttribute('width', String(el.width));
      img.setAttribute('height', String(el.height));
      img.setAttribute('preserveAspectRatio', 'none');
      g.appendChild(img);
    } else {
      const shape = getShape(el);
      if (shape.freedrawPath) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', shape.freedrawPath);
        p.setAttribute('fill', el.strokeColor);
        g.appendChild(p);
      }
      for (const d of shape.drawables) g.appendChild(rs.draw(d));
    }
    svg.appendChild(g);
  }
  return svg;
}

export { rotatePoint };
