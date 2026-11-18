import { useEffect, useRef } from 'react';
import type { Element, View } from './types';
import { HAND_FONT, LINE_HEIGHT } from './geometry';

export function TextEditor({ el, view, onChange, onDone }: { el: Element; view: View; onChange: (t: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = ref.current!;
    const id = window.setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
    return () => window.clearTimeout(id);
  }, [el.id]);
  const fs = (el.fontSize || 20) * view.zoom;
  const left = (el.x + view.scrollX) * view.zoom;
  const top = (el.y + view.scrollY) * view.zoom;
  const w = Math.max(el.width, 4) * view.zoom;
  const h = Math.max(el.height * view.zoom, fs * LINE_HEIGHT);
  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={el.text || ''}
      spellCheck={false}
      wrap="off"
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          onDone();
        }
        e.stopPropagation();
      }}
      style={{
        left,
        top,
        width: w + fs,
        height: h,
        fontSize: fs,
        lineHeight: LINE_HEIGHT,
        fontFamily: HAND_FONT,
        color: el.strokeColor,
        opacity: el.opacity / 100,
        textAlign: el.textAlign || 'left',
        transform: `rotate(${el.angle}rad)`,
        transformOrigin: `${w / 2}px ${h / 2}px`,
        paddingTop: fs * 0.08,
      }}
    />
  );
}
