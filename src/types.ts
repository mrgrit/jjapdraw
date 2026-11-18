export type ShapeType =
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image';

export type Tool =
  | 'selection'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'sticky'
  | 'eraser'
  | 'laser'
  | 'lasso'
  | 'bucket';

export type FillStyle = 'hachure' | 'cross-hatch' | 'solid';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type Roundness = 'sharp' | 'round';
export type Arrowhead = 'arrow' | 'triangle' | 'dot' | 'bar' | null;
export type TextAlign = 'left' | 'center' | 'right';

export type Point = [number, number];

export interface Element {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  roundness: Roundness;
  opacity: number;
  seed: number;
  version: number;
  points?: Point[];
  pressures?: number[];
  startArrowhead?: Arrowhead;
  endArrowhead?: Arrowhead;
  text?: string;
  fontSize?: number;
  textAlign?: TextAlign;
  dataURL?: string;
}

export interface StyleProps {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  roundness: Roundness;
  opacity: number;
  fontSize: number;
  textAlign: TextAlign;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
}

export interface View {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export type Theme = 'light' | 'dark' | 'system';
