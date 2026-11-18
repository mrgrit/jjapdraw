import { useState } from 'react';
import type { Tool } from './types';
import { Icons } from './icons';
import { t } from './i18n';
import { MainMenu, MoreToolsMenu, ZoomMenu } from './menus';
import { PropertiesPanel } from './panel';
import { Dialogs } from './dialogs';
import { Welcome, HintArrows } from './welcome';
import { Sidebar } from './sidebar';
import type { AppApi } from './App';

export type Dialog = null | 'help' | 'export' | 'share' | 'palette' | 'find' | 'reset' | 'about' | 'collab';

interface ToolDef {
  tool: Tool;
  icon: JSX.Element;
  label: string;
  key?: string;
  num?: string;
}

export const TOOLS: ToolDef[] = [
  { tool: 'hand', icon: Icons.hand, label: 'Hand (panning tool)', num: 'H' },
  { tool: 'selection', icon: Icons.pointer, label: 'Selection', key: 'V', num: '1' },
  { tool: 'rectangle', icon: Icons.rectangle, label: 'Rectangle', key: 'R', num: '2' },
  { tool: 'diamond', icon: Icons.diamond, label: 'Diamond', key: 'D', num: '3' },
  { tool: 'ellipse', icon: Icons.ellipse, label: 'Ellipse', key: 'O', num: '4' },
  { tool: 'arrow', icon: Icons.arrow, label: 'Arrow', key: 'A', num: '5' },
  { tool: 'line', icon: Icons.line, label: 'Line', key: 'L', num: '6' },
  { tool: 'freedraw', icon: Icons.pencil, label: 'Draw', key: 'P', num: '7' },
  { tool: 'text', icon: Icons.text, label: 'Text', key: 'T', num: '8' },
  { tool: 'sticky', icon: Icons.sticky, label: 'Sticky note', key: 'N' },
  { tool: 'eraser', icon: Icons.eraser, label: 'Eraser', key: 'E', num: '0' },
];

const toolDef = (tool: Tool) => TOOLS.find((x) => x.tool === tool)!;

function ToolButton({ def, app, showKey }: { def: ToolDef; app: AppApi; showKey: boolean }) {
  const active = app.s.tool === def.tool;
  const title = `${t(def.label)}${def.key ? ` — ${def.key}${def.num ? ` ${t('or')} ${def.num}` : ''}` : def.num ? ` — ${def.num}` : ''}`;
  return (
    <button
      type="button"
      className={`tool-btn ${active ? 'is-active' : ''}`}
      title={title}
      aria-label={t(def.label)}
      aria-pressed={active}
      onClick={() => app.setTool(def.tool)}
    >
      {def.icon}
      {showKey && def.key && <span className="tool-key">{def.key}</span>}
    </button>
  );
}

function DesktopToolbar({ app }: { app: AppApi }) {
  const wide = app.size.w >= 1100;
  return (
    <section className="toolbar-section" aria-labelledby="shapes-title">
      <h2 className="visually-hidden" id="shapes-title">Shapes</h2>
      <div className={`island toolbar ${wide ? '' : 'toolbar--compact'}`}>
        <button
          type="button"
          className={`tool-btn ${app.s.toolLocked ? 'is-active' : ''}`}
          title={`${t('Keep selected tool active after drawing')} — Q`}
          aria-label={t('Keep selected tool active after drawing')}
          aria-pressed={app.s.toolLocked}
          onClick={app.toggleLock}
        >
          {app.s.toolLocked ? Icons.lock : Icons.lockOpen}
        </button>
        <div className="toolbar-divider" />
        <div className="toolbar-tools">
          {TOOLS.map((d) => (
            <ToolButton key={d.tool} def={d} app={app} showKey={wide} />
          ))}
        </div>
        <div className="toolbar-divider" />
        <button
          type="button"
          className={`tool-btn ${['laser', 'lasso', 'bucket'].includes(app.s.tool) ? 'is-active' : ''}`}
          title={t('More tools')}
          aria-label={t('More tools')}
          aria-haspopup="menu"
          aria-expanded={app.moreOpen}
          onClick={() => app.setMoreOpen(!app.moreOpen)}
        >
          {Icons.dots}
        </button>
      </div>
      {!app.isMobile && <ToolHint app={app} />}
    </section>
  );
}

