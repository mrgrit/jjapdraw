import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icons } from './icons';
import { t } from './i18n';
import type { AppApi } from './App';
import type { Element } from './types';

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="plain-btn" aria-label={t('Close')} onClick={onClose}>
            {Icons.close}
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const SHORTCUTS: [string, [string, string][]][] = [
  ['Tools', [
    ['Hand (panning tool)', 'H'], ['Selection', 'V or 1'], ['Rectangle', 'R or 2'], ['Diamond', 'D or 3'], ['Ellipse', 'O or 4'],
    ['Arrow', 'A or 5'], ['Line', 'L or 6'], ['Draw', 'P or 7'], ['Text', 'T or 8'], ['Insert image', '9'], ['Eraser', 'E or 0'],
    ['Sticky note', 'N'], ['Laser pointer', 'K'], ['Bucket fill', 'B'], ['Keep selected tool active after drawing', 'Q'],
  ]],
  ['View', [
    ['Zoom in', 'Ctrl + +'], ['Zoom out', 'Ctrl + -'], ['Reset zoom', 'Shift + 0'], ['Zoom to fit', 'Shift + 1'], ['Zoom to selection', 'Shift + 2'],
    ['Move canvas', 'Space + drag / Scroll'], ['Toggle grid', "Ctrl + '"], ['Zen mode', 'Alt + Z'], ['Dark mode', 'Alt + Shift + D'],
  ]],
  ['Editor', [
    ['Undo', 'Ctrl + Z'], ['Redo', 'Ctrl + Y / Ctrl + Shift + Z'], ['Delete', 'Delete'], ['Duplicate', 'Ctrl + D'], ['Select all', 'Ctrl + A'],
    ['Copy / Cut / Paste', 'Ctrl + C / X / V'], ['Bring forward', 'Ctrl + ]'], ['Send backward', 'Ctrl + ['], ['Bring to front', 'Ctrl + Shift + ]'],
    ['Send to back', 'Ctrl + Shift + ['], ['Move by 1px / 5px', 'Arrows / Shift + Arrows'], ['Keep proportions', 'Shift while resizing'],
    ['Duplicate while moving', 'Alt + drag'], ['Open', 'Ctrl + O'], ['Save to file', 'Ctrl + S'], ['Export image', 'Ctrl + Shift + E'],
    ['Command palette', 'Ctrl + /'], ['Find on canvas', 'Ctrl + F'],
  ]],
];

