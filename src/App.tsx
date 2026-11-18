import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Element, Point, StyleProps, Theme, Tool, View } from './types';
import {
  center, commonBounds, elementBounds, hitTest, measureText, normalizePoints, rotatePoint,
  screenToWorld, snapAngle, HAND_FONT, LINE_HEIGHT,
} from './geometry';
import { frameHandles, renderScene, selectionFrame, setImageLoadCallback, exportToCanvas, exportToSvg } from './render';
import {
  DEFAULT_STYLE, History, bump, createElement, duplicateElements, reorder, loadElements, loadState, loadLibrary,
  saveAll, saveLibrary, serializeScene, parseSceneFile, download, pickFile, readAsDataURL, sanitizeElement,
} from './scene';
import { resizeMany, resizeSingle, type Frame } from './resize';
import { setLang, t, type Lang } from './i18n';
import { UI, type Dialog } from './ui';
import { TextEditor } from './TextEditor';

export interface Store {
  elements: Element[];
  selectedIds: Set<string>;
  tool: Tool;
  toolLocked: boolean;
  view: View;
  style: StyleProps;
  theme: Theme;
  canvasBg: string;
  grid: boolean;
  zen: boolean;
  lang: Lang;
  editingId: string | null;
  erasing: Set<string>;
  selectionBox: [number, number, number, number] | null;
  laser: { x: number; y: number; t: number }[];
  lasso: Point[] | null;
  multiPointId: string | null;
  library: Element[][];
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; view: View }
  | { kind: 'create'; id: string; ox: number; oy: number }
  | { kind: 'linear'; id: string; ox: number; oy: number; sx: number; sy: number }
  | { kind: 'freedraw'; id: string }
  | { kind: 'move'; ox: number; oy: number; orig: Map<string, Element> }
  | { kind: 'resize'; handle: string; orig: Map<string, Element>; frame: Frame }
  | { kind: 'rotate'; orig: Map<string, Element>; cx: number; cy: number; startAngle: number }
  | { kind: 'box'; ox: number; oy: number; base: Set<string> }
  | { kind: 'erase'; lx: number; ly: number }
  | { kind: 'laser' }
  | { kind: 'lasso' }
  | { kind: 'pinch'; dist: number; mid: Point; view: View };

const GRID = 20;
const snap = (v: number, on: boolean) => (on ? Math.round(v / GRID) * GRID : v);

function systemDark() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function initialStore(): Store {
  const st = loadState();
  const lang = (st.lang as Lang) || 'en';
  setLang(lang);
  return {
    elements: loadElements(),
    selectedIds: new Set(),
    tool: 'selection',
    toolLocked: !!st.toolLocked,
    view: st.view && isFinite(st.view.zoom) ? st.view : { scrollX: 0, scrollY: 0, zoom: 1 },
    style: { ...DEFAULT_STYLE, ...(st.style || {}) },
    theme: st.theme || 'light',
    canvasBg: st.canvasBg || '#ffffff',
    grid: !!st.grid,
    zen: false,
    lang,
    editingId: null,
    erasing: new Set(),
    selectionBox: null,
    laser: [],
    lasso: null,
    multiPointId: null,
    library: loadLibrary(),
  };
}

