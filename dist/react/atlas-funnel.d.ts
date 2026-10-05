import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

export type Stage = { id: string; label: string; value: number };
export type FunnelNode = { id: string; label: string; value?: number };
export type FunnelLink = { source: string; target: string; value: number };
export type FunnelGraph = { nodes: readonly FunnelNode[]; links: readonly FunnelLink[] };
export type FunnelData = readonly Stage[] | FunnelGraph;
export type FunnelVariant = 'continuous' | 'vertical' | 'branching';
export type Screen = 'mixed' | 'dense' | 'am' | 'hatch' | 'cross' | 'coarse';
export type VerticalView = 'flat' | 'isometric';
export type VerticalViewSettings = Partial<{
  texture: Screen;
  density: number;
  strokeWidth: number;
  patternAngle: number;
  dotGain: number;
  roughness: number;
  fontSize: number;
  labels: boolean;
  paperGrain: boolean;
  stageHeight: number;
  stageGap: number;
  capCurve: number;
  borderRadius: number;
  tailRatio: number;
  isoDepth: number;
  isoRotation: number;
}>;

export type FunnelOptions = {
  texture?: Screen;
  density?: number;
  strokeWidth?: number;
  patternAngle?: number;
  dotGain?: number;
  roughness?: number;
  paperGrain?: boolean;
  fontSize?: number;
  labels?: boolean;
  guides?: boolean;
  curve?: number;
  chartHeight?: number;
  edgeFade?: number;
  mirror?: boolean;
  stageHeight?: number;
  stageGap?: number;
  capCurve?: number;
  borderRadius?: number;
  tailRatio?: number;
  verticalView?: VerticalView;
  isoDepth?: number;
  isoRotation?: number;
  verticalViews?: { flat: VerticalViewSettings; isometric: VerticalViewSettings };
  nodeGap?: number;
  nodeWidth?: number;
};

export type Inspection = {
  key: string;
  label: string;
  value: number;
  denominator: number;
  total: number;
  kind: 'link' | 'stage';
  source?: string;
  target?: string;
};

type SharedProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  options?: FunnelOptions;
  seed?: number;
  selectedKey?: string | null;
  defaultSelectedKey?: string | null;
  onSelectionChange?: (key: string | null, inspection: Inspection | null) => void;
  onInspect?: (inspection: Inspection | null) => void;
};

export type AtlasFunnelProps = SharedProps & (
  | { variant?: 'continuous'; data: readonly Stage[] }
  | { variant: 'vertical'; data: readonly Stage[] }
  | { variant: 'branching'; data: FunnelGraph }
);

export declare const AtlasFunnel: ForwardRefExoticComponent<AtlasFunnelProps & RefAttributes<HTMLDivElement>>;