function HelpDialog({ app }: { app: AppApi }) {
  return (
    <Modal title={t('Keyboard shortcuts')} onClose={() => app.setDialog(null)} wide>
      <div className="shortcut-cols">
        {SHORTCUTS.map(([group, rows]) => (
          <div className="shortcut-group" key={group}>
            <h3>{group}</h3>
            {rows.map(([label, keys]) => (
              <div className="shortcut-row" key={label}>
                <span>{t(label)}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ExportDialog({ app }: { app: AppApi }) {
  const [background, setBackground] = useState(true);
  const [darkExport, setDarkExport] = useState(false);
  const [scale, setScale] = useState(2);
  const previewRef = useRef<HTMLDivElement>(null);
  const count = app.exportCount();
  useEffect(() => {
    const box = previewRef.current;
    if (!box) return;
    box.innerHTML = '';
    if (!count) return;
    const c: HTMLCanvasElement = app.previewCanvas({ background, dark: darkExport });
    c.className = 'export-preview-canvas';
    box.appendChild(c);
  }, [background, darkExport, count]);
  const opts = { background, dark: darkExport, scale };
  return (
    <Modal title={t('Export image')} onClose={() => app.setDialog(null)} wide>
      <div className="export-layout">
        <div className={`export-preview ${background ? '' : 'is-transparent'}`} ref={previewRef}>
          {!count && <span className="muted">Nothing to export yet — draw something first.</span>}
        </div>
        <div className="export-options">
          <label className="switch-row">
            <span>{t('Background on')}</span>
            <input type="checkbox" checked={background} onChange={(e) => setBackground(e.target.checked)} />
          </label>
          <label className="switch-row">
            <span>{t('Dark mode')}</span>
            <input type="checkbox" checked={darkExport} onChange={(e) => setDarkExport(e.target.checked)} />
          </label>
          <div className="switch-row">
            <span>{t('Scale')}</span>
            <div className="seg">
              {[1, 2, 3].map((v) => (
                <button type="button" key={v} className={`seg-btn ${scale === v ? 'is-active' : ''}`} onClick={() => setScale(v)}>
                  {v}×
                </button>
              ))}
            </div>
          </div>
          <div className="export-buttons">
            <button type="button" className="primary-btn" disabled={!count} onClick={() => app.exportPng(opts)}>
              {Icons.download} PNG
            </button>
            <button type="button" className="primary-btn" disabled={!count} onClick={() => app.exportSvg(opts)}>
              {Icons.download} SVG
            </button>
            <button type="button" className="secondary-btn" disabled={!count} onClick={() => app.copyPng(opts)}>
              {Icons.copy} {t('Copy to clipboard')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ShareDialog({ app }: { app: AppApi }) {
  return (
    <Modal title={t('Share')} onClose={() => app.setDialog(null)}>
      <p className="muted">JjapDraw works offline and keeps your drawing in this browser. Share it as a file or an image:</p>
      <div className="stack-buttons">
        <button type="button" className="primary-btn" onClick={() => { app.saveFile(); app.setDialog(null); }}>
          {Icons.download} {t('Save to file')}
        </button>
        <button type="button" className="secondary-btn" onClick={() => app.setDialog('export')}>
          {Icons.exportImage} {t('Export image...')}
        </button>
        <button type="button" className="secondary-btn" onClick={() => app.copyPng()}>
          {Icons.copy} {t('Copy to clipboard as PNG')}
        </button>
      </div>
    </Modal>
  );
}

function CommandPalette({ app }: { app: AppApi }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const close = () => app.setDialog(null);
  const commands: [string, string, () => void][] = useMemo(
    () => [
      ['Open', 'Ctrl+O', () => app.openFile()],
      ['Save to file', 'Ctrl+S', app.saveFile],
      ['Export image...', 'Ctrl+Shift+E', () => app.setDialog('export')],
      ['Copy to clipboard as PNG', '', () => app.copyPng()],
      ['Undo', 'Ctrl+Z', app.undo],
      ['Redo', 'Ctrl+Y', app.redo],
      ['Select all', 'Ctrl+A', app.selectAll],
      ['Duplicate', 'Ctrl+D', app.duplicateSelected],
      ['Delete', 'Delete', app.deleteSelected],
      ['Zoom in', 'Ctrl++', () => app.zoomStep(1)],
      ['Zoom out', 'Ctrl+-', () => app.zoomStep(-1)],
      ['Zoom to fit', 'Shift+1', app.zoomToFit],
      ['Reset zoom', 'Shift+0', app.resetZoom],
      ['Toggle grid', "Ctrl+'", app.toggleGrid],
      ['Zen mode', 'Alt+Z', app.toggleZen],
      ['Dark mode', 'Alt+Shift+D', () => app.setTheme(app.dark ? 'light' : 'dark')],
      ['Library', '', () => app.setSidebarOpen(true)],
      ['Find on canvas', 'Ctrl+F', () => app.setDialog('find')],
      ['Keyboard shortcuts', '?', () => app.setDialog('help')],
      ['Reset the canvas', '', () => app.setDialog('reset')],
      ['Rectangle', 'R', () => app.setTool('rectangle')],
      ['Diamond', 'D', () => app.setTool('diamond')],
      ['Ellipse', 'O', () => app.setTool('ellipse')],
      ['Arrow', 'A', () => app.setTool('arrow')],
      ['Line', 'L', () => app.setTool('line')],
      ['Draw', 'P', () => app.setTool('freedraw')],
      ['Text', 'T', () => app.setTool('text')],
      ['Eraser', 'E', () => app.setTool('eraser')],
      ['Laser pointer', 'K', () => app.setTool('laser')],
      ['Insert image', '9', () => app.insertImage()],
    ],
    [app],
  );
  const list = commands.filter(([label]) => t(label).toLowerCase().includes(q.toLowerCase()) || label.toLowerCase().includes(q.toLowerCase()));
  const runAt = (i: number) => {
    const c = list[i];
    if (!c) return;
    if (!['Export image...', 'Find on canvas', 'Keyboard shortcuts', 'Reset the canvas'].includes(c[0])) close();
    c[2]();
  };
  return (
    <Modal title={t('Command palette')} onClose={close}>
      <input
        className="text-input"
        autoFocus
        placeholder={t('Type a command...')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setIdx(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
          if (e.key === 'Enter') runAt(idx);
          if (e.key === 'Escape') close();
        }}
      />
      <div className="palette-list">
        {list.map(([label, sc], i) => (
          <button type="button" key={label} className={`palette-item ${i === idx ? 'is-active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => runAt(i)}>
            <span>{t(label)}</span>
            {sc && <kbd>{sc}</kbd>}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function FindDialog({ app }: { app: AppApi }) {
  const [q, setQ] = useState('');
  const texts: Element[] = app.s.elements.filter((e: Element) => e.type === 'text');
  const results = q ? texts.filter((e) => (e.text || '').toLowerCase().includes(q.toLowerCase())) : texts;
  return (
    <Modal title={t('Find on canvas')} onClose={() => app.setDialog(null)}>
      <input
        className="text-input"
        autoFocus
        placeholder={t('Search text...')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) app.selectAndShow(results[0].id);
          if (e.key === 'Escape') app.setDialog(null);
        }}
      />
      <div className="palette-list">
        {results.length === 0 && <div className="muted">No matching text</div>}
        {results.map((el) => (
          <button type="button" key={el.id} className="palette-item" onClick={() => app.selectAndShow(el.id)}>
            <span className="find-text">{el.text}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function Dialogs({ app }: { app: AppApi }) {
  const close = () => app.setDialog(null);
  switch (app.dialog) {
    case 'help':
      return <HelpDialog app={app} />;
    case 'export':
      return <ExportDialog app={app} />;
    case 'share':
      return <ShareDialog app={app} />;
    case 'palette':
      return <CommandPalette app={app} />;
    case 'find':
      return <FindDialog app={app} />;
    case 'reset':
      return (
        <Modal title={t('Reset the canvas')} onClose={close}>
          <p>{t('This will clear the whole canvas. Are you sure?')}</p>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={close}>{t('Cancel')}</button>
            <button type="button" className="danger-btn" onClick={() => { app.resetCanvas(); close(); }}>{t('Confirm')}</button>
          </div>
        </Modal>
      );
    case 'about':
      return (
        <Modal title={t('About JjapDraw')} onClose={close}>
          <p>JjapDraw is a hand-drawn style whiteboard that runs entirely in your browser. Your drawing is saved automatically on this device; use “Save to file” to keep a copy.</p>
          <p className="muted">Sketchy shapes are drawn with rough.js.</p>
        </Modal>
      );
    case 'collab':
      return (
        <Modal title={t('Live collaboration...')} onClose={close}>
          <p>Live collaboration needs a server, and this version of JjapDraw runs fully offline. To work with someone else, save the drawing to a file and send it to them.</p>
          <div className="modal-actions">
            <button type="button" className="primary-btn" onClick={() => { app.saveFile(); close(); }}>{t('Save to file')}</button>
          </div>
        </Modal>
      );
    default:
      return null;
  }
}
