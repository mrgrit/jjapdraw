import { useState, type ReactNode } from 'react';
import { Icons } from './icons';
import { t } from './i18n';
import { BG_PICKS, PALETTE, STROKE_PICKS } from './scene';
import type { AppApi } from './App';
import type { Arrowhead, StyleProps } from './types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="panel-section">
      <legend className="panel-title">{title}</legend>
      <div className="panel-row">{children}</div>
    </fieldset>
  );
}

function Opt({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`opt-btn ${active ? 'is-active' : ''}`} aria-label={label} title={label} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`color-swatch ${active ? 'is-active' : ''} ${color === 'transparent' ? 'is-transparent' : ''}`}
      style={{ background: color === 'transparent' ? undefined : color }}
      aria-label={color}
      title={color}
      onClick={onClick}
    />
  );
}

function ColorRow({ value, picks, onChange, which, openPicker, setOpenPicker }: {
  value: string; picks: string[]; onChange: (c: string) => void; which: string; openPicker: string | null; setOpenPicker: (v: string | null) => void;
}) {
  const [hex, setHex] = useState(value);
  const open = openPicker === which;
  return (
    <div className="color-row">
      {picks.map((c) => (
        <Swatch key={c} color={c} active={value === c} onClick={() => onChange(c)} />
      ))}
      <div className="swatch-sep" />
      <button
        type="button"
        className={`color-swatch color-swatch--current ${value === 'transparent' ? 'is-transparent' : ''} ${open ? 'is-open' : ''}`}
        style={{ background: value === 'transparent' ? undefined : value }}
        aria-label={`${which}: ${value}`}
        title={value}
        onClick={() => {
          setHex(value);
          setOpenPicker(open ? null : which);
        }}
      />
      {open && (
        <div className="island color-popover">
          <div className="palette-grid">
            {PALETTE.flat().map((c, i) => (
              <Swatch key={c + i} color={c} active={value === c} onClick={() => onChange(c)} />
            ))}
          </div>
          <div className="hex-row">
            <span className="hex-hash">#</span>
            <input
              className="hex-input"
              value={hex.replace('#', '')}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                setHex('#' + v);
                if (v.length === 6 || v.length === 3) onChange('#' + v.toLowerCase());
              }}
              aria-label="Hex colour"
            />
            <input type="color" className="native-color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label="Pick colour" />
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertiesPanel({ app }: { app: AppApi }) {
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const types: string[] = app.panelTypes;
  const st: StyleProps = app.shownStyle;
  const has = (...ts: string[]) => types.some((x) => ts.includes(x));
  const shapes = has('rectangle', 'diamond', 'ellipse');
  const set = <K extends keyof StyleProps>(k: K, v: StyleProps[K]) => app.changeStyle(k, v);
  const hasSel = app.sel.length > 0;
  const heads: { v: Arrowhead; icon: ReactNode; label: string }[] = [
    { v: null, icon: Icons.headNone, label: 'None' },
    { v: 'arrow', icon: Icons.headArrow, label: 'Arrow' },
    { v: 'triangle', icon: Icons.headTriangle, label: 'Triangle' },
    { v: 'dot', icon: Icons.headDot, label: 'Dot' },
    { v: 'bar', icon: Icons.headBar, label: 'Bar' },
  ];
  return (
    <div className="island properties-panel" onPointerDown={(e) => e.stopPropagation()}>
      {has('rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text') && (
        <Section title={t('Stroke')}>
          <ColorRow value={st.strokeColor} picks={STROKE_PICKS} onChange={(c) => set('strokeColor', c)} which="stroke" openPicker={openPicker} setOpenPicker={setOpenPicker} />
        </Section>
      )}
      {shapes && (
        <Section title={t('Background')}>
          <ColorRow value={st.backgroundColor} picks={BG_PICKS} onChange={(c) => set('backgroundColor', c)} which="background" openPicker={openPicker} setOpenPicker={setOpenPicker} />
        </Section>
      )}
      {shapes && (
        <Section title={t('Fill')}>
          <Opt active={st.fillStyle === 'hachure'} label="Hachure" onClick={() => set('fillStyle', 'hachure')}>{Icons.fillHachure}</Opt>
          <Opt active={st.fillStyle === 'cross-hatch'} label="Cross-hatch" onClick={() => set('fillStyle', 'cross-hatch')}>{Icons.fillCross}</Opt>
          <Opt active={st.fillStyle === 'solid'} label="Solid" onClick={() => set('fillStyle', 'solid')}>{Icons.fillSolid}</Opt>
        </Section>
      )}
      {has('rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw') && (
        <Section title={t('Stroke width')}>
          <Opt active={st.strokeWidth === 1} label="Thin" onClick={() => set('strokeWidth', 1)}>{Icons.strokeThin}</Opt>
          <Opt active={st.strokeWidth === 2} label="Bold" onClick={() => set('strokeWidth', 2)}>{Icons.strokeBold}</Opt>
          <Opt active={st.strokeWidth === 4} label="Extra bold" onClick={() => set('strokeWidth', 4)}>{Icons.strokeExtra}</Opt>
        </Section>
      )}
      {has('rectangle', 'diamond', 'ellipse', 'arrow', 'line') && (
        <Section title={t('Stroke style')}>
          <Opt active={st.strokeStyle === 'solid'} label="Solid" onClick={() => set('strokeStyle', 'solid')}>{Icons.styleSolid}</Opt>
          <Opt active={st.strokeStyle === 'dashed'} label="Dashed" onClick={() => set('strokeStyle', 'dashed')}>{Icons.styleDashed}</Opt>
          <Opt active={st.strokeStyle === 'dotted'} label="Dotted" onClick={() => set('strokeStyle', 'dotted')}>{Icons.styleDotted}</Opt>
        </Section>
      )}
      {has('rectangle', 'diamond', 'ellipse', 'arrow', 'line') && (
        <Section title={t('Sloppiness')}>
          <Opt active={st.roughness === 0} label="Architect" onClick={() => set('roughness', 0)}>{Icons.slopArchitect}</Opt>
          <Opt active={st.roughness === 1} label="Artist" onClick={() => set('roughness', 1)}>{Icons.slopArtist}</Opt>
          <Opt active={st.roughness === 2} label="Cartoonist" onClick={() => set('roughness', 2)}>{Icons.slopCartoonist}</Opt>
        </Section>
      )}
      {has('rectangle', 'diamond', 'arrow', 'line') && (
        <Section title={t('Edges')}>
          <Opt active={st.roundness === 'sharp'} label="Sharp" onClick={() => set('roundness', 'sharp')}>{Icons.edgeSharp}</Opt>
          <Opt active={st.roundness === 'round'} label="Round" onClick={() => set('roundness', 'round')}>{Icons.edgeRound}</Opt>
        </Section>
      )}
      {has('arrow') && (
        <Section title={t('Arrowheads')}>
          <select className="head-select" aria-label="Start arrowhead" value={st.startArrowhead ?? 'none'} onChange={(e) => set('startArrowhead', e.target.value === 'none' ? null : (e.target.value as Arrowhead))}>
            {heads.map((h) => (
              <option key={String(h.v)} value={h.v ?? 'none'}>{`◀ ${h.label}`}</option>
            ))}
          </select>
          <select className="head-select" aria-label="End arrowhead" value={st.endArrowhead ?? 'none'} onChange={(e) => set('endArrowhead', e.target.value === 'none' ? null : (e.target.value as Arrowhead))}>
            {heads.map((h) => (
              <option key={String(h.v)} value={h.v ?? 'none'}>{`${h.label} ▶`}</option>
            ))}
          </select>
        </Section>
      )}
      {has('text') && (
        <Section title={t('Font size')}>
          {[
            [16, 'S'],
            [20, 'M'],
            [28, 'L'],
            [36, 'XL'],
          ].map(([v, l]) => (
            <Opt key={l} active={Math.round(st.fontSize) === v} label={`${l} (${v}px)`} onClick={() => set('fontSize', v as number)}>
              <span className="opt-text">{l}</span>
            </Opt>
          ))}
        </Section>
      )}
      {has('text') && (
        <Section title={t('Text align')}>
          <Opt active={st.textAlign === 'left'} label="Left" onClick={() => set('textAlign', 'left')}>{Icons.alignLeft}</Opt>
          <Opt active={st.textAlign === 'center'} label="Center" onClick={() => set('textAlign', 'center')}>{Icons.alignCenter}</Opt>
          <Opt active={st.textAlign === 'right'} label="Right" onClick={() => set('textAlign', 'right')}>{Icons.alignRight}</Opt>
        </Section>
      )}
      <Section title={t('Opacity')}>
        <div className="range-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={st.opacity}
            aria-label={t('Opacity')}
            onChange={(e) => app.changeStyle('opacity', Number(e.target.value), false)}
            onPointerUp={() => app.commit()}
            onKeyUp={() => app.commit()}
            style={{ ['--val' as string]: `${st.opacity}%` }}
          />
          <span className="range-value">{st.opacity}</span>
        </div>
      </Section>
      {hasSel && (
        <Section title={t('Layers')}>
          <Opt active={false} label="Send to back — Ctrl+Shift+[" onClick={() => app.layer('back')}>{Icons.sendBack}</Opt>
          <Opt active={false} label="Send backward — Ctrl+[" onClick={() => app.layer('backward')}>{Icons.sendBackward}</Opt>
          <Opt active={false} label="Bring forward — Ctrl+]" onClick={() => app.layer('forward')}>{Icons.bringForward}</Opt>
          <Opt active={false} label="Bring to front — Ctrl+Shift+]" onClick={() => app.layer('front')}>{Icons.bringFront}</Opt>
        </Section>
      )}
      {hasSel && (
        <Section title={t('Actions')}>
          <Opt active={false} label={`${t('Duplicate')} — Ctrl+D`} onClick={app.duplicateSelected}>{Icons.duplicate}</Opt>
          <Opt active={false} label={`${t('Delete')} — Delete`} onClick={app.deleteSelected}>{Icons.trash}</Opt>
          <Opt active={false} label={t('Add selected to library')} onClick={app.addToLibrary}>{Icons.book}</Opt>
        </Section>
      )}
    </div>
  );
}