function pointInPolygon(x: number, y: number, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='5' fill='white' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 10 10, crosshair`;
const cursorCss = (c: string) => (c === 'eraser' ? ERASER_CURSOR : c);

export default function App() {
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => (n + 1) % 1e9);
  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) storeRef.current = initialStore();
  const s = storeRef.current;
  const historyRef = useRef<History | null>(null);
  if (!historyRef.current) historyRef.current = new History(s.elements);
  const history = historyRef.current;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const spaceDown = useRef(false);
  const lastPointer = useRef<Point>([window.innerWidth / 2, window.innerHeight / 2]);
  const lastClick = useRef(0);
  const clip = useRef<Element[]>([]);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [mainOpen, setMainOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sysDark, setSysDark] = useState(systemDark());
  const [cursor, setCursor] = useState('default');
  const isMobile = size.w < 600;
  const dark = s.theme === 'dark' || (s.theme === 'system' && sysDark);

  /* ---------------- helpers ---------------- */
  const saveTimer = useRef<number | undefined>(undefined);
  const scheduleSave = () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveAll(s.elements, {
        view: s.view, style: s.style, theme: s.theme, canvasBg: s.canvasBg, grid: s.grid, toolLocked: s.toolLocked, lang: s.lang,
      });
    }, 250);
  };
  const setElements = (els: Element[]) => {
    s.elements = els;
    scheduleSave();
  };
  const commit = () => {
    history.push(s.elements);
    scheduleSave();
  };
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  };
  const selected = () => s.elements.filter((e) => s.selectedIds.has(e.id));
  const getEl = (id: string) => s.elements.find((e) => e.id === id);
  const replaceEl = (el: Element) => setElements(s.elements.map((e) => (e.id === el.id ? el : e)));
  const toWorld = (clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToWorld(clientX - rect.left, clientY - rect.top, s.view);
  };

  const toolCursor = (tool: Tool) =>
    tool === 'hand' ? 'grab' : tool === 'selection' ? 'default' : tool === 'eraser' ? 'eraser' : tool === 'text' ? 'text' : 'crosshair';

  function setTool(tool: Tool) {
    finishMultiPoint();
    if (s.editingId) finishEditing();
    if (tool !== 'selection') s.selectedIds = new Set();
    s.tool = tool;
    setCursor(toolCursor(tool));
    rerender();
  }

  const afterCreate = (id: string) => {
    if (!s.toolLocked && s.tool !== 'freedraw') {
      s.tool = 'selection';
      setCursor('default');
      s.selectedIds = new Set([id]);
    }
  };

  /* ---------------- view ---------------- */
  const setView = (v: View) => {
    s.view = v;
    scheduleSave();
    rerender();
  };
  const zoomAt = (newZoom: number, sx: number, sy: number) => {
    const z = Math.min(30, Math.max(0.1, newZoom));
    const [wx, wy] = screenToWorld(sx, sy, s.view);
    setView({ zoom: z, scrollX: sx / z - wx, scrollY: sy / z - wy });
  };
  const zoomStep = (dir: 1 | -1) => {
    const z = s.view.zoom;
    zoomAt(Math.round((z + dir * 0.1) * 10) / 10, size.w / 2, size.h / 2);
  };
  const zoomToElements = (els: Element[], maxZoom: number) => {
    if (!els.length) return;
    const [x0, y0, x1, y1] = commonBounds(els);
    const pad = isMobile ? 40 : 100;
    const z = Math.max(0.1, Math.min(maxZoom, (size.w - pad * 2) / Math.max(1, x1 - x0), (size.h - pad * 2) / Math.max(1, y1 - y0)));
    setView({ zoom: z, scrollX: size.w / 2 / z - (x0 + x1) / 2, scrollY: size.h / 2 / z - (y0 + y1) / 2 });
  };
  const resetZoom = () => zoomAt(1, size.w / 2, size.h / 2);

  /* ---------------- history ---------------- */
  const pruneSelection = () => {
    const ids = new Set(s.elements.map((e) => e.id));
    s.selectedIds = new Set([...s.selectedIds].filter((id) => ids.has(id)));
  };
  const undo = () => {
    if (s.editingId) finishEditing();
    if (s.multiPointId) finishMultiPoint();
    const els = history.undo();
    if (els) {
      s.elements = els;
      pruneSelection();
      scheduleSave();
      rerender();
    }
  };
  const redo = () => {
    const els = history.redo();
    if (els) {
      s.elements = els;
      pruneSelection();
      scheduleSave();
      rerender();
    }
  };

  /* ---------------- element actions ---------------- */
  const deleteSelected = () => {
    if (!s.selectedIds.size) return;
    setElements(s.elements.filter((e) => !s.selectedIds.has(e.id)));
    s.selectedIds = new Set();
    commit();
    rerender();
  };
  const duplicateSelected = () => {
    const sel = selected();
    if (!sel.length) return;
    const copies = duplicateElements(sel);
    setElements([...s.elements, ...copies]);
    s.selectedIds = new Set(copies.map((c) => c.id));
    commit();
    rerender();
  };
  const layer = (dir: 'back' | 'backward' | 'forward' | 'front') => {
    if (!s.selectedIds.size) return;
    setElements(reorder(s.elements, s.selectedIds, dir));
    commit();
    rerender();
  };
  const selectAll = () => {
    s.tool = 'selection';
    s.selectedIds = new Set(s.elements.map((e) => e.id));
    rerender();
  };

  const applicable = (el: Element, key: keyof StyleProps): boolean => {
    switch (key) {
      case 'backgroundColor':
      case 'fillStyle':
        return ['rectangle', 'diamond', 'ellipse'].includes(el.type);
      case 'strokeWidth':
        return !['text', 'image'].includes(el.type);
      case 'strokeStyle':
      case 'roughness':
        return ['rectangle', 'diamond', 'ellipse', 'line', 'arrow'].includes(el.type);
      case 'roundness':
        return ['rectangle', 'diamond', 'line', 'arrow'].includes(el.type);
      case 'fontSize':
      case 'textAlign':
        return el.type === 'text';
      case 'startArrowhead':
      case 'endArrowhead':
        return el.type === 'arrow';
      case 'strokeColor':
        return el.type !== 'image';
      default:
        return true;
    }
  };

  const changeStyle = <K extends keyof StyleProps>(key: K, value: StyleProps[K], commitNow = true) => {
    s.style = { ...s.style, [key]: value };
    if (s.selectedIds.size) {
      setElements(
        s.elements.map((e) => {
          if (!s.selectedIds.has(e.id) || !applicable(e, key)) return e;
          let next: Element = bump({ ...e, [key]: value });
          if (key === 'fontSize' && e.type === 'text') {
            const m = measureText(e.text || '', value as number);
            next = { ...next, width: m.width, height: m.height };
          }
          return next;
        }),
      );
      if (commitNow) commit();
    }
    scheduleSave();
    rerender();
  };

  /* ---------------- text editing ---------------- */
  const startEditing = (id: string) => {
    s.editingId = id;
    s.selectedIds = new Set([id]);
    rerender();
  };
  function finishEditing() {
    const id = s.editingId;
    if (!id) return;
    s.editingId = null;
    const el = getEl(id);
    if (el && !(el.text || '').trim()) {
      setElements(s.elements.filter((e) => e.id !== id));
      s.selectedIds = new Set();
    } else if (el) {
      if (!s.toolLocked) s.tool = 'selection';
      s.selectedIds = new Set([id]);
    }
    commit();
    rerender();
  }
  const updateEditingText = (text: string) => {
    const el = s.editingId ? getEl(s.editingId) : null;
    if (!el) return;
    const m = measureText(text, el.fontSize || 20);
    let x = el.x;
    if (el.textAlign === 'center') x = el.x + el.width / 2 - m.width / 2;
    if (el.textAlign === 'right') x = el.x + el.width - m.width;
    replaceEl(bump({ ...el, text, x, width: m.width, height: m.height }));
    rerender();
  };
  const createTextAt = (wx: number, wy: number) => {
    const fs = s.style.fontSize;
    const m = measureText('', fs);
    const el = createElement('text', wx, wy - (fs * LINE_HEIGHT) / 2, s.style, { width: m.width, height: m.height });
    setElements([...s.elements, el]);
    startEditing(el.id);
  };

  /* ---------------- multi point lines ---------------- */
  function finishMultiPoint() {
    const id = s.multiPointId;
    if (!id) return;
    s.multiPointId = null;
    const el = getEl(id);
    if (!el || !el.points) return;
    const pts = el.points.slice(0, -1);
    if (pts.length < 2) {
      setElements(s.elements.filter((e) => e.id !== id));
    } else {
      replaceEl(normalizePoints(bump({ ...el, points: pts })));
      afterCreate(id);
    }
    commit();
    rerender();
  }

  /* ---------------- images ---------------- */
  const insertImage = async (file?: File | null, at?: Point) => {
    const f = file ?? (await pickFile('image/*'));
    if (!f) return;
    const url = await readAsDataURL(f);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const max = 400;
      if (w > max || h > max) {
        const k = max / Math.max(w, h);
        w *= k;
        h *= k;
      }
      const [cx, cy] = at ?? screenToWorld(size.w / 2, size.h / 2, s.view);
      const el = createElement('image', cx - w / 2, cy - h / 2, s.style, { width: w, height: h, dataURL: url, backgroundColor: 'transparent' });
      setElements([...s.elements, el]);
      s.selectedIds = new Set([el.id]);
      s.tool = 'selection';
      commit();
      rerender();
    };
    img.src = url;
  };

  /* ---------------- files ---------------- */
  const openFile = async (file?: File | null) => {
    const f = file ?? (await pickFile('.json,.jjapdraw,.excalidraw,application/json'));
    if (!f) return;
    try {
      const { elements, canvasBg } = parseSceneFile(await f.text());
      if (s.editingId) finishEditing();
      setElements(elements);
      if (canvasBg) s.canvasBg = canvasBg;
      s.selectedIds = new Set();
      commit();
      if (elements.length) zoomToElements(elements, 1);
      rerender();
    } catch (err) {
      showToast((err as Error).message || 'Could not open file');
    }
  };
  const saveFile = () => {
    download('drawing.jjapdraw.json', new Blob([serializeScene(s.elements, s.canvasBg)], { type: 'application/json' }));
    showToast(t('Saved'));
  };
  const exportElements = () => (s.selectedIds.size ? selected() : s.elements);
  type ExpOpts = { background: boolean; dark: boolean; scale: number };
  const exportPng = (opts: ExpOpts) => {
    const canvas = exportToCanvas(exportElements(), { background: opts.background ? s.canvasBg : null, dark: opts.dark, scale: opts.scale });
    canvas.toBlob((b) => b && download('drawing.png', b), 'image/png');
  };
  const exportSvg = async (opts: ExpOpts) => {
    const svg = await exportToSvg(exportElements(), { background: opts.background ? s.canvasBg : null, dark: opts.dark, scale: opts.scale });
    download('drawing.svg', new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  };
  const copyPng = async (opts: ExpOpts = { background: true, dark: false, scale: 2 }) => {
    const canvas = exportToCanvas(exportElements(), { background: opts.background ? s.canvasBg : null, dark: opts.dark, scale: opts.scale });
    try {
      const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast(t('Copied to clipboard'));
    } catch {
      showToast('Clipboard is not available here');
    }
  };
  const resetCanvas = () => {
    setElements([]);
    s.selectedIds = new Set();
    commit();
    setView({ scrollX: 0, scrollY: 0, zoom: 1 });
  };

  /* ---------------- copy / paste ---------------- */
  const copySelection = () => {
    const sel = selected();
    if (!sel.length) return false;
    clip.current = sel;
    const text = JSON.stringify({ type: 'jjapdraw/clipboard', elements: sel });
    navigator.clipboard?.writeText(text).catch(() => undefined);
    return true;
  };
  const pasteElements = (els: Element[]) => {
    if (!els.length) return;
    const [x0, y0, x1, y1] = commonBounds(els);
    const [px, py] = toWorld(lastPointer.current[0], lastPointer.current[1]);
    const copies = duplicateElements(els, px - (x0 + x1) / 2, py - (y0 + y1) / 2);
    setElements([...s.elements, ...copies]);
    s.selectedIds = new Set(copies.map((c) => c.id));
    s.tool = 'selection';
    commit();
    rerender();
  };

  /* ---------------- library ---------------- */
  const addToLibrary = () => {
    const sel = selected();
    if (!sel.length) return;
    s.library = [sel.map((e) => ({ ...e })), ...s.library];
    saveLibrary(s.library);
    rerender();
  };
  const removeFromLibrary = (i: number) => {
    s.library = s.library.filter((_, k) => k !== i);
    saveLibrary(s.library);
    rerender();
  };
  const insertLibraryItem = (i: number) => {
    const item = s.library[i];
    if (!item) return;
    const [x0, y0, x1, y1] = commonBounds(item);
    const [cx, cy] = screenToWorld(size.w / 2, size.h / 2, s.view);
    const copies = duplicateElements(item, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2);
    setElements([...s.elements, ...copies]);
    s.selectedIds = new Set(copies.map((c) => c.id));
    s.tool = 'selection';
    commit();
    rerender();
  };

  /* ---------------- hit testing ---------------- */
  const closeMenus = () => {
    setMainOpen(false);
    setMoreOpen(false);
    setZoomOpen(false);
  };
  const hitElement = (wx: number, wy: number, filledOnly = false): Element | null => {
    const tol = 8 / s.view.zoom;
    for (let i = s.elements.length - 1; i >= 0; i--) {
      const el = s.elements[i];
      const probe = filledOnly ? { ...el, backgroundColor: '#000' } : el;
      if (hitTest(probe, wx, wy, tol)) return el;
    }
    return null;
  };
  const handleAt = (wx: number, wy: number): string | null => {
    const sel = selected();
    if (!sel.length || s.tool !== 'selection') return null;
    const handles = frameHandles(selectionFrame(sel)!, s.view.zoom);
    const tol = (isMobile ? 14 : 8) / s.view.zoom;
    for (const [name, [hx, hy]] of Object.entries(handles)) {
      if (Math.hypot(wx - hx, wy - hy) <= tol) return name;
    }
    return null;
  };
  const insideSelectionFrame = (wx: number, wy: number) => {
    const sel = selected();
    if (sel.length < 2) return false;
    const [x0, y0, x1, y1] = commonBounds(sel);
    return wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1;
  };
  const eraseAt = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (4 / s.view.zoom)));
    const next = new Set(s.erasing);
    for (let i = 0; i <= steps; i++) {
      const px = x0 + ((x1 - x0) * i) / steps;
      const py = y0 + ((y1 - y0) * i) / steps;
      for (const el of s.elements) if (!next.has(el.id) && hitTest(el, px, py, 6 / s.view.zoom)) next.add(el.id);
    }
    s.erasing = next;
  };

  const laserRaf = useRef(0);
  const startLaserLoop = () => {
    if (laserRaf.current) return;
    const loop = () => {
      const now = performance.now();
      s.laser = s.laser.filter((p) => now - p.t < 1000);
      draw();
      if (s.laser.length || dragRef.current?.kind === 'laser') laserRaf.current = requestAnimationFrame(loop);
      else laserRaf.current = 0;
    };
    laserRaf.current = requestAnimationFrame(loop);
  };

  /* ---------------- pointer down ---------------- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    closeMenus();
    if (s.editingId) finishEditing();
    try {
      canvasRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    lastPointer.current = [e.clientX, e.clientY];
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      const d = dragRef.current;
      if (d && (d.kind === 'create' || d.kind === 'linear' || d.kind === 'freedraw')) {
        setElements(s.elements.filter((x) => x.id !== d.id));
      }
      const [a, b] = [...pointers.current.values()];
      dragRef.current = { kind: 'pinch', dist: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], view: { ...s.view } };
      rerender();
      return;
    }
    const [wx, wy] = toWorld(e.clientX, e.clientY);

    if (e.button === 1 || (e.button === 0 && spaceDown.current) || s.tool === 'hand') {
      dragRef.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view: { ...s.view } };
      setCursor('grabbing');
      return;
    }
    if (e.button !== 0) return;

    if (s.multiPointId) {
      const el = getEl(s.multiPointId);
      if (el && el.points) {
        const now = performance.now();
        const fixed = el.points[el.points.length - 2];
        if (Math.hypot(el.x + fixed[0] - wx, el.y + fixed[1] - wy) < 8 / s.view.zoom || now - lastClick.current < 300) {
          finishMultiPoint();
          return;
        }
        lastClick.current = now;
        const last = el.points[el.points.length - 1];
        replaceEl(bump({ ...el, points: [...el.points, [last[0], last[1]]] }));
        rerender();
      }
      return;
    }

    const grid = s.grid;
    switch (s.tool) {
      case 'selection': {
        const handle = handleAt(wx, wy);
        const sel = selected();
        if (handle && sel.length) {
          const orig = new Map(sel.map((x) => [x.id, x]));
          const f = selectionFrame(sel)!;
          if (handle === 'rotation') {
            const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
            dragRef.current = { kind: 'rotate', orig, cx, cy, startAngle: Math.atan2(wy - cy, wx - cx) };
          } else {
            dragRef.current = { kind: 'resize', handle, orig, frame: f };
          }
          return;
        }
        const hit = hitElement(wx, wy);
        const inFrame = insideSelectionFrame(wx, wy);
        if (hit) {
          if (e.shiftKey) {
            const next = new Set(s.selectedIds);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            s.selectedIds = next;
          } else if (!s.selectedIds.has(hit.id)) {
            s.selectedIds = new Set([hit.id]);
          }
        } else if (!e.shiftKey && !inFrame) {
          s.selectedIds = new Set();
        }
        if (s.selectedIds.size && ((hit && s.selectedIds.has(hit.id)) || (!hit && inFrame))) {
          if (e.altKey) {
            const copies = duplicateElements(selected(), 0, 0);
            setElements([...s.elements, ...copies]);
            s.selectedIds = new Set(copies.map((c) => c.id));
          }
          dragRef.current = { kind: 'move', ox: wx, oy: wy, orig: new Map(selected().map((x) => [x.id, x])) };
        } else if (!hit) {
          dragRef.current = { kind: 'box', ox: wx, oy: wy, base: e.shiftKey ? new Set(s.selectedIds) : new Set() };
        }
        rerender();
        return;
      }
      case 'rectangle':
      case 'diamond':
      case 'ellipse': {
        const x = snap(wx, grid), y = snap(wy, grid);
        const el = createElement(s.tool, x, y, s.style);
        setElements([...s.elements, el]);
        dragRef.current = { kind: 'create', id: el.id, ox: x, oy: y };
        rerender();
        return;
      }
      case 'arrow':
      case 'line': {
        const x = snap(wx, grid), y = snap(wy, grid);
        const el = createElement(s.tool, x, y, s.style, { points: [[0, 0], [0, 0]] });
        setElements([...s.elements, el]);
        dragRef.current = { kind: 'linear', id: el.id, ox: x, oy: y, sx: e.clientX, sy: e.clientY };
        rerender();
        return;
      }
      case 'freedraw': {
        const el = createElement('freedraw', wx, wy, s.style, {
          points: [[0, 0]],
          pressures: e.pointerType === 'pen' ? [e.pressure] : undefined,
        });
        setElements([...s.elements, el]);
        dragRef.current = { kind: 'freedraw', id: el.id };
        rerender();
        return;
      }
      case 'text': {
        e.preventDefault();
        const hit = hitElement(wx, wy);
        if (hit && hit.type === 'text') startEditing(hit.id);
        else createTextAt(wx, wy);
        return;
      }
      case 'sticky': {
        e.preventDefault();
        const sz = 200;
        const note = createElement('rectangle', wx - sz / 2, wy - sz / 2, s.style, {
          width: sz, height: sz, backgroundColor: '#ffec99', fillStyle: 'solid', strokeColor: '#f2c94c', roughness: 0,
          roundness: 'round', strokeStyle: 'solid', strokeWidth: 1, opacity: 100,
        });
        const m = measureText('', s.style.fontSize);
        const txt = createElement('text', note.x + 16, note.y + 16, { ...s.style, strokeColor: '#1e1e1e', opacity: 100 }, { width: m.width, height: m.height });
        setElements([...s.elements, note, txt]);
        history.push(s.elements);
        if (!s.toolLocked) s.tool = 'selection';
        startEditing(txt.id);
        return;
      }
      case 'eraser': {
        dragRef.current = { kind: 'erase', lx: wx, ly: wy };
        eraseAt(wx, wy, wx, wy);
        rerender();
        return;
      }
      case 'laser': {
        s.laser = [...s.laser, { x: wx, y: wy, t: performance.now() }];
        dragRef.current = { kind: 'laser' };
        startLaserLoop();
        return;
      }
      case 'lasso': {
        s.lasso = [[wx, wy]];
        dragRef.current = { kind: 'lasso' };
        rerender();
        return;
      }
      case 'bucket': {
        const hit = hitElement(wx, wy, true);
        if (hit && ['rectangle', 'diamond', 'ellipse'].includes(hit.type)) {
          const bg = s.style.backgroundColor === 'transparent' ? '#a5d8ff' : s.style.backgroundColor;
          replaceEl(bump({ ...hit, backgroundColor: bg, fillStyle: s.style.fillStyle }));
          commit();
          rerender();
        }
        return;
      }
    }
  };

  const updateHoverCursor = (wx: number, wy: number) => {
    let c = toolCursor(s.tool);
    if (spaceDown.current) c = 'grab';
    else if (s.tool === 'selection') {
      const h = handleAt(wx, wy);
      if (h) {
        const map: Record<string, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', rotation: 'grab' };
        c = map[h];
      } else if (hitElement(wx, wy) || insideSelectionFrame(wx, wy)) c = 'move';
    }
    if (c !== cursor) setCursor(c);
  };

  /* ---------------- pointer move ---------------- */
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    lastPointer.current = [e.clientX, e.clientY];
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    const d = dragRef.current;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const grid = s.grid;

    if (!d) {
      if (s.multiPointId) {
        const el = getEl(s.multiPointId);
        if (el && el.points) {
          let px = snap(wx, grid) - el.x, py = snap(wy, grid) - el.y;
          if (e.shiftKey) {
            const prev = el.points[el.points.length - 2];
            const [dx, dy] = snapAngle(px - prev[0], py - prev[1]);
            px = prev[0] + dx;
            py = prev[1] + dy;
          }
          replaceEl({ ...el, points: [...el.points.slice(0, -1), [px, py] as Point], version: el.version + 1 });
          draw();
        }
        return;
      }
      if (e.pointerType === 'mouse') updateHoverCursor(wx, wy);
      return;
    }

    switch (d.kind) {
      case 'pinch': {
        const vals = [...pointers.current.values()];
        if (vals.length < 2) return;
        const [a, b] = vals;
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const z = Math.min(30, Math.max(0.1, (d.view.zoom * dist) / d.dist));
        const rect = canvasRef.current!.getBoundingClientRect();
        const [wmx, wmy] = screenToWorld(d.mid[0] - rect.left, d.mid[1] - rect.top, d.view);
        s.view = { zoom: z, scrollX: (mid[0] - rect.left) / z - wmx, scrollY: (mid[1] - rect.top) / z - wmy };
        rerender();
        return;
      }
      case 'pan': {
        const z = d.view.zoom;
        s.view = { ...d.view, scrollX: d.view.scrollX + (e.clientX - d.sx) / z, scrollY: d.view.scrollY + (e.clientY - d.sy) / z };
        scheduleSave();
        rerender();
        return;
      }
      case 'create': {
        const el = getEl(d.id);
        if (!el) return;
        let w = snap(wx, grid) - d.ox, h = snap(wy, grid) - d.oy;
        if (e.shiftKey) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * m;
          h = Math.sign(h || 1) * m;
        }
        replaceEl(bump({ ...el, x: Math.min(d.ox, d.ox + w), y: Math.min(d.oy, d.oy + h), width: Math.abs(w), height: Math.abs(h) }));
        rerender();
        return;
      }
      case 'linear': {
        const el = getEl(d.id);
        if (!el) return;
        let dx = snap(wx, grid) - d.ox, dy = snap(wy, grid) - d.oy;
        if (e.shiftKey) [dx, dy] = snapAngle(dx, dy);
        replaceEl(bump({ ...el, points: [[0, 0], [dx, dy]] }));
        rerender();
        return;
      }
      case 'freedraw': {
        const el = getEl(d.id);
        if (!el || !el.points) return;
        const native = e.nativeEvent as PointerEvent;
        const coalesced = native.getCoalescedEvents ? native.getCoalescedEvents() : [];
        const events = coalesced.length ? coalesced : [native];
        const pts = [...el.points];
        const pressures = el.pressures ? [...el.pressures] : undefined;
        for (const ev of events) {
          const [px, py] = toWorld(ev.clientX, ev.clientY);
          const last = pts[pts.length - 1];
          const lp: Point = [px - el.x, py - el.y];
          if (Math.hypot(lp[0] - last[0], lp[1] - last[1]) < 0.5 / s.view.zoom) continue;
          pts.push(lp);
          pressures?.push(ev.pressure);
        }
        replaceEl({ ...el, points: pts, pressures, version: el.version + 1 });
        draw();
        return;
      }
      case 'move': {
        let dx = wx - d.ox, dy = wy - d.oy;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        if (grid) {
          const first = d.orig.values().next().value as Element;
          dx = snap(first.x + dx, true) - first.x;
          dy = snap(first.y + dy, true) - first.y;
        }
        setElements(s.elements.map((el) => {
          const o = d.orig.get(el.id);
          return o ? { ...o, x: o.x + dx, y: o.y + dy, version: o.version + 1 } : el;
        }));
        rerender();
        return;
      }
      case 'resize': {
        if (d.orig.size === 1) {
          const o = d.orig.values().next().value as Element;
          replaceEl(resizeSingle(o, d.handle, wx, wy, e.shiftKey, e.altKey));
        } else {
          setElements(s.elements.map(resizeMany(d.orig, d.frame, d.handle, wx, wy, e.shiftKey)));
        }
        rerender();
        return;
      }
      case 'rotate': {
        let delta = Math.atan2(wy - d.cy, wx - d.cx) - d.startAngle;
        if (d.orig.size === 1) {
          const o = d.orig.values().next().value as Element;
          let a = o.angle + delta;
          if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
          delta = a - o.angle;
        } else if (e.shiftKey) {
          delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
        }
        setElements(s.elements.map((el) => {
          const o = d.orig.get(el.id);
          if (!o) return el;
          const [cx, cy] = center(o);
          const [nx, ny] = rotatePoint(cx, cy, d.cx, d.cy, delta);
          let angle = (o.angle + delta) % (Math.PI * 2);
          if (angle < 0) angle += Math.PI * 2;
          return { ...o, x: nx - o.width / 2, y: ny - o.height / 2, angle, version: o.version + 1 };
        }));
        rerender();
        return;
      }
      case 'box': {
        s.selectionBox = [d.ox, d.oy, wx, wy];
        const x0 = Math.min(d.ox, wx), x1 = Math.max(d.ox, wx), y0 = Math.min(d.oy, wy), y1 = Math.max(d.oy, wy);
        const next = new Set(d.base);
        for (const el of s.elements) {
          const [a, b, c, dd] = elementBounds(el);
          if (a >= x0 && c <= x1 && b >= y0 && dd <= y1) next.add(el.id);
        }
        s.selectedIds = next;
        rerender();
        return;
      }
      case 'erase': {
        eraseAt(d.lx, d.ly, wx, wy);
        d.lx = wx;
        d.ly = wy;
        rerender();
        return;
      }
      case 'laser':
        s.laser = [...s.laser, { x: wx, y: wy, t: performance.now() }];
        return;
      case 'lasso':
        s.lasso = [...(s.lasso || []), [wx, wy]];
        draw();
        return;
    }
  };

  /* ---------------- pointer up ---------------- */
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'pinch') {
      if (pointers.current.size === 0) dragRef.current = null;
      scheduleSave();
      return;
    }
    dragRef.current = null;
    switch (d.kind) {
      case 'pan':
        setCursor(s.tool === 'hand' || spaceDown.current ? 'grab' : 'default');
        break;
      case 'create': {
        const el = getEl(d.id);
        if (!el || el.width < 2 || el.height < 2) {
          setElements(s.elements.filter((x) => x.id !== d.id));
        } else {
          afterCreate(el.id);
          commit();
        }
        break;
      }
      case 'linear': {
        const el = getEl(d.id);
        if (!el) break;
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) {
          replaceEl(bump({ ...el, points: [[0, 0], [0, 0]] }));
          s.multiPointId = el.id;
          lastClick.current = performance.now();
        } else {
          replaceEl(normalizePoints(bump(el)));
          afterCreate(el.id);
          commit();
        }
        break;
      }
      case 'freedraw': {
        const el = getEl(d.id);
        if (el) {
          let pts = el.points || [];
          if (pts.length === 1) pts = [pts[0], [pts[0][0] + 0.5, pts[0][1] + 0.5]];
          replaceEl(normalizePoints(bump({ ...el, points: pts })));
          commit();
        }
        break;
      }
      case 'move':
      case 'resize':
      case 'rotate':
        commit();
        break;
      case 'box':
        s.selectionBox = null;
        break;
      case 'erase':
        if (s.erasing.size) {
          setElements(s.elements.filter((x) => !s.erasing.has(x.id)));
          s.erasing = new Set();
          commit();
        }
        break;
      case 'lasso': {
        const poly = s.lasso || [];
        s.lasso = null;
        if (poly.length > 2) {
          const next = new Set<string>();
          for (const el of s.elements) {
            const [a, b, c, dd] = elementBounds(el);
            const corners: Point[] = [[a, b], [c, b], [c, dd], [a, dd]];
            if (corners.every(([x, y]) => pointInPolygon(x, y, poly))) next.add(el.id);
          }
          s.selectedIds = next;
          if (next.size) s.tool = 'selection';
        }
        break;
      }
    }
    rerender();
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (s.multiPointId) {
      finishMultiPoint();
      return;
    }
    if (s.tool !== 'selection') return;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const hit = hitElement(wx, wy);
    if (hit && hit.type === 'text') startEditing(hit.id);
    else if (!hit) createTextAt(wx, wy);
  };

  /* ---------------- wheel ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50) * 0.01);
        zoomAt(s.view.zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      let dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && !dx) {
        dx = dy;
        dy = 0;
      }
      setView({ ...s.view, scrollX: s.view.scrollX - dx / s.view.zoom, scrollY: s.view.scrollY - dy / s.view.zoom });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  });

  /* ---------------- keyboard & paste ---------------- */
  const TOOL_KEYS: Record<string, Tool> = {
    v: 'selection', '1': 'selection', h: 'hand', r: 'rectangle', '2': 'rectangle', d: 'diamond', '3': 'diamond',
    o: 'ellipse', '4': 'ellipse', a: 'arrow', '5': 'arrow', l: 'line', '6': 'line', p: 'freedraw', '7': 'freedraw',
    t: 'text', '8': 'text', e: 'eraser', '0': 'eraser', n: 'sticky', k: 'laser', b: 'bucket',
  };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (e.key === 'Escape') {
        if (dialog) setDialog(null);
        closeMenus();
        if (s.multiPointId) finishMultiPoint();
        else if (s.tool !== 'selection' && s.tool !== 'hand') setTool('selection');
        else s.selectedIds = new Set();
        rerender();
        return;
      }
      if (dialog) return;
      if (e.key === 'Enter' && s.multiPointId) {
        finishMultiPoint();
        return;
      }
      if (e.key === 'Enter' && s.selectedIds.size === 1) {
        const el = selected()[0];
        if (el.type === 'text') {
          e.preventDefault();
          startEditing(el.id);
        }
        return;
      }
      if (e.code === 'Space') {
        if (!spaceDown.current) {
          spaceDown.current = true;
          setCursor('grab');
        }
        e.preventDefault();
        return;
      }
      if (mod) {
        if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); return; }
        if (key === 'd') { e.preventDefault(); duplicateSelected(); return; }
        if (key === 'a') { e.preventDefault(); selectAll(); return; }
        if (key === 'c') { copySelection(); return; }
        if (key === 'x') { if (copySelection()) deleteSelected(); return; }
        if (key === 's') { e.preventDefault(); saveFile(); return; }
        if (key === 'o') { e.preventDefault(); openFile(); return; }
        if (key === 'e' && e.shiftKey) { e.preventDefault(); setDialog('export'); return; }
        if (key === '/') { e.preventDefault(); setDialog('palette'); return; }
        if (key === 'f') { e.preventDefault(); setDialog('find'); return; }
        if (key === "'") { e.preventDefault(); s.grid = !s.grid; scheduleSave(); rerender(); return; }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomStep(1); return; }
        if (e.key === '-') { e.preventDefault(); zoomStep(-1); return; }
        if (e.key === '0') { e.preventDefault(); resetZoom(); return; }
        if (e.code === 'BracketRight') { e.preventDefault(); layer(e.shiftKey ? 'front' : 'forward'); return; }
        if (e.code === 'BracketLeft') { e.preventDefault(); layer(e.shiftKey ? 'back' : 'backward'); return; }
        return;
      }
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        s.theme = dark ? 'light' : 'dark';
        scheduleSave();
        rerender();
        return;
      }
      if (e.altKey && e.code === 'KeyZ') {
        e.preventDefault();
        s.zen = !s.zen;
        rerender();
        return;
      }
      if (e.shiftKey && !e.altKey) {
        if (e.code === 'Digit1') { zoomToElements(s.elements, 1); return; }
        if (e.code === 'Digit2') { zoomToElements(selected().length ? selected() : s.elements, 30); return; }
        if (e.code === 'Digit0') { resetZoom(); return; }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key.startsWith('Arrow') && s.selectedIds.size) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setElements(s.elements.map((el) => (s.selectedIds.has(el.id) ? bump({ ...el, x: el.x + dx, y: el.y + dy }) : el)));
        commit();
        rerender();
        return;
      }
      if (e.key === '?') {
        setDialog('help');
        return;
      }
      if (e.altKey || e.shiftKey) return;
      if (key === 'q') {
        s.toolLocked = !s.toolLocked;
        scheduleSave();
        rerender();
        return;
      }
      if (key === '9') {
        insertImage();
        return;
      }
      if (TOOL_KEYS[key]) {
        e.preventDefault();
        setTool(TOOL_KEYS[key]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        setCursor(toolCursor(s.tool));
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const files = e.clipboardData?.files;
      if (files && files.length && files[0].type.startsWith('image/')) {
        e.preventDefault();
        insertImage(files[0], toWorld(lastPointer.current[0], lastPointer.current[1]));
        return;
      }
      const text = e.clipboardData?.getData('text/plain');
      if (!text) {
        if (clip.current.length) pasteElements(clip.current);
        return;
      }
      e.preventDefault();
      try {
        const data = JSON.parse(text);
        if (data && (data.type === 'jjapdraw/clipboard' || Array.isArray(data.elements))) {
          pasteElements((data.elements as unknown[]).map((r) => sanitizeElement(r)).filter(Boolean) as Element[]);
          return;
        }
      } catch {
        /* plain text */
      }
      const [wx, wy] = toWorld(lastPointer.current[0], lastPointer.current[1]);
      const m = measureText(text, s.style.fontSize);
      const el = createElement('text', wx, wy, s.style, { text, width: m.width, height: m.height });
      setElements([...s.elements, el]);
      s.selectedIds = new Set([el.id]);
      s.tool = 'selection';
      commit();
      rerender();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('paste', onPaste);
    };
  });

  /* ---------------- window size, theme, fonts ---------------- */
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => setSysDark(mq.matches);
    mq.addEventListener?.('change', onMq);
    setImageLoadCallback(() => draw());
    document.fonts
      ?.load(`20px ${HAND_FONT}`)
      .then(() => {
        s.elements = s.elements.map((el) => {
          if (el.type !== 'text') return el;
          const m = measureText(el.text || '', el.fontSize || 20);
          return { ...el, width: m.width, height: m.height, version: el.version + 1 };
        });
        history.stack[history.index] = s.elements;
        rerender();
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener('resize', onResize);
      mq.removeEventListener?.('change', onMq);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme--dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121212' : '#ffffff');
  }, [dark]);

  /* ---------------- drawing ---------------- */
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const d = dragRef.current;
    const creating = !!d && (d.kind === 'create' || d.kind === 'linear' || d.kind === 'freedraw');
    renderScene(canvas, s.elements, {
      width: w,
      height: h,
      dpr,
      view: s.view,
      background: s.canvasBg,
      selectedIds: s.editingId ? new Set() : s.selectedIds,
      erasing: s.erasing,
      hiddenIds: s.editingId ? new Set([s.editingId]) : undefined,
      selectionBox: s.selectionBox,
      showHandles: !creating && !s.multiPointId && s.tool === 'selection' && !(d && d.kind === 'box'),
      laser: s.laser,
      lasso: s.lasso,
      grid: s.grid,
    });
  }
  useLayoutEffect(() => {
    draw();
  });

  /* ---------------- derived UI state ---------------- */
  const sel = selected();
  const editingEl = s.editingId ? getEl(s.editingId) ?? null : null;
  const isEmpty = s.elements.length === 0 && !s.editingId;
  const d = dragRef.current;
  const selKey = sel.map((x) => x.id + ':' + x.version).join();

  const panelTypes = useMemo(() => {
    if (sel.length) return Array.from(new Set(sel.map((x) => x.type)));
    const map: Partial<Record<Tool, Element['type']>> = {
      rectangle: 'rectangle', diamond: 'diamond', ellipse: 'ellipse', arrow: 'arrow', line: 'line', freedraw: 'freedraw', text: 'text', sticky: 'text',
    };
    const tt = map[s.tool];
    return tt ? [tt] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, s.tool]);

  const shownStyle: StyleProps = useMemo(() => {
    if (!sel.length) return s.style;
    const first = sel[0];
    const bgEl = sel.find((x) => ['rectangle', 'diamond', 'ellipse'].includes(x.type));
    const textEl = sel.find((x) => x.type === 'text');
    const arrowEl = sel.find((x) => x.type === 'arrow');
    const strokeEl = sel.find((x) => x.type !== 'image') || first;
    return {
      ...s.style,
      strokeColor: strokeEl.strokeColor,
      backgroundColor: bgEl ? bgEl.backgroundColor : s.style.backgroundColor,
      fillStyle: bgEl ? bgEl.fillStyle : s.style.fillStyle,
      strokeWidth: strokeEl.strokeWidth,
      strokeStyle: strokeEl.strokeStyle,
      roughness: strokeEl.roughness,
      roundness: (sel.find((x) => ['rectangle', 'diamond', 'line', 'arrow'].includes(x.type)) || first).roundness,
      opacity: first.opacity,
      fontSize: textEl?.fontSize ?? s.style.fontSize,
      textAlign: textEl?.textAlign ?? s.style.textAlign,
      startArrowhead: arrowEl ? arrowEl.startArrowhead ?? null : s.style.startArrowhead,
      endArrowhead: arrowEl ? arrowEl.endArrowhead ?? null : s.style.endArrowhead,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, s.style]);

  let hintKey = '';
  if (s.multiPointId) hintKey = 'multipoint';
  else if (s.editingId) hintKey = 'editing';
  else if (d && (d.kind === 'resize' || d.kind === 'rotate')) hintKey = d.kind;
  else if (s.tool === 'selection') {
    if (sel.length === 1) hintKey = sel[0].type === 'text' ? 'selectedText' : 'selected';
    else if (sel.length > 1) hintKey = 'selectedMany';
    else hintKey = s.elements.length ? '' : 'empty';
  } else hintKey = s.tool;

  const app = {
    s, size, isMobile, dark, sel, panelTypes, shownStyle, hintKey, isEmpty, editingEl,
    canUndo: history.canUndo(), canRedo: history.canRedo(),
    mainOpen, setMainOpen, moreOpen, setMoreOpen, zoomOpen, setZoomOpen, sidebarOpen, setSidebarOpen,
    dialog, setDialog, toast, showToast,
    setTool, rerender, undo, redo, deleteSelected, duplicateSelected, layer, selectAll, changeStyle, commit,
    zoomStep, resetZoom,
    zoomToFit: () => zoomToElements(s.elements, 1),
    zoomToSelection: () => zoomToElements(sel.length ? sel : s.elements, 30),
    openFile, saveFile, exportPng, exportSvg, copyPng, resetCanvas, insertImage,
    addToLibrary, removeFromLibrary, insertLibraryItem, updateEditingText, finishEditing,
    setTheme: (th: Theme) => { s.theme = th; scheduleSave(); rerender(); },
    setCanvasBg: (c: string) => { s.canvasBg = c; scheduleSave(); rerender(); },
    setLangCode: (l: Lang) => { s.lang = l; setLang(l); scheduleSave(); rerender(); },
    toggleLock: () => { s.toolLocked = !s.toolLocked; scheduleSave(); rerender(); },
    toggleGrid: () => { s.grid = !s.grid; scheduleSave(); rerender(); },
    toggleZen: () => { s.zen = !s.zen; rerender(); },
    selectAndShow: (id: string) => {
      const el = getEl(id);
      if (!el) return;
      s.tool = 'selection';
      s.selectedIds = new Set([id]);
      const [cx, cy] = center(el);
      setView({ ...s.view, scrollX: size.w / 2 / s.view.zoom - cx, scrollY: size.h / 2 / s.view.zoom - cy });
    },
    exportCount: () => exportElements().length,
    previewCanvas: (opts: { background: boolean; dark: boolean }) =>
      exportToCanvas(exportElements(), { background: opts.background ? s.canvasBg : null, dark: opts.dark, scale: 1 }),
    libraryPreview: (els: Element[]) => exportToSvg(els, { background: null, dark: false, scale: 1 }),
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) insertImage(file, toWorld(e.clientX, e.clientY));
    else openFile(file);
  };

  return (
    <div
      className={`app ${dark ? 'theme--dark' : ''} ${isMobile ? 'is-mobile' : ''} ${s.zen ? 'zen' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        className="main-canvas"
        style={{ width: size.w, height: size.h, cursor: cursorCss(cursor) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      {editingEl && <TextEditor el={editingEl} view={s.view} onChange={updateEditingText} onDone={finishEditing} />}
      <UI app={app} />
    </div>
  );
}

export type AppApi = any;
