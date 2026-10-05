'use client';

import { forwardRef, memo, useId, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';
import { normalizeOptions } from '../../dist/lab/options.js';
import { buildChartModel, type ChartMark, type ChartModel, type FunnelGraph, type FunnelVariant, type Inspection, type Stage } from '../chart/model';
import { ScreenDefs } from './ScreenDefs';

export type { FunnelData, FunnelGraph, FunnelLink, FunnelNode, FunnelVariant, Inspection, Screen, Stage } from '../chart/model';

export type VerticalView = 'flat' | 'isometric';
export type FunnelOptions = {
  texture?: 'mixed' | 'dense' | 'am' | 'hatch' | 'cross' | 'coarse';
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
export type VerticalViewSettings = Partial<Pick<FunnelOptions,
  'texture' | 'density' | 'strokeWidth' | 'patternAngle' | 'dotGain' | 'roughness' |
  'paperGrain' | 'fontSize' | 'labels' | 'stageHeight' | 'stageGap' | 'capCurve' |
  'borderRadius' | 'tailRatio' | 'isoDepth' | 'isoRotation'>>;

type SharedProps = HTMLAttributes<HTMLDivElement> & {
  options?: FunnelOptions;
  seed?: number;
  onInspect?: (inspection: Inspection | null) => void;
  idPrefix?: string;
  viewBox?: string;
  children?: ReactNode;
};
export type AtlasFunnelProps = SharedProps & (
  | { variant?: 'continuous'; data: readonly Stage[] }
  | { variant: 'vertical'; data: readonly Stage[] }
  | { variant: 'branching'; data: FunnelGraph }
);

const PAPER = '#E4E5E8';
const INK = '#2F4FE0';
const emptyOptions: FunnelOptions = Object.freeze({});
const StableScreenDefs = memo(ScreenDefs);
const format = (value: number) => new Intl.NumberFormat('en-US').format(value);
const percent = (value: number, total: number) => total ? `${(100 * value / total).toFixed(1)}%` : '—';

function connectedLinks(model: ChartModel, key: string): Set<string> {
  const active = model.marks.find(mark => mark.type === 'path' && mark.inspection?.key === key);
  if (!active || active.type !== 'path' || active.inspection?.kind !== 'link') return new Set([key]);
  const links = model.marks.flatMap(mark => mark.type === 'path' && mark.inspection?.kind === 'link' ? [mark.inspection] : []);
  const linked = new Set([key]);
  const walk = (nodeId: string, upstream: boolean, seen = new Set<string>()) => {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    for (const link of links) {
      if (upstream ? link.target === nodeId : link.source === nodeId) {
        linked.add(link.key);
        walk(upstream ? link.source! : link.target!, upstream, seen);
      }
    }
  };
  walk(active.inspection.source!, true);
  walk(active.inspection.target!, false);
  return linked;
}

function Mark({ mark, idPrefix, activeKey, visibleKeys, roughness, onPreview, onLeave }: {
  mark: ChartMark;
  idPrefix: string;
  activeKey: string | null;
  visibleKeys: Set<string> | null;
  roughness: number;
  onPreview: (info: Inspection) => void;
  onLeave: () => void;
}) {
  if (mark.type === 'line') return <line x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} stroke={INK}
    strokeWidth={mark.strokeWidth} strokeDasharray={mark.dash} data-ink-baseline={mark.baseline ? '' : undefined} />;
  if (mark.type === 'rect') return <rect x={mark.x} y={mark.y} width={mark.width} height={mark.height}
    fill={mark.pattern === 'paper' ? PAPER : `url(#${idPrefix}-${mark.pattern ?? 'solid'})`}
    stroke={mark.stroke ? INK : undefined} strokeWidth={mark.strokeWidth} />;
  if (mark.type === 'text') return <text x={mark.x} y={mark.y} fill={INK} fontFamily="Arial, Helvetica, sans-serif"
    fontSize={mark.fontSize} textAnchor={mark.anchor}>{mark.text}</text>;

  const baseFill = mark.fill === 'none' ? 'none' : mark.pattern === 'paper' ? PAPER : `url(#${idPrefix}-${mark.pattern ?? 'solid'})`;
  const inspection = mark.inspection;
  const visible = !activeKey || (inspection ? (visibleKeys ? visibleKeys.has(inspection.key) : activeKey === inspection.key) : mark.stageId ? activeKey === mark.stageId : true);
  const fill = visible ? baseFill : PAPER;
  const clipPath = mark.clipId ? `url(#${idPrefix}-${mark.clipId})` : undefined;
  const mask = mark.maskSide ? `url(#${idPrefix}-fade-${mark.maskSide})` : undefined;
  const stroke = mark.stroke === false ? undefined : INK;
  return <>
    <path d={mark.d} fill={fill} stroke={stroke} strokeWidth={mark.strokeWidth} strokeLinejoin={mark.lineJoin}
      strokeDasharray={inspection && !visible ? '2 4' : undefined} clipPath={clipPath} mask={mask}
      filter={inspection && roughness > 0 ? `url(#${idPrefix}-edge)` : undefined} data-base-fill={baseFill}
      data-key={inspection?.key} data-stage-face={mark.face ? mark.stageId : undefined}
      data-face={mark.face} data-stage-outline={mark.outline ? mark.stageId : undefined}
      role={inspection ? 'img' : undefined} tabIndex={inspection ? 0 : undefined}
      aria-label={inspection ? `${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion` : undefined}
      pointerEvents={mark.face || mark.outline ? 'none' : undefined}
      onPointerDown={inspection ? event => event.preventDefault() : undefined}
      onPointerEnter={inspection ? event => { if (event.pointerType === 'mouse') onPreview(inspection); } : undefined}
      onPointerLeave={inspection ? onLeave : undefined}
      onFocus={inspection ? () => onPreview(inspection) : undefined}
      onBlur={inspection ? onLeave : undefined}>
      {inspection && <title>{`${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion`}</title>}
    </path>
  </>;
}

function FadeDefs({ model, idPrefix }: { model: ChartModel; idPrefix: string }) {
  return <defs>
    {model.clips.map(clip => <clipPath key={clip.id} id={`${idPrefix}-${clip.id}`} clipPathUnits="userSpaceOnUse"><path d={clip.d} /></clipPath>)}
    {Object.entries(model.fadeStops).map(([side, stops]) => <g key={side}>
      <linearGradient id={`${idPrefix}-fade-gradient-${side}`} x1="0%" y1="0%" x2="100%" y2="0%">
        {stops?.map(([offset, opacity], index) => <stop key={index} offset={`${offset * 100}%`} stopColor="white" stopOpacity={opacity} />)}
      </linearGradient>
      <mask id={`${idPrefix}-fade-${side}`} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox"
        x={0} y={0} width={1} height={1} style={{ maskType: 'alpha' }}>
        <rect x={0} y={0} width={1} height={1} fill={`url(#${idPrefix}-fade-gradient-${side})`} />
      </mask>
    </g>)}
  </defs>;
}

export const AtlasFunnel = forwardRef<HTMLDivElement, AtlasFunnelProps>(function AtlasFunnel({
  data, variant = 'continuous', options = emptyOptions, seed = 1234,
  onInspect, idPrefix: suppliedPrefix, viewBox, children, style, ...rootProps
}, ref) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an integer between 0 and 4294967295.');
  const id = useId();
  const idPrefix = suppliedPrefix ?? `atlas-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const normalized = useMemo(() => normalizeOptions(
    variant === 'vertical' && options.verticalView === undefined ? { ...options, verticalView: 'flat' } : options,
  ) as FunnelOptions, [options, variant]);
  const model = useMemo(() => buildChartModel(data, variant as FunnelVariant, normalized), [data, variant, normalized]);
  if (variant === 'vertical' && normalized.verticalViews) {
    buildChartModel(data, 'vertical', { ...normalized, ...normalized.verticalViews.isometric, verticalView: 'isometric' });
  }
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const inspections = useMemo(() => new Map(model.marks.flatMap(mark => mark.type === 'path' && mark.inspection ? [[mark.inspection.key, mark.inspection] as const] : [])), [model]);
  const activeKey = hoverKey && inspections.has(hoverKey) ? hoverKey : null;
  const visibleKeys = useMemo(() => activeKey && model.variant === 'branching' ? connectedLinks(model, activeKey) : null, [model, activeKey]);
  const preview = (info: Inspection) => {
    setHoverKey(info.key);
    onInspect?.(info);
  };
  const leave = () => {
    setHoverKey(null);
    onInspect?.(null);
  };
  return <div {...rootProps} ref={ref} style={{ display: 'block', ...style }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox ?? `0 0 ${model.width} ${model.height}`} width="100%"
      role="group" aria-label={`${variant} conversion funnel`} style={{ display: 'block', height: 'auto', minWidth: model.width > 900 ? model.width : undefined }}>
      <StableScreenDefs idPrefix={idPrefix} width={model.width} height={model.height} density={normalized.density}
        patternAngle={normalized.patternAngle} dotGain={normalized.dotGain} roughness={normalized.roughness}
        seed={seed} paperGrain={normalized.paperGrain} includeSparse={variant === 'vertical' && normalized.verticalView === 'isometric'} />
      <FadeDefs model={model} idPrefix={idPrefix} />
      <rect width={model.width} height={model.height} fill={normalized.paperGrain ? `url(#${idPrefix}-grain)` : PAPER} />
      {model.marks.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
        activeKey={activeKey} visibleKeys={visibleKeys} roughness={normalized.roughness ?? .15}
        onPreview={preview} onLeave={leave} />)}
      {children}
    </svg>
  </div>;
});