function ToolHint({ app }: { app: AppApi }) {
  const k = app.hintKey as string;
  let content: JSX.Element | string | null = null;
  if (k === 'empty') {
    content = (
      <>
        {t('To move canvas, hold')} <kbd>{t('Scroll wheel')}</kbd> {t('or')} <kbd>{t('Space')}</kbd> {t('while dragging, or use the hand tool')}
      </>
    );
  } else {
    const map: Record<string, string> = {
      rectangle: 'Click and drag to draw. Hold Shift for a perfect square',
      diamond: 'Click and drag to draw. Hold Shift to keep it even',
      ellipse: 'Click and drag to draw. Hold Shift for a perfect circle',
      arrow: 'Click to start multiple points, drag for a single line',
      line: 'Click to start multiple points, drag for a single line',
      freedraw: 'Click and drag to draw freely, release when finished',
      text: 'Click anywhere to add text',
      sticky: 'Click anywhere to place a sticky note',
      eraser: 'Drag over shapes to erase them',
      hand: 'Drag to move around the canvas',
      laser: 'Drag to point at things; the trail fades away',
      lasso: 'Draw a loop around the shapes you want to select',
      bucket: 'Click a shape to fill it with the background colour',
      multipoint: 'Click to add points. Press Escape or Enter to finish',
      editing: 'Press Escape or Ctrl+Enter to finish editing',
      selected: 'Hold Shift while resizing to keep proportions, Alt to resize from the centre',
      selectedText: 'Press Enter to edit the text',
      selectedMany: 'Shift+click to add or remove shapes from the selection',
      resize: 'Hold Shift to keep proportions',
      rotate: 'Hold Shift to snap the angle',
    };
    content = map[k] || null;
  }
  if (!content) return null;
  return <div className="tool-hint">{content}</div>;
}

function MobileToolbar({ app }: { app: AppApi }) {
  const [flyout, setFlyout] = useState<null | 'shape' | 'linear'>(null);
  const [shapeTool, setShapeTool] = useState<Tool>('rectangle');
  const [linearTool, setLinearTool] = useState<Tool>('arrow');
  const cur = app.s.tool as Tool;
  const shapeActive = ['rectangle', 'diamond', 'ellipse'].includes(cur);
  const linearActive = ['arrow', 'line'].includes(cur);
  const shown = shapeActive ? cur : shapeTool;
  const shownLinear = linearActive ? cur : linearTool;
  const pick = (tool: Tool) => {
    if (['rectangle', 'diamond', 'ellipse'].includes(tool)) setShapeTool(tool);
    if (['arrow', 'line'].includes(tool)) setLinearTool(tool);
    setFlyout(null);
    app.setTool(tool);
  };
  const btn = (tool: Tool, onClick?: () => void) => {
    const def = toolDef(tool);
    return (
      <button
        type="button"
        key={tool}
        className={`tool-btn ${cur === tool ? 'is-active' : ''}`}
        aria-label={t(def.label)}
        title={t(def.label)}
        onClick={onClick ?? (() => pick(tool))}
      >
        {def.icon}
      </button>
    );
  };
  return (
    <section className="mobile-toolbar-section" aria-labelledby="shapes-title-m">
      <h2 className="visually-hidden" id="shapes-title-m">Shapes</h2>
      {flyout && (
        <div className="island mobile-flyout" style={{ left: flyout === 'shape' ? 156 : 219 }}>
          {(flyout === 'shape' ? (['rectangle', 'diamond', 'ellipse'] as Tool[]) : (['arrow', 'line'] as Tool[])).map((tool) => btn(tool))}
        </div>
      )}
      <div className="island toolbar mobile-toolbar">
        {btn('hand')}
        {btn('selection')}
        {btn('freedraw')}
        {btn('eraser')}
        {btn(shown, () => (shapeActive ? setFlyout(flyout === 'shape' ? null : 'shape') : pick(shown)))}
        {btn(shownLinear, () => (linearActive ? setFlyout(flyout === 'linear' ? null : 'linear') : pick(shownLinear)))}
        {btn('text')}
        <button
          type="button"
          className={`tool-btn ${app.moreOpen ? 'is-active' : ''}`}
          aria-label={t('More tools')}
          title={t('More tools')}
          aria-haspopup="menu"
          aria-expanded={app.moreOpen}
          onClick={() => app.setMoreOpen(!app.moreOpen)}
        >
          {Icons.dots}
        </button>
      </div>
    </section>
  );
}

