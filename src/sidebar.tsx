import { useEffect, useState } from 'react';
import { Icons } from './icons';
import { t } from './i18n';
import type { AppApi } from './App';
import type { Element } from './types';

function LibraryItem({ els, app, index }: { els: Element[]; app: AppApi; index: number }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let alive = true;
    app.libraryPreview(els).then((svg: SVGSVGElement) => {
      if (!alive) return;
      const text = new XMLSerializer().serializeToString(svg);
      setSrc('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text));
    });
    return () => {
      alive = false;
    };
  }, [els]);
  return (
    <div className="library-item">
      <button type="button" className="library-item-btn" title="Insert" onClick={() => app.insertLibraryItem(index)}>
        {src && <img src={src} alt="" />}
      </button>
      <button type="button" className="library-remove" aria-label="Remove" title="Remove" onClick={() => app.removeFromLibrary(index)}>
        {Icons.close}
      </button>
    </div>
  );
}

export function Sidebar({ app }: { app: AppApi }) {
  const lib: Element[][] = app.s.library;
  return (
    <aside className="island sidebar" aria-label={t('Library')}>
      <div className="sidebar-header">
        <span className="sidebar-title">{t('Library')}</span>
        <button type="button" className="plain-btn" aria-label={t('Close')} onClick={() => app.setSidebarOpen(false)}>
          {Icons.close}
        </button>
      </div>
      <button type="button" className="primary-btn sidebar-add" disabled={!app.sel.length} onClick={app.addToLibrary}>
        {t('Add selected to library')}
      </button>
      {lib.length === 0 ? (
        <div className="sidebar-empty">{t('No items yet')}</div>
      ) : (
        <div className="library-grid">
          {lib.map((els, i) => (
            <LibraryItem key={i + ':' + els.map((e) => e.id).join()} els={els} app={app} index={i} />
          ))}
        </div>
      )}
    </aside>
  );
}
