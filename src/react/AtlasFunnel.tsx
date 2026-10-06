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

function Mark({ mark, idPrefix, activeKey, visibleKeys, roughness, onPreview, onLeave, verticalStage = false }: {
  mark: ChartMark;
  idPrefix: string;
  activeKey: string | null;
  visibleKeys: Set<string> | null;
  roughness: number;
  onPreview: (info: Inspection) => void;
  onLeave: () => void;
  verticalStage?: boolean;
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
  const fill = verticalStage || visible ? baseFill : PAPER;
  const clipPath = mark.clipId ? `url(#${idPrefix}-${mark.clipId})` : undefined;
  const mask = mark.maskSide ? `url(#${idPrefix}-fade-${mark.maskSide})` : undefined;
  const stroke = mark.stroke === false ? undefined : INK;
  return <>
    <path d={mark.d} fill={fill} stroke={stroke} strokeWidth={mark.strokeWidth} strokeLinejoin={mark.lineJoin}
      strokeDasharray={inspection && !verticalStage && !visible ? '2 4' : undefined} clipPath={clipPath} mask={mask}
      filter={inspection && roughness > 0 ? `url(#${idPrefix}-edge)` : undefined} data-base-fill={baseFill}
      data-key={!verticalStage ? inspection?.key : undefined} data-stage-front={verticalStage ? inspection?.key : undefined}
      data-stage-face={mark.face ? mark.stageId : undefined}
      data-face={mark.face} data-stage-outline={mark.outline ? mark.stageId : undefined}
      role={inspection && !verticalStage ? 'img' : undefined} tabIndex={inspection && !verticalStage ? 0 : undefined}
      aria-label={inspection && !verticalStage ? `${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion` : undefined}
      pointerEvents={verticalStage || mark.face || mark.outline ? 'none' : undefined}
      onPointerDown={inspection && !verticalStage ? event => event.preventDefault() : undefined}
      onPointerEnter={inspection && !verticalStage ? event => { if (event.pointerType === 'mouse') onPreview(inspection); } : undefined}
      onPointerLeave={inspection && !verticalStage ? onLeave : undefined}
      onFocus={inspection && !verticalStage ? () => onPreview(inspection) : undefined}
      onBlur={inspection && !verticalStage ? onLeave : undefined}>
      {inspection && !verticalStage && <title>{`${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion`}</title>}
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
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [keyboardMotion, setKeyboardMotion] = useState(false);
  const inspections = useMemo(() => new Map(model.marks.flatMap(mark => mark.type === 'path' && mark.inspection ? [[mark.inspection.key, mark.inspection] as const] : [])), [model]);
  const activeKey = variant === 'vertical'
    ? [focusKey, hoverKey, pinnedKey].find(key => key && inspections.has(key)) ?? null
    : hoverKey && inspections.has(hoverKey) ? hoverKey : null;
  const visibleKeys = useMemo(() => activeKey && model.variant === 'branching' ? connectedLinks(model, activeKey) : null, [model, activeKey]);
  const preview = (info: Inspection) => {
    setHoverKey(info.key);
    onInspect?.(info);
  };
  const leave = () => {
    setHoverKey(null);
    onInspect?.(null);
  };
  const verticalData = variant === 'vertical' ? data as readonly Stage[] : null;
  const selectedIndex = verticalData?.findIndex(stage => stage.id === activeKey) ?? -1;
  const verticalStages = verticalData?.map((stage, index) => {
    const marks = model.marks.filter(mark => mark.type === 'path' && (mark.stageId ?? mark.inspection?.key) === stage.id);
    const annotationKeys = new Set(['number', 'leader', 'label', 'value'].map(part => `stage:${stage.id}:${part}`));
    return { stage, index, marks, front: marks.find(mark => mark.type === 'path' && mark.inspection),
      annotations: model.marks.filter(mark => mark.type !== 'path' && annotationKeys.has(mark.key)) };
  }) ?? [];
  const orderedStages = selectedIndex < 0 ? verticalStages
    : [...verticalStages.filter(item => item.index !== selectedIndex), verticalStages[selectedIndex]];
  const clearPinned = () => {
    setPinnedKey(null);
    if (!hoverKey && !focusKey) onInspect?.(null);
  };
  return <div {...rootProps} ref={ref} style={{ display: 'block', ...style }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox ?? `0 0 ${model.width} ${model.height}`} width="100%"
      role="group" aria-label={`${variant} conversion funnel`} style={{ display: 'block', height: 'auto', minWidth: model.width > 900 ? model.width : undefined }}
      onPointerUp={verticalData ? event => { if (event.pointerType !== 'mouse' && !(event.target as Element).closest('[data-hit-stage]')) clearPinned(); } : undefined}>
      {verticalData && <style>{`
        .atlas-vertical-stage { transform-box: view-box; transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity 150ms ease; }
        .atlas-vertical-annotation { transition: opacity 150ms ease; }
        .atlas-vertical-hit { cursor: pointer; }
        .atlas-vertical-hit:focus { outline: none; }
        @media (prefers-reduced-motion: reduce) { .atlas-vertical-stage, .atlas-vertical-annotation { transition: none; } }
        [data-keyboard-motion="off"] .atlas-vertical-stage, [data-keyboard-motion="off"] .atlas-vertical-annotation { transition: none; }
      `}</style>}
      <StableScreenDefs idPrefix={idPrefix} width={model.width} height={model.height} density={normalized.density}
        patternAngle={normalized.patternAngle} dotGain={normalized.dotGain} roughness={normalized.roughness}
        seed={seed} paperGrain={normalized.paperGrain} includeSparse={variant === 'vertical' && normalized.verticalView === 'isometric'} />
      <FadeDefs model={model} idPrefix={idPrefix} />
      <rect width={model.width} height={model.height} fill={normalized.paperGrain ? `url(#${idPrefix}-grain)` : PAPER} />
      {verticalData ? <g data-keyboard-motion={keyboardMotion ? 'off' : undefined}>
        {orderedStages.map(({ stage, index, marks, front }) => {
          const selected = index === selectedIndex;
          const displaced = selectedIndex >= 0 && !selected;
          const ratio = stage.value / (verticalData[0]?.value || 1);
          const scale = 1.06 + .36 * (1 - ratio);
          const transform = selected ? `scale(${scale})`
            : displaced ? `translateY(${index < selectedIndex ? -22 : 22}px) scale(.98)` : 'none';
          return <g key={stage.id} className="atlas-vertical-stage" data-stage={stage.id}
            data-active={selected || undefined} style={{ transform, transformOrigin: front?.type === 'path' && front.focus
              ? `${front.focus.x}px ${front.focus.y}px` : undefined, opacity: displaced ? .28 : 1 }}>
            {marks.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
              activeKey={activeKey} visibleKeys={null} roughness={normalized.roughness ?? .15}
              onPreview={preview} onLeave={leave} verticalStage />)}
            {focusKey === stage.id && front?.type === 'path' && <path d={front.d}
              fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" data-focus-outline="" />}
          </g>;
        })}
        {verticalStages.map(({ stage, annotations }) => <g key={`annotation:${stage.id}`} className="atlas-vertical-annotation"
          data-stage-annotation={stage.id} style={{ opacity: selectedIndex >= 0 && stage.id !== activeKey ? .4 : 1 }}>
          {annotations.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
            activeKey={activeKey} visibleKeys={null} roughness={normalized.roughness ?? .15}
            onPreview={preview} onLeave={leave} />)}
        </g>)}
        {verticalStages.map(({ stage, marks, front }) => {
          if (!front || front.type !== 'path' || !front.inspection) return null;
          const info = front.inspection;
          return <g key={`hit:${stage.id}`}
            className="atlas-vertical-hit" data-hit-stage="" data-key={info.key} tabIndex={0} role="button"
            aria-pressed={pinnedKey === info.key} aria-label={`${info.label}, ${format(info.value)}, ${percent(info.value, info.denominator)} conversion`}
            onPointerDown={event => event.preventDefault()}
            onPointerEnter={event => { if (event.pointerType === 'mouse') { setKeyboardMotion(false); preview(info); } }}
            onPointerLeave={event => { if (event.pointerType === 'mouse') { setHoverKey(null); onInspect?.(pinnedKey ? inspections.get(pinnedKey) ?? null : null); } }}
            onPointerUp={event => { if (event.pointerType !== 'mouse') {
              event.stopPropagation(); setKeyboardMotion(false);
              const next = pinnedKey === info.key ? null : info.key;
              setPinnedKey(next); onInspect?.(next ? info : null);
            } }}
            onFocus={() => { setKeyboardMotion(true); setFocusKey(info.key); onInspect?.(info); }}
            onBlur={() => { setKeyboardMotion(true); setFocusKey(null); onInspect?.(pinnedKey ? inspections.get(pinnedKey) ?? null : null); }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault(); const next = pinnedKey === info.key ? null : info.key;
              setPinnedKey(next); onInspect?.(next ? info : null);
            } else if (event.key === 'Escape') { clearPinned(); } }}>
            <title>{`${info.label}, ${format(info.value)}, ${percent(info.value, info.denominator)} conversion`}</title>
            {marks.flatMap(mark => mark.type === 'path' && mark.fill !== 'none'
              ? [<path key={mark.key} d={mark.d} fill="transparent" stroke="none" pointerEvents="all" />] : [])}
          </g>;
        })}
      </g> : model.marks.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
        activeKey={activeKey} visibleKeys={visibleKeys} roughness={normalized.roughness ?? .15}
        onPreview={preview} onLeave={leave} />)}
      {children}
    </svg>
  </div>;
});
