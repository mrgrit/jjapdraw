import type { ReactNode } from 'react';

const S = ({ children, size = 16, sw = 1.5, fill = 'none' }: { children: ReactNode; size?: number; sw?: number; fill?: string }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const Icons = {
  menu: <S sw={1.75}><path d="M4 6h16M4 12h16M4 18h16" /></S>,
  lockOpen: (
    <S>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="16" r="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0" />
    </S>
  ),
  lock: (
    <S>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="16" r="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </S>
  ),
  hand: (
    <S>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0V12" />
      <path d="M14 5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 7.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2 .208a6 6 0 0 1-5.012-2.7L7 19c-.312-.479-1.407-2.388-3.286-5.728a1.5 1.5 0 0 1 .536-2.022 1.867 1.867 0 0 1 2.28.28L8 13" />
    </S>
  ),
  pointer: (
    <S sw={1.25} fill="currentColor">
      <path d="M6 6l4.5 13 2-5.5 5.5-2z" />
      <path d="M13 13l6 6" fill="none" />
    </S>
  ),
  rectangle: <S><rect x="4" y="4" width="16" height="16" rx="2" /></S>,
  diamond: <S><path d="M10.5 3.8a2.1 2.1 0 0 1 3 0l6.7 6.7a2.1 2.1 0 0 1 0 3l-6.7 6.7a2.1 2.1 0 0 1-3 0l-6.7-6.7a2.1 2.1 0 0 1 0-3z" /></S>,
  ellipse: <S><circle cx="12" cy="12" r="9" /></S>,
  arrow: <S><path d="M5 12h14M13 18l6-6M13 6l6 6" /></S>,
  line: <S><path d="M5 12h14" /></S>,
  pencil: (
    <S>
      <path d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4" />
      <path d="M13.5 6.5l4 4" />
    </S>
  ),
  text: (
    <S>
      <path d="M7 20l5-16 5 16" />
      <path d="M9.5 13h5" />
      <path d="M10 4l-5 16M5 20h3M16 20h3" />
    </S>
  ),
  sticky: (
    <S>
      <path d="M13 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7l-7 7z" />
      <path d="M13 20v-5a2 2 0 0 1 2-2h5" />
      <path d="M8 9h8M8 13h3" />
    </S>
  ),
  eraser: (
    <S>
      <path d="M19 20H8.5l-4.21-4.3a1 1 0 0 1 0-1.41l10-10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41L11.5 20" />
      <path d="M18 13.3L11.7 7" />
    </S>
  ),
  dots: (
    <S sw={2}>
      <circle cx="12" cy="5" r="0.6" />
      <circle cx="12" cy="12" r="0.6" />
      <circle cx="12" cy="19" r="0.6" />
    </S>
  ),
  sidebar: (
    <S>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M15 4v16" />
    </S>
  ),
  help: (
    <S>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 17v.01" />
      <path d="M12 13.5a1.5 1.5 0 0 1 1-1.5 2.6 2.6 0 1 0-3-4" />
    </S>
  ),
  shield: (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
      <path d="M12 2l8 3v6c0 5.25-3.4 9.74-8 11-4.6-1.26-8-5.75-8-11V5l8-3z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  undo: <S><path d="M9 14l-4-4 4-4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" /></S>,
  redo: <S><path d="M15 14l4-4-4-4" /><path d="M19 10H8a4 4 0 1 0 0 8h1" /></S>,
  map: (
    <S>
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7" />
      <path d="M9 4v13M15 7v13" />
    </S>
  ),
  folder: <S><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" /></S>,
  download: <S><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12" /></S>,
  exportImage: (
    <S>
      <path d="M15 8h.01" />
      <path d="M12 20H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5" />
      <path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4" />
      <path d="M14 14l1-1c.617-.593 1.328-.793 2.009-.598" />
      <path d="M19 16v6M22 19l-3 3-3-3" />
    </S>
  ),
  users: (
    <S>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" />
    </S>
  ),
  bolt: <S><path d="M13 3v7h6l-8 11v-7H5l8-11" /></S>,
  search: <S><circle cx="10" cy="10" r="7" /><path d="M21 21l-6-6" /></S>,
  trash: (
    <S>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </S>
  ),
  logo: (
    <svg aria-hidden="true" viewBox="0 0 40 40" width="16" height="16">
      <rect x="2" y="2" width="36" height="36" rx="9" fill="currentColor" />
      <path d="M11 29l3-9 13-13 6 6-13 13z" fill="#fff" />
      <path d="M11 29l3-9 6 6z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  book: <S><path d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13" /></S>,
  keyboard: (
    <S>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h0M10 10h0M14 10h0M18 10h0M6 14h0M18 14h0M10 14h4" />
    </S>
  ),
  save: (
    <S>
      <path d="M6 4h10l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" />
      <circle cx="12" cy="14" r="2" />
      <path d="M14 4v4H8V4" />
    </S>
  ),
  settings: (
    <S>
      <path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h11M19 18h1" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </S>
  ),
  chevronRight: <S><path d="M9 6l6 6-6 6" /></S>,
  sun: (
    <S>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7" />
    </S>
  ),
  moon: <S><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z" /></S>,
  monitor: (
    <S>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M7 20h10M9 16v4M15 16v4" />
    </S>
  ),
  presentation: (
    <S size={20}>
      <path d="M3 4h18M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4M12 16v4M9 20h6" />
      <path d="M8 12l3-3 2 2 3-3" />
    </S>
  ),
  share: (
    <S>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
    </S>
  ),
  plus: <S><path d="M12 5v14M5 12h14" /></S>,
  minus: <S><path d="M5 12h14" /></S>,
  zoomFit: (
    <S>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2" />
      <circle cx="13" cy="13" r="3" />
      <path d="M15.2 15.2L18 18" />
    </S>
  ),
  zoomReset: (
    <S>
      <path d="M21 21l-6-6M3.268 12.043A7.017 7.017 0 0 0 6.989 16.5a7.01 7.01 0 0 0 7.814-.958M10 3a7.01 7.01 0 0 1 6.732 9.043" />
      <path d="M3 4v4h4" />
    </S>
  ),
  photo: (
    <S>
      <path d="M15 8h.01" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 16l5-5c.928-.893 2.072-.893 3 0l5 5M14 14l1-1c.928-.893 2.072-.893 3 0l3 3" />
    </S>
  ),
  frame: <S><path d="M4 7h16M4 17h16M7 4v16M17 4v16" /></S>,
  code: <S><path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" /></S>,
  shapes: (
    <S>
      <circle cx="9" cy="9" r="5.5" />
      <rect x="10" y="10" width="10" height="10" rx="2" />
    </S>
  ),
  laser: (
    <S>
      <path d="M4 20l9-9" />
      <path d="M15 4l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5zM19 10l.3 1 1 .3-1 .3-.3 1-.3-1-1-.3 1-.3zM10 3l.3 1 1 .3-1 .3-.3 1-.3-1-1-.3 1-.3z" />
    </S>
  ),
  bucket: (
    <S>
      <path d="M5 16l7-7 6 6-7 7a1.5 1.5 0 0 1-2 0l-4-4a1.5 1.5 0 0 1 0-2z" />
      <path d="M12 9l-3-3M19 18.5a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3s1.5 2 1.5 3z" />
    </S>
  ),
  lasso: (
    <S>
      <path d="M4.03 13.66A7.8 4.5 0 1 1 12 15.5c-1.2 0-2.3-.15-3.3-.42" />
      <path d="M8 15a2 2 0 1 0 0 .01M7 17c0 2 1 3 3 4" />
    </S>
  ),
  brain: (
    <S>
      <path d="M15.5 13a3.5 3.5 0 0 0-3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1-7 0v-1.8" />
      <path d="M17.5 16a3.5 3.5 0 0 0 0-7H17M6.5 16a3.5 3.5 0 0 1 0-7H7" />
      <path d="M17 9.5V7.5a3 3 0 0 0-5-2.2 3 3 0 0 0-5 2.2v2" />
    </S>
  ),
  mermaid: (
    <S sw={2.2}>
      <path d="M4 5c0 6 4 7 8 14 4-7 8-8 8-14-3 0-6 3-8 7-2-4-5-7-8-7z" fill="currentColor" />
    </S>
  ),
  wand: (
    <S>
      <path d="M6 21L21 6l-3-3L3 18l3 3M15 6l3 3" />
      <path d="M9 3a2 2 0 0 0 2 2 2 2 0 0 0-2 2 2 2 0 0 0-2-2 2 2 0 0 0 2-2M19 13a2 2 0 0 0 2 2 2 2 0 0 0-2 2 2 2 0 0 0-2-2 2 2 0 0 0 2-2" />
    </S>
  ),
  duplicate: (
    <S>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </S>
  ),
  sendBack: (
    <S>
      <path d="M12 5v14M16 15l-4 4-4-4" />
      <path d="M5 3h14" />
    </S>
  ),
  sendBackward: <S><path d="M12 5v12M16 13l-4 4-4-4" /></S>,
  bringForward: <S><path d="M12 19V7M16 11l-4-4-4 4" /></S>,
  bringFront: (
    <S>
      <path d="M12 19V5M16 9l-4-4-4 4" />
      <path d="M5 21h14" />
    </S>
  ),
  close: <S><path d="M18 6L6 18M6 6l12 12" /></S>,
  github: (
    <S>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </S>
  ),
  copy: (
    <S>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </S>
  ),
  // property icons (drawn in a 20x20 box)
  fillHachure: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25">
      <rect x="2.5" y="2.5" width="15" height="15" rx="3" />
      <path d="M3 13l10-10M3 17.5L17.5 3M7 17.5l10.5-10.5" />
    </svg>
  ),
  fillCross: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25">
      <rect x="2.5" y="2.5" width="15" height="15" rx="3" />
      <path d="M3 13l10-10M3 17.5L17.5 3M7 17.5l10.5-10.5M7 3l10.5 10.5M3 3l14.5 14.5M3 7l10.5 10.5" />
    </svg>
  ),
  fillSolid: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" stroke="currentColor" strokeWidth="1.25">
      <rect x="2.5" y="2.5" width="15" height="15" rx="3" />
    </svg>
  ),
  strokeThin: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M4 10h12" strokeWidth="1.25" strokeLinecap="round" /></svg>
  ),
  strokeBold: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M4 10h12" strokeWidth="2.5" strokeLinecap="round" /></svg>
  ),
  strokeExtra: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M4 10h12" strokeWidth="3.75" strokeLinecap="round" /></svg>
  ),
  styleSolid: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M4 10h12" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  styleDashed: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M3 10h3.5M8.5 10h3M13.5 10h3.5" strokeWidth="2" strokeLinecap="round" /></svg>
  ),
  styleDotted: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M3.5 10h.01M7.5 10h.01M11.5 10h.01M15.5 10h.01" strokeWidth="2.25" strokeLinecap="round" /></svg>
  ),
  slopArchitect: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><path d="M2.5 13.5c4-.5 7.5-3.5 9.5-7 1 2 2.5 3.5 5.5 4.5" /></svg>
  ),
  slopArtist: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><path d="M2.5 14c3-1 7-4 9-7.5 1.5 2.5 2.5 4 5.5 4.5M3 12.5c3.5-1 7-3.5 8.5-7 1.5 3 3 4.5 6 5.5" /></svg>
  ),
  slopCartoonist: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"><path d="M2.5 14.5c2-1 4-1 5-3s2-5 4-6 3 3 4 4 2 1 2 1M3 12c2.5 0 3.5-2 4.5-4s3-3.5 4.5-2.5 2.5 3.5 5.5 4.5" /></svg>
  ),
  edgeSharp: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 16.5V3.5h13" strokeDasharray="0" /><path d="M10 16.5h.01M16.5 10h.01M16.5 16.5h.01M3.5 16.5h.01" /></svg>
  ),
  edgeRound: (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 16.5V9.5a6 6 0 0 1 6-6h7" /><path d="M10 16.5h.01M16.5 10h.01M16.5 16.5h.01M3.5 16.5h.01" /></svg>
  ),
  headNone: (
    <svg aria-hidden="true" viewBox="0 0 40 20" width="30" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 10h28" /></svg>
  ),
  headArrow: (
    <svg aria-hidden="true" viewBox="0 0 40 20" width="30" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10h28M27 5l7 5-7 5" /></svg>
  ),
  headTriangle: (
    <svg aria-hidden="true" viewBox="0 0 40 20" width="30" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10h22" /><path d="M27 5l7 5-7 5z" fill="currentColor" /></svg>
  ),
  headDot: (
    <svg aria-hidden="true" viewBox="0 0 40 20" width="30" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 10h22" /><circle cx="30" cy="10" r="4" fill="currentColor" /></svg>
  ),
  headBar: (
    <svg aria-hidden="true" viewBox="0 0 40 20" width="30" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 10h28M34 4v12" /></svg>
  ),
  alignLeft: <S><path d="M4 8h16M4 12h10M4 16h14" /></S>,
  alignCenter: <S><path d="M4 8h16M7 12h10M5 16h14" /></S>,
  alignRight: <S><path d="M4 8h16M10 12h10M6 16h14" /></S>,
};
