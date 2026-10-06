import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { AtlasFunnel } from '../react/AtlasFunnel';
import type { VerticalTransition } from '../react/AtlasFunnel';
import { buildChartModel, type FunnelGraph, type Stage } from '../chart/model';
import { useIdleMotion, type IdleMotionValues } from './idle-motion/motion';
import { ScreenLegend } from './Controls';
import { format, percent } from './utils';
import type { LabConfig, LabSvg, PathInfo, Variant } from './types';

const titles: Record<Variant, string> = { continuous: 'Continuous funnel', vertical: 'Vertical funnel', branching: 'Branching funnel' };
const captions = {
  continuous: { half: '02 / Cohort progression · height encodes quantity', mirrored: '02 / Symmetric progression · full thickness encodes quantity' },
  vertical: { isometric: '01 / Projected stages · front width encodes quantity', flat: '01 / Stage comparison · width encodes quantity' },
  branching: '03 / Connected buckets · every split distributes 100%',
};

function FunnelCanvas({ config, crossfadeDuration, proximityDuration, verticalTransition, introToken, idleMotion, onInspect, onPathsChange, onRenderError, svgRef }: {
  config: LabConfig; crossfadeDuration: number; proximityDuration: number; verticalTransition: VerticalTransition; introToken: number; idleMotion: RefObject<IdleMotionValues>; onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void; onRenderError: (error: string | null) => void;
  svgRef: RefObject<LabSvg | null>;
}) {
  const chart = useRef<HTMLDivElement>(null), lastIntro = useRef(0);
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
  const idleScene = useMemo(() => config.variant === 'vertical' && config.options.verticalView === 'isometric' && !result.error
    ? { data: config.data as readonly Stage[], patternAngle: config.options.patternAngle, seed: config.seed } : null, [config, result.error]);
  useIdleMotion(chart, idleMotion, idleScene);
  useLayoutEffect(() => {
    const svg = chart.current?.querySelector('svg') ?? null;
    svgRef.current = svg;
    return () => { svgRef.current = null; };
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
    const steps = new Map([...svg.querySelectorAll<SVGElement>('[data-key]')].map((mark, index) => [mark.dataset.key, index]));
    svg.querySelectorAll<SVGElement>('[data-stage-front],[data-stage-face],[data-stage-outline]').forEach(mark => {
      if (mark.closest('[data-stage-focus]')) return;
      mark.classList.add('print-mark');
      const key = mark.getAttribute('data-stage-front') ?? mark.getAttribute('data-stage-face') ?? mark.getAttribute('data-stage-outline');
      mark.style.setProperty('--print-step', String(steps.get(key ?? '') ?? 0));
    });
  }, [introToken, config, svgRef]);
  useEffect(() => {
    if (reveal === null) return;
    const timeout = setTimeout(() => setReveal(null), 720);
    return () => clearTimeout(timeout);
  }, [reveal]);
  const shared = { ref: chart, options: config.options, seed: config.seed, onInspect };
  const cover = reveal !== null && config.variant !== 'vertical'
    ? <rect key={reveal} className="lab-reveal-cover" x={0} y={0} width={result.width} height={result.height}
      fill="#E4E5E8" pointerEvents="none" onAnimationEnd={() => setReveal(null)} />
    : null;
  return <div id="canvas" className="canvas" tabIndex={-1}>
    {!result.error && (config.variant === 'branching'
      ? <AtlasFunnel {...shared} key="branching" data={config.data as FunnelGraph} variant="branching">{cover}</AtlasFunnel>
      : config.variant === 'continuous'
        ? <AtlasFunnel {...shared} key="continuous" data={config.data as readonly Stage[]} variant="continuous">{cover}</AtlasFunnel>
        : <AtlasFunnel {...shared} key="vertical" data={config.data as readonly Stage[]} variant="vertical"
          verticalTransition={verticalTransition} style={{ '--atlas-crossfade-duration': `${crossfadeDuration}ms`,
            '--atlas-proximity-duration': `${proximityDuration}ms`,
            '--atlas-overlap-delay': `${crossfadeDuration / 3}ms`, '--atlas-relay-duration': `${crossfadeDuration / 2}ms` } as CSSProperties} />)}
  </div>;
}

export function FigurePanel({ config, crossfadeDuration, proximityDuration, verticalTransition, introToken, idleMotion, inspected, infos, error, svgRef, onInspect, onPathsChange, onRenderError, onExport }: {
  config: LabConfig; crossfadeDuration: number; proximityDuration: number; verticalTransition: VerticalTransition; introToken: number; idleMotion: RefObject<IdleMotionValues>; inspected: PathInfo | null;
  infos: PathInfo[]; error: string | null; svgRef: RefObject<LabSvg | null>;
  onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void; onRenderError: (error: string | null) => void; onExport: () => void;
}) {
  const index = ['vertical', 'continuous', 'branching'].indexOf(config.variant);
  const active = inspected ?? infos[0] ?? null;
  const caption = config.variant === 'vertical' ? captions.vertical[config.options.verticalView ?? 'flat']
    : config.variant === 'continuous' ? captions.continuous[config.options.mirror ? 'mirrored' : 'half'] : captions.branching;
  return <section className="figure">
    <div className="figure-head"><div>
      <span id="figure-number" className="overline">FIG. 00{index + 1}</span>
      <h2 id="figure-title">{titles[config.variant]}</h2>
      <p className="figure-subtitle">{config.variant === 'branching' ? 'One entry bucket. Every split distributes 100% to its children.' : 'A study of quantity, progression, and loss.'}</p>
    </div><div className="figure-actions"><a href="/lab/benchmark.html">Stipple benchmark ↗</a><a href="/lab/vertical-particles/">Particle study ↗</a><a href="/lab/idle-motion/">Idle motion ↗</a><button id="svg-export" disabled={Boolean(error) || !infos.length} onClick={onExport}>Export SVG</button></div></div>
    <div className="ink-spec"><span className="ink-mark" aria-hidden="true" /><span>BLUE 01 <b>#2F4FE0</b></span><span>COOL GRAY STOCK <b>#E4E5E8</b></span><span>ONE SPOT INK</span></div>
    <FunnelCanvas config={config} crossfadeDuration={crossfadeDuration} proximityDuration={proximityDuration} verticalTransition={verticalTransition} introToken={introToken} idleMotion={idleMotion} onInspect={onInspect} onPathsChange={onPathsChange} onRenderError={onRenderError} svgRef={svgRef} />
    <ScreenLegend options={config.options} seed={config.seed} />
    <div className="caption"><span id="figure-caption">{caption}</span><span>{config.variant === 'vertical' ? 'Hover, tap, or focus to inspect' : 'Hover or focus to inspect'}</span></div>
    <div className="inspector" aria-live="polite"><div><span id="inspect-state">PATH INSPECTOR</span><strong id="inspect-path">{active?.label ?? 'Explore a ribbon'}</strong></div>
      <div><span>Quantity</span><strong id="inspect-value">{active ? format(active.value) : '—'}</strong></div>
      <div><span>Conversion</span><strong id="inspect-conversion">{active ? percent(active.value, active.denominator) : '—'}</strong></div>
      <div><span>Of total</span><strong id="inspect-total">{active ? percent(active.value, active.total) : '—'}</strong></div>
    </div>
    {error && <p id="figure-error" role="alert">{error}</p>}
  </section>;
}
