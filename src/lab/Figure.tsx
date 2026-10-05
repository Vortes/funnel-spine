import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AtlasFunnel } from '../react/AtlasFunnel';
import { buildChartModel, type FunnelGraph, type Stage } from '../chart/model';
import { ScreenLegend } from './Controls';
import { format, percent } from './utils';
import type { LabConfig, LabSvg, PathInfo, Variant } from './types';

const titles: Record<Variant, string> = { continuous: 'Continuous funnel', vertical: 'Vertical funnel', branching: 'Branching funnel' };
const captions = {
  continuous: { half: '02 / Cohort progression · height encodes quantity', mirrored: '02 / Symmetric progression · full thickness encodes quantity' },
  vertical: { isometric: '01 / Projected stages · front width encodes quantity', flat: '01 / Stage comparison · width encodes quantity' },
  branching: '03 / Connected buckets · every split distributes 100%',
};

function attachProximity(svg: SVGSVGElement, canvas: HTMLDivElement, axis: 'x' | 'y') {
  const sections = [...svg.querySelectorAll<SVGPathElement>('path[data-key]')];
  if (typeof svg.createSVGPoint !== 'function' || sections.some(path => typeof path.getTotalLength !== 'function')) return () => {};
  const contours = sections.map(path => {
    const length = path.getTotalLength(), count = Math.max(1, Math.ceil(length / 12));
    return { path, bounds: path.getBBox(), points: Array.from({ length: count + 1 }, (_, index) => path.getPointAtLength(length * index / count)) };
  });
  let pulled: SVGPathElement | null = null;
  const clear = () => {
    pulled?.style.removeProperty('--pull-x');
    pulled?.style.removeProperty('--pull-y');
    pulled = null;
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    canvas.dataset.motion = 'pointer';
    if ((event.target as Element).closest('path[data-key]')) { clear(); return; }
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(matrix.inverse()), radius = 24;
    let nearest: { path: SVGPathElement; dx: number; dy: number; distance: number } | null = null;
    for (const { path, bounds, points } of contours) {
      if (cursor.x < bounds.x - radius || cursor.x > bounds.x + bounds.width + radius || cursor.y < bounds.y - radius || cursor.y > bounds.y + bounds.height + radius) continue;
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1], b = points[index], vx = b.x - a.x, vy = b.y - a.y, length = vx * vx + vy * vy;
        if (!length) continue;
        const t = Math.max(0, Math.min(1, ((cursor.x - a.x) * vx + (cursor.y - a.y) * vy) / length));
        const dx = cursor.x - a.x - t * vx, dy = cursor.y - a.y - t * vy, distance = dx * dx + dy * dy;
        if (axis === 'x' ? Math.abs(dx) <= Math.abs(dy) : Math.abs(dy) <= Math.abs(dx)) continue;
        if (!nearest || distance < nearest.distance) nearest = { path, dx, dy, distance };
      }
    }
    if (!nearest || nearest.distance >= radius * radius || matchMedia('(prefers-reduced-motion: reduce)').matches) { clear(); return; }
    const emphasis = [...svg.querySelectorAll<SVGPathElement>('.section-emphasis')].find(path => path.dataset.emphasisKey === nearest!.path.dataset.key);
    if (!emphasis) { clear(); return; }
    const distance = Math.sqrt(nearest.distance), offset = axis === 'x' ? nearest.dx : nearest.dy;
    const pull = Math.sign(offset) * Math.min(5, Math.abs(offset) * 2) * (1 - distance / radius);
    if (pulled !== emphasis) clear();
    emphasis.style.setProperty('--pull-x', `${axis === 'x' ? pull : 0}px`);
    emphasis.style.setProperty('--pull-y', `${axis === 'y' ? pull : 0}px`);
    pulled = emphasis;
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', clear);
  return () => { svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerleave', clear); clear(); };
}