function TopRight({ app }: { app: AppApi }) {
  const wide = app.size.w >= 1100;
  if (app.isMobile) {
    return (
      <div className="top-right">
        <button type="button" className="square-btn" aria-label={t('Library')} title={t('Library')} onClick={() => app.setSidebarOpen(!app.sidebarOpen)}>
          {Icons.sidebar}
        </button>
      </div>
    );
  }
  return (
    <div className="top-right">
      {wide && (
        <button type="button" className="promo-btn" onClick={() => app.setDialog('export')}>
          {Icons.presentation}
          <span className="promo-text">
            <span className="promo-title">{t('Export image')}</span>
            <span className="promo-sub">{t('PNG or SVG')}</span>
          </span>
        </button>
      )}
      <button type="button" className={`share-btn ${wide ? '' : 'share-btn--icon'}`} aria-label={t('Share')} title={t('Share')} onClick={() => app.setDialog('share')}>
        {wide ? t('Share') : Icons.share}
      </button>
      <button type="button" className="square-btn" aria-label={t('Library')} title={t('Library')} onClick={() => app.setSidebarOpen(!app.sidebarOpen)}>
        {Icons.sidebar}
      </button>
    </div>
  );
}

function Footer({ app }: { app: AppApi }) {
  if (app.isMobile) {
    return (
      <div className="mobile-undo">
        <button type="button" className="plain-btn" aria-label={t('Undo')} title={t('Undo')} disabled={!app.canUndo} onClick={app.undo}>
          {Icons.undo}
        </button>
        <button type="button" className="plain-btn" aria-label={t('Redo')} title={t('Redo')} disabled={!app.canRedo} onClick={app.redo}>
          {Icons.redo}
        </button>
      </div>
    );
  }
  return (
    <footer className="footer">
      <section className="footer-left" aria-labelledby="canvas-actions-title">
        <h2 className="visually-hidden" id="canvas-actions-title">Canvas actions</h2>
        <div className="btn-group">
          <button
            type="button"
            className={`zoom-value ${app.zoomOpen ? 'is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={app.zoomOpen}
            title={t('Reset zoom')}
            onClick={() => app.setZoomOpen(!app.zoomOpen)}
          >
            {Math.round(app.s.view.zoom * 100)}%
          </button>
          <button type="button" className="group-btn" aria-label={t('Fit everything on screen')} title={t('Fit everything on screen')} onClick={app.zoomToFit}>
            {Icons.map}
          </button>
        </div>
        <div className="btn-group">
          <button type="button" className="group-btn" aria-label={t('Undo')} title={`${t('Undo')} — Ctrl+Z`} disabled={!app.canUndo} onClick={app.undo}>
            {Icons.undo}
          </button>
          <button type="button" className="group-btn" aria-label={t('Redo')} title={`${t('Redo')} — Ctrl+Y`} disabled={!app.canRedo} onClick={app.redo}>
            {Icons.redo}
          </button>
        </div>
      </section>
      <div className="footer-right">
        <button type="button" className="shield-btn" aria-label={t('Your drawing stays in this browser')} title={t('Your drawing stays in this browser')} onClick={() => app.showToast(t('Your drawing stays in this browser'))}>
          {Icons.shield}
        </button>
        <button type="button" className="square-btn" aria-label={t('Help')} title={`${t('Help')} — ?`} onClick={() => app.setDialog('help')}>
          {Icons.help}
        </button>
      </div>
    </footer>
  );
}

export function UI({ app }: { app: AppApi }) {
  const showPanel = app.panelTypes.length > 0 && !app.s.zen;
  const showWelcome = app.isEmpty && ['selection', 'hand'].includes(app.s.tool) && !app.s.multiPointId;
  return (
    <div className="ui-layer">
      <h1 className="visually-hidden app-title">JjapDraw</h1>
      {showWelcome && <Welcome app={app} />}
      {showWelcome && !app.isMobile && !app.s.zen && <HintArrows app={app} />}
      {!app.s.zen && app.isMobile && <MobileToolbar app={app} />}
      <div className="top-left">
        <button
          type="button"
          className={`square-btn menu-btn ${app.mainOpen ? 'is-open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={app.mainOpen}
          onClick={() => app.setMainOpen(!app.mainOpen)}
        >
          {Icons.menu}
        </button>
      </div>
      {!app.s.zen && !app.isMobile && <DesktopToolbar app={app} />}
      {!app.s.zen && <TopRight app={app} />}
      {showPanel && <PropertiesPanel app={app} />}
      <Footer app={app} />
      {app.mainOpen && <MainMenu app={app} />}
      {app.moreOpen && <MoreToolsMenu app={app} />}
      {app.zoomOpen && !app.isMobile && <ZoomMenu app={app} />}
      {app.sidebarOpen && <Sidebar app={app} />}
      <Dialogs app={app} />
      {app.toast && <div className="toast" role="status">{app.toast}</div>}
    </div>
  );
}
