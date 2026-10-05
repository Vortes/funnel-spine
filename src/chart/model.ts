export type Stage = { id: string; label: string; value: number };
export type FunnelNode = { id: string; label: string; value?: number };
export type FunnelLink = { source: string; target: string; value: number };
export type FunnelGraph = { nodes: readonly FunnelNode[]; links: readonly FunnelLink[] };
export type FunnelData = readonly Stage[] | FunnelGraph;
export type FunnelVariant = 'continuous' | 'vertical' | 'branching';
export type Screen = 'mixed' | 'dense' | 'am' | 'hatch' | 'cross' | 'coarse';
export type Pattern = Exclude<Screen, 'mixed'> | 'solid' | 'sparse' | 'grain' | 'paper';
export type ChartOptions = Partial<{
  texture: Screen; strokeWidth: number; labels: boolean; curve: number;
  chartHeight: number; edgeFade: number; mirror: boolean; stageHeight: number;
  stageGap: number; capCurve: number; borderRadius: number; tailRatio: number;
  verticalView: 'flat' | 'isometric'; isoDepth: number; isoRotation: number;
  nodeGap: number; nodeWidth: number; fontSize: number; guides: boolean;
}>;
export type Inspection = {
  key: string; label: string; value: number; denominator: number; total: number;
  kind: 'link' | 'stage'; source?: string; target?: string;
};
type MarkBase = { key: string };
export type PathMark = MarkBase & {
  type: 'path'; d: string; pattern?: Pattern; fill?: 'none'; stroke?: boolean;
  strokeWidth?: number; lineJoin?: 'round'; inspection?: Inspection;
  clipId?: string; maskSide?: 'left' | 'right' | 'both';
  face?: 'side' | 'top'; stageId?: string; outline?: boolean;
};
export type LineMark = MarkBase & {
  type: 'line'; x1: number; y1: number; x2: number; y2: number;
  strokeWidth?: number; dash?: string; baseline?: boolean;
};
export type RectMark = MarkBase & {
  type: 'rect'; x: number; y: number; width: number; height: number;
  pattern?: Pattern; stroke?: boolean; strokeWidth?: number;
};
export type TextMark = MarkBase & {
  type: 'text'; x: number; y: number; text: string; fontSize: number;
  anchor?: 'start' | 'end';
};
export type ChartMark = PathMark | LineMark | RectMark | TextMark;
export type ChartModel = {
  variant: FunnelVariant; width: number; height: number; marks: ChartMark[];
  clips: { id: string; d: string }[];
  fadeStops: Partial<Record<'left' | 'right' | 'both', [number, number][]>>;
  graph?: GraphLayout;
};

export type LayoutNode = FunnelNode & {
  value: number; level: number; height: number; span: number; x: number; y: number;
  incoming: LayoutLink[]; outgoing: LayoutLink[];
};
export type LayoutLink = FunnelLink & {
  id: string; sourceNode: LayoutNode; targetNode: LayoutNode;
  width: number; sy: number; ty: number;
};
export type GraphLayout = {
  nodes: LayoutNode[]; links: LayoutLink[]; total: number; depth: number;
  bottom: number; height: number; width: number; columnStep: number; nodeWidth: number;
};

import { validateData } from '../../dist/core/data.js';
import { screenTypes } from './shared.js';
import { continuousModel } from './continuous.js';
import { verticalModel } from './vertical.js';
import { branchingModel } from './branching.js';
export { edgeFadeStops } from './continuous.js';
export { layoutGraph } from './branching.js';
export { verticalRimGeometry, verticalContainerGeometry, isometricStageGeometry } from './vertical.js';

export function buildChartModel(data: readonly Stage[], variant: 'continuous' | 'vertical', options?: ChartOptions): ChartModel;
export function buildChartModel(data: FunnelGraph, variant: 'branching', options?: ChartOptions): ChartModel;
export function buildChartModel(data: FunnelData, variant: FunnelVariant, options?: ChartOptions): ChartModel;
export function buildChartModel(data: FunnelData, variant: FunnelVariant, options: ChartOptions = {}): ChartModel {
  if (!['continuous', 'vertical', 'branching'].includes(variant)) throw new Error('Unknown funnel variant.');
  validateData(data, variant);
  const texture = options.texture ?? 'mixed';
  if (!['mixed', ...screenTypes].includes(texture)) throw new Error('Choose a supported screen pattern.');
  if (variant === 'continuous') {
    if (typeof (options.mirror ?? false) !== 'boolean') throw new Error('mirror must be true or false.');
    return continuousModel(data as readonly Stage[], options);
  }
  if (variant === 'vertical') {
    if (!['flat', 'isometric'].includes(options.verticalView ?? 'isometric')) throw new Error('Choose a flat or isometric vertical view.');
    return verticalModel(data as readonly Stage[], options);
  }
  return branchingModel(data as FunnelGraph, options);
}
