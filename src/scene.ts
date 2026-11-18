import type { Element, StyleProps, View, Theme, Point } from './types';
import { newId, normalizePoints, randomSeed } from './geometry';
import type { Lang } from './i18n';

export const DEFAULT_STYLE: StyleProps = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  roundness: 'round',
  opacity: 100,
  fontSize: 20,
  textAlign: 'left',
  startArrowhead: null,
  endArrowhead: 'arrow',
};

export const STROKE_PICKS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00'];
export const BG_PICKS = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99'];
export const CANVAS_PICKS = ['#ffffff', '#f8f9fa', '#f5faff', '#fffce8', '#fdf8f6'];

/** Full palette shown in the colour popover: hue rows with shades. */
export const PALETTE: string[][] = [
  ['transparent', '#ffffff', '#f8f9fa', '#e9ecef', '#ced4da', '#868e96', '#343a40', '#1e1e1e'],
  ['#fff5f5', '#ffc9c9', '#ff8787', '#fa5252', '#e03131', '#c92a2a', '#a61e4d', '#862e9c'],
  ['#f3f0ff', '#d0bfff', '#9775fa', '#7048e8', '#5f3dc4', '#e7f5ff', '#a5d8ff', '#4dabf7'],
  ['#1c7ed6', '#1971c2', '#0c8599', '#e6fcf5', '#96f2d7', '#38d9a9', '#0ca678', '#099268'],
  ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2f9e44', '#fff9db', '#ffec99', '#ffd43b'],
  ['#fab005', '#f08c00', '#fff4e6', '#ffd8a8', '#ffa94d', '#fd7e14', '#e8590c', '#846358'],
];

export function createElement(type: Element['type'], x: number, y: number, style: StyleProps, extra: Partial<Element> = {}): Element {
  return {
    id: newId(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor,
    backgroundColor: type === 'line' || type === 'arrow' || type === 'freedraw' || type === 'text' ? 'transparent' : style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    strokeStyle: type === 'freedraw' ? 'solid' : style.strokeStyle,
    roughness: style.roughness,
    roundness: type === 'line' || type === 'arrow' ? (style.roundness === 'round' ? 'round' : 'sharp') : style.roundness,
    opacity: style.opacity,
    seed: randomSeed(),
    version: 1,
    ...(type === 'arrow' ? { startArrowhead: style.startArrowhead, endArrowhead: style.endArrowhead } : {}),
    ...(type === 'text' ? { text: '', fontSize: style.fontSize, textAlign: style.textAlign } : {}),
    ...extra,
  };
}

export function bump<T extends Element>(el: T): T {
  return { ...el, version: el.version + 1 };
}

export function duplicateElements(els: Element[], dx = 10, dy = 10): Element[] {
  return els.map((e) => ({ ...e, id: newId(), seed: randomSeed(), x: e.x + dx, y: e.y + dy, version: 1, points: e.points?.map((p) => [...p] as Point) }));
}

/* ---------- layer order ---------- */
export function reorder(elements: Element[], ids: Set<string>, dir: 'back' | 'backward' | 'forward' | 'front'): Element[] {
  const sel = elements.filter((e) => ids.has(e.id));
  const rest = elements.filter((e) => !ids.has(e.id));
  if (!sel.length) return elements;
  if (dir === 'front') return [...rest, ...sel];
  if (dir === 'back') return [...sel, ...rest];
  const arr = [...elements];
  if (dir === 'forward') {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
    }
  }
  return arr;
}

/* ---------- history ---------- */
export class History {
  stack: Element[][];
  index: number;
  constructor(initial: Element[]) {
    this.stack = [initial];
    this.index = 0;
  }
  push(els: Element[]) {
    if (this.stack[this.index] === els) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(els);
    if (this.stack.length > 300) this.stack.shift();
    this.index = this.stack.length - 1;
  }
  canUndo() {
    return this.index > 0;
  }
  canRedo() {
    return this.index < this.stack.length - 1;
  }
  undo(): Element[] | null {
    if (!this.canUndo()) return null;
    this.index--;
    return this.stack[this.index];
  }
  redo(): Element[] | null {
    if (!this.canRedo()) return null;
    this.index++;
    return this.stack[this.index];
  }
}

/* ---------- persistence ---------- */
export interface Persisted {
  view: View;
  style: StyleProps;
  theme: Theme;
  canvasBg: string;
  grid: boolean;
  toolLocked: boolean;
  lang: Lang;
}

const KEY_ELEMENTS = 'jjapdraw:elements';
const KEY_STATE = 'jjapdraw:state';
const KEY_LIBRARY = 'jjapdraw:library';

