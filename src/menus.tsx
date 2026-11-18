import { useState, type ReactNode } from 'react';
import { Icons } from './icons';
import { t, type Lang } from './i18n';
import { CANVAS_PICKS } from './scene';
import type { AppApi } from './App';
import type { Theme } from './types';

export function MenuItem({
  icon, label, shortcut, onClick, accent, badge, right,
}: { icon?: ReactNode; label: string; shortcut?: string; onClick?: () => void; accent?: boolean; badge?: string; right?: ReactNode }) {
  return (
    <button type="button" role="menuitem" className={`menu-item ${accent ? 'menu-item--accent' : ''}`} onClick={onClick}>
      <span className="menu-item-icon">{icon}</span>
      <span className="menu-item-label">{label}</span>
      {shortcut && <span className="menu-item-shortcut">{shortcut}</span>}
      {badge && <span className="menu-badge">{badge}</span>}
      {right}
    </button>
  );
}

export function MainMenu({ app }: { app: AppApi }) {
  const [prefs, setPrefs] = useState(false);
  const m = app.isMobile;
  const close = () => app.setMainOpen(false);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const themeBtn = (th: Theme, icon: ReactNode, label: string) => (
    <button
      type="button"
      className={`theme-opt ${app.s.theme === th ? 'is-active' : ''}`}
      aria-label={t(label)}
      title={t(label)}
      onClick={() => app.setTheme(th)}
    >
      {icon}
    </button>
  );
  return (
    <div className="island dropdown main-menu" role="dialog" aria-label="Main menu">
      <MenuItem icon={Icons.folder} label={t('Open')} shortcut={m ? undefined : 'Ctrl+O'} onClick={run(() => app.openFile())} />
      <MenuItem icon={Icons.download} label={t('Save to...')} onClick={run(app.saveFile)} />
      <MenuItem icon={Icons.exportImage} label={t('Export image...')} shortcut={m ? undefined : 'Ctrl+Shift+E'} onClick={run(() => app.setDialog('export'))} />
      <MenuItem icon={Icons.users} label={t('Live collaboration...')} onClick={run(() => app.setDialog('collab'))} />
      <MenuItem icon={Icons.bolt} label={t('Command palette')} shortcut={m ? undefined : 'Ctrl+/'} accent onClick={run(() => app.setDialog('palette'))} />
      <MenuItem icon={Icons.search} label={t('Find on canvas')} shortcut={m ? undefined : 'Ctrl+F'} onClick={run(() => app.setDialog('find'))} />
      <MenuItem icon={Icons.help} label={t('Help')} shortcut={m ? undefined : '?'} onClick={run(() => app.setDialog('help'))} />
      <MenuItem icon={Icons.trash} label={t('Reset the canvas')} onClick={run(() => app.setDialog('reset'))} />
      <div className="menu-sep" />
      <MenuItem icon={<span className="logo-mini">{Icons.logo}</span>} label={t('About JjapDraw')} onClick={run(() => app.setDialog('about'))} />
      <MenuItem icon={Icons.book} label={t('Library')} onClick={run(() => app.setSidebarOpen(true))} />
      <MenuItem icon={Icons.keyboard} label={t('Keyboard shortcuts')} onClick={run(() => app.setDialog('help'))} />
      <MenuItem icon={Icons.copy} label={t('Copy to clipboard as PNG')} onClick={run(() => app.copyPng())} />
      <MenuItem icon={Icons.save} label={t('Save to file')} accent onClick={run(app.saveFile)} />
      <div className="menu-sep" />
      <div className="prefs-wrap">
        <MenuItem icon={Icons.settings} label={t('Preferences')} right={<span className="menu-chevron">{Icons.chevronRight}</span>} onClick={() => setPrefs(!prefs)} />
        {prefs && (
          <div className="island dropdown prefs-menu" role="menu">
            <MenuItem icon={<Check on={app.s.toolLocked} />} label={t('Tool lock')} shortcut="Q" onClick={app.toggleLock} />
            <MenuItem icon={<Check on={app.s.grid} />} label={t('Toggle grid')} shortcut="Ctrl+'" onClick={app.toggleGrid} />
            <MenuItem icon={<Check on={app.s.zen} />} label={t('Zen mode')} shortcut="Alt+Z" onClick={app.toggleZen} />
            <MenuItem icon={<Check on={app.dark} />} label={t('Dark mode')} shortcut="Alt+Shift+D" onClick={() => app.setTheme(app.dark ? 'light' : 'dark')} />
          </div>
        )}
      </div>
      <div className="menu-row">
        <span className="menu-row-label">{t('Theme')}</span>
        <div className="theme-toggle" role="radiogroup">
          {themeBtn('light', Icons.sun, 'Light')}
          {themeBtn('dark', Icons.moon, 'Dark')}
          {themeBtn('system', Icons.monitor, 'System')}
        </div>
      </div>
      <div className="lang-wrap">
        <select className="lang-select" aria-label={t('Language')} value={app.s.lang} onChange={(e) => app.setLangCode(e.target.value as Lang)}>
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </div>
      <div className="menu-heading">{t('Canvas background')}</div>
      <div className={`canvas-bg-row ${m ? 'canvas-bg-row--mobile' : ''}`}>
        {!m &&
          CANVAS_PICKS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${app.s.canvasBg === c ? 'is-active' : ''}`}
              style={{ background: c }}
              aria-label={c}
              title={c}
              onClick={() => app.setCanvasBg(c)}
            />
          ))}
        {!m && <div className="swatch-sep" />}
        <label className="swatch swatch--custom" style={{ background: app.s.canvasBg }} title={app.s.canvasBg}>
          <input type="color" value={app.s.canvasBg.length === 7 ? app.s.canvasBg : '#ffffff'} onChange={(e) => app.setCanvasBg(e.target.value)} aria-label={t('Canvas background')} />
        </label>
      </div>
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {on ? <path d="M5 12l5 5L20 7" /> : null}
    </svg>
  );
}

export function MoreToolsMenu({ app }: { app: AppApi }) {
  const m = app.isMobile;
  const close = () => app.setMoreOpen(false);
  const soon = () => {
    close();
    app.showToast(t('Not available in JjapDraw yet'));
  };
  const pickTool = (tool: string) => () => {
    close();
    app.setTool(tool);
  };
  return (
    <div className={`island dropdown more-menu ${m ? 'more-menu--mobile' : ''}`} role="menu">
      <MenuItem icon={Icons.photo} label={t('Insert image')} shortcut={m ? undefined : '9'} onClick={() => { close(); app.insertImage(); }} />
      {m && <MenuItem icon={Icons.sticky} label={t('Sticky note')} onClick={pickTool('sticky')} />}
      <MenuItem icon={Icons.frame} label={t('Frame tool')} shortcut={m ? undefined : 'F'} onClick={soon} />
      <MenuItem icon={Icons.code} label={t('Web Embed')} onClick={soon} />
      <MenuItem icon={Icons.shapes} label={t('Draw to shape')} shortcut={m ? undefined : 'Shift+X'} onClick={soon} />
      <MenuItem icon={Icons.laser} label={t('Laser pointer')} shortcut={m ? undefined : 'K'} onClick={pickTool('laser')} />
      <MenuItem icon={Icons.bucket} label={t('Bucket fill')} shortcut={m ? undefined : 'B'} onClick={pickTool('bucket')} />
      {!m && <MenuItem icon={Icons.lasso} label={t('Lasso selection')} onClick={pickTool('lasso')} />}
      <div className="menu-group-title">{t('Generate')}</div>
      <MenuItem icon={Icons.brain} label={t('Text to diagram')} badge="AI" onClick={soon} />
      <MenuItem icon={Icons.mermaid} label={t('Mermaid to JjapDraw')} onClick={soon} />
      <MenuItem icon={Icons.wand} label={t('Wireframe to code')} badge="AI" onClick={soon} />
    </div>
  );
}

export function ZoomMenu({ app }: { app: AppApi }) {
  const run = (fn: () => void) => () => {
    app.setZoomOpen(false);
    fn();
  };
  return (
    <div className="island dropdown zoom-menu" role="menu">
      <MenuItem icon={Icons.plus} label={t('Zoom in')} shortcut="Ctrl++" onClick={() => app.zoomStep(1)} />
      <MenuItem icon={Icons.minus} label={t('Zoom out')} shortcut="Ctrl+-" onClick={() => app.zoomStep(-1)} />
      <div className="menu-sep" />
      <MenuItem icon={Icons.zoomFit} label={t('Zoom to fit')} shortcut="Shift+1" onClick={run(app.zoomToFit)} />
      <MenuItem icon={Icons.zoomFit} label={t('Zoom to selection')} shortcut="Shift+2" onClick={run(app.zoomToSelection)} />
      <MenuItem icon={Icons.zoomReset} label={t('Reset zoom')} shortcut="Shift+0" onClick={run(app.resetZoom)} />
    </div>
  );
}
