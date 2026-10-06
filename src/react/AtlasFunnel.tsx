'use client';

import { forwardRef, memo, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { normalizeOptions } from '../../dist/lab/options.js';
import { buildChartModel, type ChartMark, type ChartModel, type FunnelGraph, type FunnelVariant, type Inspection, type Stage } from '../chart/model';
import { ScreenDefs } from './ScreenDefs';
import { ComparisonMotionContext } from './comparison-context';

export type { FunnelData, FunnelGraph, FunnelLink, FunnelNode, FunnelVariant, Inspection, Screen, Stage } from '../chart/model';

export type VerticalView = 'flat' | 'isometric';
export type VerticalTransition = 'crossfade' | 'overlap' | 'relay' | 'none';
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
  proximityRadius?: number;
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
  verticalTransition?: VerticalTransition;
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

function proximityAt(svg: SVGSVGElement, x: number, y: number, radius: number): { key: string | null; progress: number } {
  let key: string | null = null, distance = Infinity;
  svg.querySelectorAll<SVGGElement>('[data-hit-stage]').forEach(hit => {
    const bounds = hit.getBoundingClientRect();
    const dx = Math.max(bounds.left - x, 0, x - bounds.right);
    const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
    const next = Math.hypot(dx, dy);
    if (next < distance) { distance = next; key = hit.getAttribute('data-key'); }
  });
  const raw = radius ? Math.max(0, 1 - distance / radius) : Number(distance === 0);
  return raw > 0 ? { key, progress: raw * raw * (3 - 2 * raw) } : { key: null, progress: 0 };
}

function crossfadeDurationMs(svg: SVGSVGElement): number {
  const value = window.getComputedStyle(svg).getPropertyValue('--atlas-crossfade-duration').trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 150;
  if (value.endsWith('ms')) return amount;
  if (value.endsWith('s')) return amount * 1000;
  return 150;
}

function proximityDurationMs(svg: SVGSVGElement): number {
  const value = window.getComputedStyle(svg).getPropertyValue('--atlas-proximity-duration').trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 240;
  if (value.endsWith('ms')) return amount;
  if (value.endsWith('s')) return amount * 1000;
  return 240;
}

function transformValues(value: string): number[] | null {
  if (value === 'none') return [1, 0, 0, 1, 0, 0];
  const args = value.slice(value.indexOf('(') + 1, value.lastIndexOf(')')).split(',').map(Number);
  if (value.startsWith('matrix(') && args.length === 6) return args;
  const scale = /^scale\(([\d.]+)\)$/.exec(value);
  if (scale) return [Number(scale[1]), 0, 0, Number(scale[1]), 0, 0];
  const shifted = /^translateY\(([-\d.]+)px\) scale\(([\d.]+)\)$/.exec(value);
  if (shifted) return [Number(shifted[2]), 0, 0, Number(shifted[2]), 0, Number(shifted[1])];
  return null;
}

function movingVerticalTransforms(svg: SVGSVGElement): boolean {
  return [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage, .atlas-vertical-focus')].some(group => {
    if (group.getAnimations?.().some(animation => animation.playState === 'running'
      && (animation as CSSTransition).transitionProperty === 'transform')) return true;
    const current = transformValues(window.getComputedStyle(group).transform);
    const target = transformValues(group.style.transform);
    return !!current && !!target && current.some((value, index) => Math.abs(value - target[index]) > (index > 3 ? .05 : .0005));
  });
}