export function loadElements(): Element[] {
  try {
    const raw = localStorage.getItem(KEY_ELEMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((r: unknown) => sanitizeElement(r)).filter(Boolean) as Element[] : [];
  } catch {
    return [];
  }
}
export function loadState(): Partial<Persisted> {
  try {
    return JSON.parse(localStorage.getItem(KEY_STATE) || '{}');
  } catch {
    return {};
  }
}
export function loadLibrary(): Element[][] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY_LIBRARY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveAll(elements: Element[], state: Persisted) {
  try {
    localStorage.setItem(KEY_ELEMENTS, JSON.stringify(elements));
    localStorage.setItem(KEY_STATE, JSON.stringify(state));
  } catch {
    /* storage full */
  }
}
export function saveLibrary(lib: Element[][]) {
  try {
    localStorage.setItem(KEY_LIBRARY, JSON.stringify(lib));
  } catch {
    /* ignore */
  }
}

/* ---------- files ---------- */
export function serializeScene(elements: Element[], canvasBg: string): string {
  return JSON.stringify(
    {
      type: 'jjapdraw',
      version: 1,
      source: location.origin,
      elements,
      appState: { viewBackgroundColor: canvasBg },
    },
    null,
    2,
  );
}

const TYPES = ['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'image'];

/** Accept our own elements and the common open whiteboard JSON format. */
export function sanitizeElement(raw: any, files?: Record<string, { dataURL?: string }>): Element | null {
  if (!raw || typeof raw !== 'object' || !TYPES.includes(raw.type)) return null;
  if (raw.isDeleted) return null;
  const roundness = raw.roundness === 'round' || raw.roundness === 'sharp' ? raw.roundness : raw.roundness ? 'round' : 'sharp';
  const num = (v: any, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);
  const el: Element = {
    id: typeof raw.id === 'string' ? raw.id : newId(),
    type: raw.type,
    x: num(raw.x, 0),
    y: num(raw.y, 0),
    width: num(raw.width, 0),
    height: num(raw.height, 0),
    angle: num(raw.angle, 0),
    strokeColor: typeof raw.strokeColor === 'string' ? raw.strokeColor : '#1e1e1e',
    backgroundColor: typeof raw.backgroundColor === 'string' ? raw.backgroundColor : 'transparent',
    fillStyle: ['hachure', 'cross-hatch', 'solid'].includes(raw.fillStyle) ? raw.fillStyle : raw.fillStyle === 'zigzag' ? 'hachure' : 'solid',
    strokeWidth: num(raw.strokeWidth, 2),
    strokeStyle: ['solid', 'dashed', 'dotted'].includes(raw.strokeStyle) ? raw.strokeStyle : 'solid',
    roughness: num(raw.roughness, 1),
    roundness,
    opacity: num(raw.opacity, 100),
    seed: num(raw.seed, randomSeed()),
    version: num(raw.version, 1),
  };
  if (Array.isArray(raw.points)) el.points = raw.points.filter((p: any) => Array.isArray(p) && p.length >= 2).map((p: any) => [num(p[0], 0), num(p[1], 0)]);
  if (Array.isArray(raw.pressures) && raw.pressures.length) el.pressures = raw.pressures;
  if (raw.type === 'arrow') {
    el.startArrowhead = raw.startArrowhead ?? null;
    el.endArrowhead = raw.endArrowhead === undefined ? 'arrow' : raw.endArrowhead;
    if (!['arrow', 'triangle', 'dot', 'bar', null].includes(el.startArrowhead!)) el.startArrowhead = 'arrow';
    if (!['arrow', 'triangle', 'dot', 'bar', null].includes(el.endArrowhead!)) el.endArrowhead = 'arrow';
  }
  if (raw.type === 'text') {
    el.text = typeof raw.text === 'string' ? raw.text : '';
    el.fontSize = num(raw.fontSize, 20);
    el.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left';
  }
  if (raw.type === 'image') {
    el.dataURL = typeof raw.dataURL === 'string' ? raw.dataURL : files?.[raw.fileId]?.dataURL;
    if (!el.dataURL) return null;
  }
  if (el.points && el.points.length && raw.type !== 'freedraw' && raw.type !== 'line' && raw.type !== 'arrow') delete el.points;
  if (el.points && (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw')) {
    // other formats keep points relative to x,y with arbitrary origin; normalise
    return normalizePoints(el);
  }
  return el;
}

export function parseSceneFile(text: string): { elements: Element[]; canvasBg?: string } {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.elements;
  if (!Array.isArray(list)) throw new Error('No drawing found in this file');
  const elements = list.map((r: any) => sanitizeElement(r, data.files)).filter(Boolean) as Element[];
  return { elements, canvasBg: data.appState?.viewBackgroundColor };
}

export function download(filename: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