function FunnelCanvas({ config, introToken, selectedKey, onSelect, onInspect, onPathsChange, onRenderError, svgRef }: {
  config: LabConfig; introToken: number; selectedKey: string | null;
  onSelect: (key: string | null) => void; onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void; onRenderError: (error: string | null) => void;
  svgRef: RefObject<LabSvg | null>;
}) {
  const canvas = useRef<HTMLDivElement>(null), chart = useRef<HTMLDivElement>(null), lastIntro = useRef(0);
  const [reveal, setReveal] = useState<number | null>(null);
  const result = useMemo(() => {
    try {
      const model = buildChartModel(config.data, config.variant, config.options);
      return { infos: model.marks.flatMap(mark => 'inspection' in mark && mark.inspection ? [mark.inspection] : []) as PathInfo[], width: model.width, height: model.height, error: null };
    } catch (error) {
      return { infos: [] as PathInfo[], width: 0, height: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }, [config]);
  useEffect(() => { onPathsChange(result.infos); onRenderError(result.error); }, [result, onPathsChange, onRenderError]);
  useLayoutEffect(() => {
    const svg = chart.current?.querySelector('svg') ?? null;
    svgRef.current = svg;
    if (!svg || !canvas.current) return;
    canvas.current.dataset.motion = 'instant';
    const detach = attachProximity(svg, canvas.current, config.variant === 'vertical' ? 'y' : 'x');
    return () => { detach(); svgRef.current = null; };
  }, [config, result.error, svgRef]);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || introToken <= lastIntro.current) return;
    lastIntro.current = introToken;
    if (config.variant !== 'vertical') {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setReveal(introToken);
      return;
    }
    svg.classList.add('chart-intro', `chart-intro--${config.variant}`);
    const steps = new Map([...svg.querySelectorAll<SVGPathElement>('path[data-key]')].map((path, index) => [path.dataset.key, index]));
    svg.querySelectorAll<SVGElement>('path[data-key],[data-stage-face],[data-stage-outline]').forEach(mark => {
      mark.classList.add('print-mark');
      const key = mark.getAttribute('data-key') ?? mark.getAttribute('data-stage-face') ?? mark.getAttribute('data-stage-outline');
      mark.style.setProperty('--print-step', String(steps.get(key ?? '') ?? 0));
    });
  }, [introToken, config, svgRef]);
  useEffect(() => {
    if (reveal === null) return;
    const timeout = setTimeout(() => setReveal(null), 720);
    return () => clearTimeout(timeout);
  }, [reveal]);
  const shared = { ref: chart, options: config.options, seed: config.seed, selectedKey,
    onSelectionChange: onSelect, onInspect };
  const cover = reveal !== null && config.variant !== 'vertical'
    ? <rect key={reveal} className="lab-reveal-cover" x={0} y={0} width={result.width} height={result.height}
      fill="#E4E5E8" pointerEvents="none" onAnimationEnd={() => setReveal(null)} />
    : null;
  return <div id="canvas" className="canvas" tabIndex={-1} ref={canvas}>
    {!result.error && (config.variant === 'branching'
      ? <AtlasFunnel {...shared} key="branching" data={config.data as FunnelGraph} variant="branching">{cover}</AtlasFunnel>
      : config.variant === 'continuous'
        ? <AtlasFunnel {...shared} key="continuous" data={config.data as readonly Stage[]} variant="continuous">{cover}</AtlasFunnel>
        : <AtlasFunnel {...shared} key="vertical" data={config.data as readonly Stage[]} variant="vertical" />)}
  </div>;
}

export function FigurePanel({ config, introToken, selectedKey, inspected, infos, error, svgRef, onSelect, onInspect, onPathsChange, onRenderError, onExport }: {
  config: LabConfig; introToken: number; selectedKey: string | null; inspected: PathInfo | null;
  infos: PathInfo[]; error: string | null; svgRef: RefObject<LabSvg | null>;
  onSelect: (key: string | null) => void; onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void; onRenderError: (error: string | null) => void; onExport: () => void;
}) {
  const index = ['vertical', 'continuous', 'branching'].indexOf(config.variant);
  const active = infos.find(info => info.key === selectedKey) ?? inspected ?? infos[0] ?? null;
  const caption = config.variant === 'vertical' ? captions.vertical[config.options.verticalView ?? 'flat']
    : config.variant === 'continuous' ? captions.continuous[config.options.mirror ? 'mirrored' : 'half'] : captions.branching;
  return <section className="figure">
    <div className="figure-head"><div>
      <span id="figure-number" className="overline">FIG. 00{index + 1}</span>
      <h2 id="figure-title">{titles[config.variant]}</h2>
      <p className="figure-subtitle">{config.variant === 'branching' ? 'One entry bucket. Every split distributes 100% to its children.' : 'A study of quantity, progression, and loss.'}</p>
    </div><div className="figure-actions"><a href="/lab/benchmark.html">Stipple benchmark ↗</a><a href="/lab/vertical-particles/">Particle study ↗</a><button id="svg-export" disabled={Boolean(error) || !infos.length} onClick={onExport}>Export SVG</button></div></div>
    <div className="ink-spec"><span className="ink-mark" aria-hidden="true" /><span>BLUE 01 <b>#2F4FE0</b></span><span>COOL GRAY STOCK <b>#E4E5E8</b></span><span>ONE SPOT INK</span></div>
    <FunnelCanvas config={config} introToken={introToken} selectedKey={selectedKey} onSelect={onSelect} onInspect={onInspect} onPathsChange={onPathsChange} onRenderError={onRenderError} svgRef={svgRef} />
    <ScreenLegend options={config.options} seed={config.seed} />
    <div className="caption"><span id="figure-caption">{caption}</span><span>Hover to inspect · click to pin</span></div>
    <div className="inspector" aria-live="polite"><div><span id="inspect-state">{selectedKey ? 'PINNED PATH' : 'PATH INSPECTOR'}</span><strong id="inspect-path">{active?.label ?? 'Explore a ribbon'}</strong></div>
      <div><span>Quantity</span><strong id="inspect-value">{active ? format(active.value) : '—'}</strong></div>
      <div><span>Conversion</span><strong id="inspect-conversion">{active ? percent(active.value, active.denominator) : '—'}</strong></div>
      <div><span>Of total</span><strong id="inspect-total">{active ? percent(active.value, active.total) : '—'}</strong></div>
      {selectedKey && <button id="unpin" onClick={() => onSelect(null)}>Unpin</button>}
    </div>
    {error && <p id="figure-error" role="alert">{error}</p>}
  </section>;
}