function paintVerticalFocus(svg: SVGSVGElement, stages: readonly Stage[], key: string | null, progress: number,
  heldFocusKey?: string | null, retainedFocusKeys?: ReadonlySet<string>) {
  const selectedIndex = stages.findIndex(stage => stage.id === key);
  const strength = selectedIndex < 0 ? 0 : progress;
  const stackTransform = (index: number) => !strength || index === selectedIndex ? 'none'
    : `translateY(${(index < selectedIndex ? -22 : 22) * strength}px) scale(${1 - .02 * strength})`;
  const stackOpacity = (index: number) => !strength ? 1 : index === selectedIndex ? 0 : 1 - .72 * strength;
  svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage').forEach(group => {
    const index = Number(group.getAttribute('data-stage-index'));
    group.style.transform = stackTransform(index);
    group.style.opacity = String(retainedFocusKeys?.has(stages[index].id) ? 0 : stackOpacity(index));
  });
  svg.querySelectorAll<SVGGElement>('.atlas-vertical-focus').forEach(group => {
    if (group.getAttribute('data-stage-focus') === heldFocusKey) return;
    const index = Number(group.getAttribute('data-stage-index'));
    const selected = index === selectedIndex && strength > 0;
    const ratio = stages[index].value / (stages[0]?.value || 1);
    const zoom = 1.06 + .36 * (1 - ratio);
    const retained = retainedFocusKeys?.has(stages[index].id);
    group.style.transform = selected ? `scale(${1 + (zoom - 1) * strength})` : retained ? stackTransform(index) : 'none';
    group.style.opacity = String(selected ? 1 : retained ? stackOpacity(index) : 0);
    group.toggleAttribute('data-visible', selected);
  });
  svg.querySelectorAll<SVGGElement>('.atlas-vertical-annotation').forEach(group => {
    group.style.opacity = String(!strength || group.getAttribute('data-stage-annotation') === key ? 1 : 1 - .6 * strength);
  });
}

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
  onInspect, idPrefix: suppliedPrefix, viewBox, verticalTransition = 'crossfade', children, style, ...rootProps
}, ref) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Seed must be an integer between 0 and 4294967295.');
  const comparisonBefore = useContext(ComparisonMotionContext) === 'before';
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
  const svgRef = useRef<SVGSVGElement>(null);
  const proximityRef = useRef<{ key: string | null; progress: number }>({ key: null, progress: 0 });
  const recentKeyRef = useRef<{ key: string; at: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const heldFocusRef = useRef<string | null>(null);
  const retainedFocusRef = useRef(new Set<string>());
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
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !verticalData) return;
    if (focusKey) {
      retainedFocusRef.current.clear();
      heldFocusRef.current = null;
      svg.removeAttribute('data-switching');
      svg.removeAttribute('data-proximity-transition');
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    const nearby = proximityRef.current;
    const key = [focusKey, nearby.key, pinnedKey].find(item => item && inspections.has(item)) ?? null;
    const progress = comparisonBefore ? (focusKey || !nearby.key && pinnedKey ? 1 : nearby.progress) : key ? 1 : 0;
    paintVerticalFocus(svg, verticalData, key, progress, heldFocusRef.current,
      comparisonBefore || focusKey ? undefined : retainedFocusRef.current);
  }, [verticalData, model, focusKey, pinnedKey, hoverKey, inspections]);
  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = null;
    recentKeyRef.current = null;
    heldFocusRef.current = null;
    retainedFocusRef.current.clear();
    svgRef.current?.removeAttribute('data-switching');
    svgRef.current?.removeAttribute('data-proximity-transition');
  }, [model]);
  const stopFrame = () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };
  const finishMotion = (svg: SVGSVGElement) => {
    if (movingVerticalTransforms(svg)) {
      switchTimerRef.current = window.setTimeout(() => finishMotion(svg), 32);
      return;
    }
    const currentKey = proximityRef.current.key ?? pinnedKey;
    for (const key of retainedFocusRef.current) {
      if (key === currentKey) continue;
      const stage = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage')]
        .find(group => group.getAttribute('data-stage') === key);
      const focus = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-focus')]
        .find(group => group.getAttribute('data-stage-focus') === key);
      if (!stage || !focus) continue;
      stage.style.transition = 'none';
      focus.style.transition = 'none';
      stage.style.opacity = window.getComputedStyle(focus).opacity;
      focus.style.opacity = '0';
      window.getComputedStyle(stage).opacity;
      stage.style.removeProperty('transition');
      focus.style.removeProperty('transition');
    }
    retainedFocusRef.current.clear();
    svg.removeAttribute('data-switching');
    svg.removeAttribute('data-proximity-transition');
    switchTimerRef.current = null;
    if (verticalData) paintVerticalFocus(svg, verticalData, currentKey, currentKey ? 1 : 0);
  };
  const startMotion = (svg: SVGSVGElement, nextKey: string | null, outgoing: string | null, switching: boolean) => {
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    if (outgoing) {
      const previousFocus = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-focus')]
        .find(group => group.getAttribute('data-stage-focus') === outgoing);
      if (previousFocus && Number(window.getComputedStyle(previousFocus).opacity) > .01) retainedFocusRef.current.add(outgoing);
    }
    const stage = nextKey && [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage')]
      .find(group => group.getAttribute('data-stage') === nextKey);
    const focus = nextKey && [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-focus')]
      .find(group => group.getAttribute('data-stage-focus') === nextKey);
    if (stage && focus && Number(window.getComputedStyle(focus).opacity) < .01) {
      const startingTransform = window.getComputedStyle(stage).transform;
      const startingOpacity = window.getComputedStyle(stage).opacity;
      stage.style.transition = 'none';
      focus.style.transition = 'none';
      focus.style.transform = startingTransform;
      focus.style.opacity = startingOpacity;
      stage.style.opacity = '0';
      window.getComputedStyle(focus).transform;
      window.getComputedStyle(stage).opacity;
      stage.style.removeProperty('transition');
      focus.style.removeProperty('transition');
      heldFocusRef.current = nextKey;
    } else heldFocusRef.current = null;
    if (nextKey) retainedFocusRef.current.add(nextKey);
    if (switching) {
      svg.setAttribute('data-switching', 'true');
      svg.removeAttribute('data-proximity-transition');
    } else {
      svg.removeAttribute('data-switching');
      svg.setAttribute('data-proximity-transition', 'true');
    }
    svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage, .atlas-vertical-focus').forEach(group => {
      window.getComputedStyle(group).transform;
    });
    const duration = switching ? crossfadeDurationMs(svg) : proximityDurationMs(svg);
    switchTimerRef.current = window.setTimeout(() => finishMotion(svg), duration + 16);
  };
  const trackProximity = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!verticalData || event.pointerType !== 'mouse' || event.buttons || focusKey) return;
    const svg = svgRef.current;
    if (!svg) return;
    const next = proximityAt(svg, event.clientX, event.clientY, normalized.proximityRadius ?? 20);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && next.progress < 1) {
      next.key = null;
      next.progress = 0;
    }
    const previous = proximityRef.current.key;
    const recent = recentKeyRef.current;
    const now = window.performance.now();
    const outgoing = previous ?? (recent && now - recent.at < 400 ? recent.key : null);
    proximityRef.current = next;
    if (next.key) recentKeyRef.current = { key: next.key, at: now };
    setKeyboardMotion(false);
    svg.setAttribute('data-pointer-tracking', 'true');
    if (next.key) svg.setAttribute('data-proximity-active', 'true');
    else svg.removeAttribute('data-proximity-active');
    if (previous !== next.key) {
      if (outgoing && next.key && outgoing !== next.key && verticalTransition !== 'none' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
        const stage = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage')]
          .find(group => group.getAttribute('data-stage') === next.key);
        const focus = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-focus')]
          .find(group => group.getAttribute('data-stage-focus') === next.key);
        if (comparisonBefore) {
          if (stage && focus && Number(window.getComputedStyle(focus).opacity) < .01) {
            focus.style.transition = 'none';
            focus.style.transform = window.getComputedStyle(stage).transform;
            focus.style.opacity = '0';
            window.getComputedStyle(focus).transform;
            focus.style.removeProperty('transition');
            heldFocusRef.current = next.key;
          } else heldFocusRef.current = null;
          svg.setAttribute('data-switching', 'true');
          window.getComputedStyle(stage ?? svg).transitionProperty;
          switchTimerRef.current = window.setTimeout(() => {
            svg.removeAttribute('data-switching');
            switchTimerRef.current = null;
          }, crossfadeDurationMs(svg) + 16);
        } else {
          startMotion(svg, next.key, outgoing, true);
        }
      } else if (!comparisonBefore && verticalTransition !== 'none'
        && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        startMotion(svg, next.key, outgoing, false);
      }
      setHoverKey(next.key);
      onInspect?.(next.key ? inspections.get(next.key) ?? null : pinnedKey ? inspections.get(pinnedKey) ?? null : null);
    }
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const nearby = proximityRef.current;
      const key = nearby.key ?? (pinnedKey && inspections.has(pinnedKey) ? pinnedKey : null);
      heldFocusRef.current = null;
      paintVerticalFocus(svg, verticalData, key, key ? comparisonBefore && nearby.key ? nearby.progress : 1 : 0,
        null, comparisonBefore ? undefined : retainedFocusRef.current);
    });
  };
  const leaveProximity = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!verticalData || event.pointerType !== 'mouse') return;
    const svg = svgRef.current;
    const outgoing = proximityRef.current.key;
    proximityRef.current = { key: null, progress: 0 };
    heldFocusRef.current = null;
    recentKeyRef.current = null;
    stopFrame();
    svg?.removeAttribute('data-pointer-tracking');
    svg?.removeAttribute('data-proximity-active');
    const timedExit = svg && !comparisonBefore && outgoing && !focusKey && !pinnedKey
      && verticalTransition !== 'none' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (timedExit) startMotion(svg, null, outgoing, false);
    else if (!retainedFocusRef.current.size) {
      svg?.removeAttribute('data-switching');
      svg?.removeAttribute('data-proximity-transition');
      if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    setHoverKey(null);
    const key = focusKey ?? pinnedKey;
    if (svg) paintVerticalFocus(svg, verticalData, key, key ? 1 : 0, null, retainedFocusRef.current);
    onInspect?.(key ? inspections.get(key) ?? null : null);
  };
  const clearPinned = () => {
    setPinnedKey(null);
    if (!hoverKey && !focusKey) onInspect?.(null);
  };
  return <div {...rootProps} ref={ref} style={{ display: 'block', ...style }}>
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox ?? `0 0 ${model.width} ${model.height}`} width="100%"
      role="group" aria-label={`${variant} conversion funnel`} data-vertical-transition={verticalData ? verticalTransition : undefined}
      data-comparison-motion={comparisonBefore ? 'before' : undefined}
      style={{ display: 'block', height: 'auto', minWidth: model.width > 900 ? model.width : undefined }}
      onPointerEnter={verticalData ? trackProximity : undefined} onPointerMove={verticalData ? trackProximity : undefined}
      onPointerLeave={verticalData ? leaveProximity : undefined}
      onPointerUp={verticalData ? event => { if (event.pointerType !== 'mouse' && !(event.target as Element).closest('[data-hit-stage]')) {
        stopFrame(); proximityRef.current = { key: null, progress: 0 };
        svgRef.current?.removeAttribute('data-pointer-tracking');
        svgRef.current?.removeAttribute('data-proximity-active');
        svgRef.current?.removeAttribute('data-switching');
        svgRef.current?.removeAttribute('data-proximity-transition');
        retainedFocusRef.current.clear();
        if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
        setHoverKey(null); clearPinned();
      } } : undefined}>
      {verticalData && <style>{`
        .atlas-vertical-stage, .atlas-vertical-focus { transform-box: view-box; transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease; }
        .atlas-vertical-focus { opacity: 0; }
        .atlas-vertical-annotation { transition: opacity 150ms ease; }
        .atlas-vertical-hit { cursor: pointer; }
        [data-proximity-active="true"] { cursor: pointer; }
        .atlas-vertical-hit:focus { outline: none; }
        [data-pointer-tracking="true"] .atlas-vertical-stage, [data-pointer-tracking="true"] .atlas-vertical-focus,
        [data-pointer-tracking="true"] .atlas-vertical-annotation { transition: none; }
        [data-comparison-motion="before"][data-pointer-tracking="true"] .atlas-vertical-stage,
        [data-comparison-motion="before"][data-pointer-tracking="true"] .atlas-vertical-focus { transition: opacity var(--atlas-crossfade-duration, 150ms) ease; }
        [data-vertical-transition="overlap"] .atlas-vertical-focus { transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease-out var(--atlas-overlap-delay, 50ms); }
        [data-vertical-transition="overlap"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, 0ms; }
        [data-vertical-transition="relay"] .atlas-vertical-focus { transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-relay-duration, 75ms) ease-in; }
        [data-vertical-transition="relay"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, var(--atlas-relay-duration, 75ms); }
        [data-proximity-transition="true"] .atlas-vertical-stage, [data-proximity-transition="true"] .atlas-vertical-focus { transition: transform var(--atlas-proximity-duration, 240ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-proximity-duration, 240ms) ease; }
        [data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-stage, [data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease; }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease-out var(--atlas-overlap-delay, 50ms); }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, 0ms; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-relay-duration, 75ms) ease-in; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, var(--atlas-relay-duration, 75ms); }
        [data-vertical-transition="none"] .atlas-vertical-stage, [data-vertical-transition="none"] .atlas-vertical-focus { transition: none; }
        [data-vertical-transition="none"][data-pointer-tracking="true"] .atlas-vertical-stage, [data-vertical-transition="none"][data-pointer-tracking="true"] .atlas-vertical-focus { transition: none; }
        @media (prefers-reduced-motion: reduce) {
          [data-vertical-transition] .atlas-vertical-stage, [data-vertical-transition] .atlas-vertical-focus,
          [data-vertical-transition] .atlas-vertical-focus[data-visible], [data-vertical-transition] .atlas-vertical-annotation,
          [data-vertical-transition][data-pointer-tracking="true"] .atlas-vertical-stage,
          [data-vertical-transition][data-pointer-tracking="true"] .atlas-vertical-focus { transition: none !important; }
        }
        [data-keyboard-motion="off"] .atlas-vertical-stage, [data-keyboard-motion="off"] .atlas-vertical-focus,
        [data-keyboard-motion="off"] .atlas-vertical-focus[data-visible], [data-keyboard-motion="off"] .atlas-vertical-annotation { transition: none !important; }
      `}</style>}
      <StableScreenDefs idPrefix={idPrefix} width={model.width} height={model.height} density={normalized.density}
        patternAngle={normalized.patternAngle} dotGain={normalized.dotGain} roughness={normalized.roughness}
        seed={seed} paperGrain={normalized.paperGrain} includeSparse={variant === 'vertical' && normalized.verticalView === 'isometric'} />
      <FadeDefs model={model} idPrefix={idPrefix} />
      <rect width={model.width} height={model.height} fill={normalized.paperGrain ? `url(#${idPrefix}-grain)` : PAPER} />
      {verticalData ? <g data-keyboard-motion={keyboardMotion ? 'off' : undefined}>
        {verticalStages.map(({ stage, index, marks, front }) => {
          return <g key={stage.id} className="atlas-vertical-stage" data-stage={stage.id} data-stage-index={index}
            data-active={index === selectedIndex || undefined} style={{ transformOrigin: front?.type === 'path' && front.focus
              ? `${front.focus.x}px ${front.focus.y}px` : undefined }}>
            {marks.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
              activeKey={activeKey} visibleKeys={null} roughness={normalized.roughness ?? .15}
              onPreview={preview} onLeave={leave} verticalStage />)}
          </g>;
        })}
        {verticalStages.map(({ stage, index, marks, front }) => <g key={`focus:${stage.id}`}
          className="atlas-vertical-focus" data-stage-focus={stage.id} data-stage-index={index} aria-hidden="true" pointerEvents="none"
          style={{ opacity: comparisonBefore ? 0 : undefined, transformOrigin: front?.type === 'path' && front.focus
            ? `${front.focus.x}px ${front.focus.y}px` : undefined }}>
          {marks.map(mark => <Mark key={mark.key} mark={mark} idPrefix={idPrefix}
            activeKey={activeKey} visibleKeys={null} roughness={normalized.roughness ?? .15}
            onPreview={preview} onLeave={leave} verticalStage />)}
          {focusKey === stage.id && front?.type === 'path' && <path d={front.d}
            fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" data-focus-outline="" />}
        </g>)}
        {verticalStages.map(({ stage, annotations }) => <g key={`annotation:${stage.id}`} className="atlas-vertical-annotation"
          data-stage-annotation={stage.id}>
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
            onPointerUp={event => { if (event.pointerType !== 'mouse') {
              event.stopPropagation(); stopFrame(); proximityRef.current = { key: null, progress: 0 };
              svgRef.current?.removeAttribute('data-pointer-tracking');
              svgRef.current?.removeAttribute('data-proximity-active');
              svgRef.current?.removeAttribute('data-switching');
              svgRef.current?.removeAttribute('data-proximity-transition');
              retainedFocusRef.current.clear();
              if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
              switchTimerRef.current = null;
              setHoverKey(null); setKeyboardMotion(false);
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
