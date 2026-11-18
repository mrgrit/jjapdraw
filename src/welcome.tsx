import { Icons } from './icons';
import { t } from './i18n';
import type { AppApi } from './App';

export function Logo() {
  return (
    <div className="welcome-logo" aria-label="JjapDraw">
      <svg className="welcome-logo-icon" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <path d="M6 31 L9 22 L27 4 L36 13 L18 31 Z" fill="#6965db" />
        <path d="M6 31 L9 22 L18 31 Z" fill="#a9a6ef" />
        <path d="M24 7 L33 16" stroke="#fff" strokeWidth="2" />
        <path d="M4 37 C 12 33, 20 39, 30 35" fill="none" stroke="#6965db" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="welcome-logo-text">JJAPDRAW</span>
    </div>
  );
}

export function Welcome({ app }: { app: AppApi }) {
  return (
    <div className="welcome">
      <div className="welcome-center">
        <Logo />
        <div className="welcome-heading">
          {t("Your drawings are saved in your browser's storage.")}
          <br />
          {t('Browser storage can be cleared unexpectedly.')}
          <br />
          {t('Save your work to a file regularly to avoid losing it.')}
        </div>
        <div className="welcome-menu">
          <button type="button" className="welcome-item" onClick={() => app.openFile()}>
            <span className="welcome-item-icon">{Icons.folder}</span>
            <span className="welcome-item-label">{t('Open')}</span>
            {!app.isMobile && <span className="welcome-item-shortcut">Ctrl+O</span>}
          </button>
          <button type="button" className="welcome-item" onClick={() => app.setDialog('help')}>
            <span className="welcome-item-icon">{Icons.help}</span>
            <span className="welcome-item-label">{t('Help')}</span>
            {!app.isMobile && <span className="welcome-item-shortcut">?</span>}
          </button>
          <button type="button" className="welcome-item" onClick={() => app.setDialog('collab')}>
            <span className="welcome-item-icon">{Icons.users}</span>
            <span className="welcome-item-label">{t('Live collaboration...')}</span>
          </button>
          <button type="button" className="welcome-item welcome-item--link" onClick={app.saveFile}>
            <span className="welcome-item-icon">{Icons.download}</span>
            <span className="welcome-item-label">{t('Save to...')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function HintArrows({ app }: { app: AppApi }) {
  const narrow = app.size.w < 1100;
  return (
    <div className="hints" aria-hidden="false">
      <div className="hint hint-menu">
        <svg className="hint-arrow" viewBox="0 0 41 94" width="41" height="94" aria-hidden="true">
          <path d="M38.5 83.5 C 22 85, 13 72, 12.5 47 C 12.3 33, 12.6 22, 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 24 L13 9 L20 23 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        <span className={`hint-text ${narrow ? 'hint-text--narrow' : ''}`}>{t('Export, preferences, languages, ...')}</span>
      </div>
      <div className="hint hint-toolbar">
        <span className="hint-text">
          {t('Pick a tool &')}
          <br />
          {t('Start drawing!')}
        </span>
        <svg className="hint-arrow" viewBox="0 0 38 78" width="38" height="78" aria-hidden="true">
          <path d="M1.5 76 C 22 73, 39 58, 33 36 C 31 28, 29.5 21, 28.5 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M22 16 L27.5 1.5 L35.5 14.5 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="hint hint-help">
        <span className="hint-text">
          {t('Shortcuts &')}
          <br />
          {t('help')}
        </span>
        <svg className="hint-arrow" viewBox="0 0 81 75" width="81" height="75" aria-hidden="true">
          <path d="M18 15 C 36 10, 50 11, 53 25 C 55 35, 54 47, 53.5 58" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M47 57 L53.5 72 L60 57 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
