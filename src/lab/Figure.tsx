import { useEffect, useRef, type RefObject } from 'react';
import { renderFunnel } from '../../dist/lab/lab-engine.js';
import { element, INK, PAPER } from '../../dist/lab/screens.js';
import { ScreenLegend } from './Controls';
import { format, percent } from './utils';
import type { LabConfig, LabPath, LabSvg, PathInfo, Variant } from './types';

const titles: Record<Variant, string> = { continuous: 'Continuous funnel', vertical: 'Vertical funnel', branching: 'Branching funnel' };
const captions = {
  continuous: { half: '02 / Cohort progression · height encodes quantity', mirrored: '02 / Symmetric progression · full thickness encodes quantity' },
  vertical: { isometric: '01 / Projected stages · front width encodes quantity', flat: '01 / Stage comparison · width encodes quantity' },
  branching: '03 / Connected buckets · every split distributes 100%',
};

function paths(svg: LabSvg): LabPath[] {
  return [...svg.querySelectorAll<SVGPathElement>('[data-key]')] as LabPath[];
}

function highlight(svg: LabSvg, info: PathInfo | null, selectedKey: string | null) {
  svg.atlasClearPull?.();
  svg.atlasHighlightedKey = info?.key ?? null;
  const linked = new Set<string>();
  if (info?.kind === 'link' && svg.atlasLayout) {
    const links = svg.atlasLayout.links;
    const traverse = (id: string, upstream: boolean, seen = new Set<string>()) => {
      if (seen.has(id)) return;
      seen.add(id);
      links.filter(link => upstream ? link.target === id : link.source === id).forEach(link => {
        linked.add(link.id);
        traverse(upstream ? link.source : link.target, upstream, seen);
      });
    };
    linked.add(info.key);
    traverse(info.source!, true);
    traverse(info.target!, false);
  }
  paths(svg).forEach(path => {
    const active = !info || (info.kind === 'link' ? linked.has(path.atlasInfo.key) : path.atlasInfo.key === info.key);
    path.setAttribute('fill', active ? path.getAttribute('data-base-fill')! : PAPER);
    if (active) path.removeAttribute('stroke-dasharray');
    else path.setAttribute('stroke-dasharray', '2 4');
    path.setAttribute('aria-pressed', String(selectedKey === path.atlasInfo.key));
    path.atlasEmphasis?.setAttribute('data-emphasis', String(Boolean(info) && active));
  });
  svg.querySelectorAll('[data-stage-face]').forEach(face => {
    const active = !info || face.getAttribute('data-stage-face') === info.key;
    face.setAttribute('fill', active ? face.getAttribute('data-base-fill')! : PAPER);
  });
}

function attachProximity(svg: LabSvg, sections: LabPath[], canvas: HTMLDivElement, axis: 'x' | 'y', selected: RefObject<string | null>, hover: RefObject<PathInfo | null>, onInspect: (info: PathInfo | null) => void) {
  const radius = 24;
  let pulled: SVGPathElement | null = null;
  svg.atlasClearPull = () => {
    pulled?.style.removeProperty('--pull-x');
    pulled?.style.removeProperty('--pull-y');
    pulled = null;
  };
  svg.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hover.current = null;
    const pinned = sections.find(path => path.atlasInfo.key === selected.current)?.atlasInfo ?? null;
    highlight(svg, pinned, selected.current);
    if (pinned) onInspect(pinned);
  });
  if (typeof svg.createSVGPoint !== 'function' || sections.some(path => typeof path.getTotalLength !== 'function')) return;
  const contours = sections.map(path => {
    const length = path.getTotalLength();
    const count = Math.max(1, Math.ceil(length / 12));
    return { path, bounds: path.getBBox(), points: Array.from({ length: count + 1 }, (_, index) => path.getPointAtLength(length * index / count)) };
  });
  const show = (info: PathInfo | null) => {
    if (svg.atlasHighlightedKey === (info?.key ?? null)) return;
    hover.current = info;
    highlight(svg, info, null);
    if (info) onInspect(info);
  };
  svg.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || selected.current || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    canvas.dataset.motion = 'pointer';
    const section = (event.target as Element).closest('path[data-key]') as LabPath | null;
    if (section) {
      svg.atlasClearPull?.();
      show(section.atlasInfo);
      return;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(matrix.inverse());
    let nearest: { path: LabPath; dx: number; dy: number; distance: number } | null = null;
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
    if (!nearest || nearest.distance >= radius * radius) { show(null); return; }
    show(nearest.path.atlasInfo);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.atlasClearPull?.(); return; }
    const distance = Math.sqrt(nearest.distance), offset = axis === 'x' ? nearest.dx : nearest.dy;
    const pull = Math.sign(offset) * Math.min(5, Math.abs(offset) * 2) * (1 - distance / radius);
    const emphasis = nearest.path.atlasEmphasis!;
    if (pulled && pulled !== emphasis) svg.atlasClearPull?.();
    emphasis.style.setProperty('--pull-x', `${axis === 'x' ? pull : 0}px`);
    emphasis.style.setProperty('--pull-y', `${axis === 'y' ? pull : 0}px`);
    pulled = emphasis;
  });
}

function printEntrance(svg: LabSvg, variant: Variant) {
  svg.classList.add('chart-intro', `chart-intro--${variant}`);
  const ribbons = paths(svg);
  if (variant === 'vertical') {
    const steps = new Map(ribbons.map((path, index) => [path.atlasInfo.key, index]));
    ribbons.forEach((path, index) => {
      path.classList.add('print-mark');
      path.style.setProperty('--print-step', String(index));
    });
    svg.querySelectorAll<SVGElement>('[data-stage-face],[data-stage-outline]').forEach(face => {
      const key = face.getAttribute('data-stage-face') ?? face.getAttribute('data-stage-outline');
      face.classList.add('print-mark');
      face.style.setProperty('--print-step', String(steps.get(key ?? '') ?? 0));
    });
    return;
  }
  const [, , width, height] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  const id = 'lab-figure-print-wipe';
  const clip = element('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
  clip.append(element('rect', { x: 0, y: 0, width, height, class: 'print-wipe' }));
  const defs = element('defs');
  defs.append(clip);
  svg.prepend(defs);
  const otherMarks = variant === 'branching'
    ? [...svg.querySelectorAll(':scope > rect')].slice(1)
    : [...svg.querySelectorAll('[data-ink-baseline]')];
  for (const node of [...ribbons, ...otherMarks]) {
    node.setAttribute('clip-path', `url(#${id})`);
    (node as LabPath).atlasEmphasis?.setAttribute('clip-path', `url(#${id})`);
  }
}

function FunnelCanvas({ config, introToken, selectedKey, onSelect, onInspect, onPathsChange, onRenderError, svgRef }: {
  config: LabConfig;
  introToken: number;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void;
  onRenderError: (error: string | null) => void;
  svgRef: RefObject<LabSvg | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const hover = useRef<PathInfo | null>(null);
  const lastIntro = useRef(0);
  const selected = useRef(selectedKey);
  selected.current = selectedKey;

  useEffect(() => {
    const canvas = host.current!;
    try {
      const svg = renderFunnel(config.data, { ...config.options, variant: config.variant, idPrefix: 'lab-figure', seed: config.seed }) as LabSvg;
      svgRef.current = svg;
      canvas.replaceChildren(svg);
      canvas.dataset.motion = 'instant';
      hover.current = null;
      const ribbons = paths(svg);
      ribbons.forEach(path => {
        const emphasis = element('path', {
          d: path.getAttribute('d')!, fill: 'none', stroke: INK, 'stroke-width': 1,
          'vector-effect': 'non-scaling-stroke', opacity: 0, class: 'section-emphasis',
          'aria-hidden': 'true', 'pointer-events': 'none', 'data-emphasis': 'false',
        }) as SVGPathElement;
        if (path.hasAttribute('mask')) emphasis.setAttribute('mask', path.getAttribute('mask')!);
        if (path.hasAttribute('clip-path')) emphasis.setAttribute('clip-path', path.getAttribute('clip-path')!);
        path.atlasEmphasis = emphasis;
        svg.append(emphasis);
        const preview = () => {
          if (selected.current) return;
          hover.current = path.atlasInfo;
          highlight(svg, path.atlasInfo, null);
          onInspect(path.atlasInfo);
        };
        const restore = () => {
          hover.current = null;
          const pinned = ribbons.find(item => item.atlasInfo.key === selected.current)?.atlasInfo ?? null;
          highlight(svg, pinned, selected.current);
          onInspect(pinned);
        };
        const choose = () => {
          const key = selected.current === path.atlasInfo.key ? null : path.atlasInfo.key;
          selected.current = key;
          onSelect(key);
          onInspect(path.atlasInfo);
        };
        path.addEventListener('pointerenter', event => {
          if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
          canvas.dataset.motion = 'pointer';
          preview();
        });
        path.addEventListener('pointerdown', event => { canvas.dataset.motion = event.pointerType === 'mouse' ? 'pointer' : 'instant'; });
        path.addEventListener('focus', () => { canvas.dataset.motion = 'instant'; preview(); });
        path.addEventListener('blur', () => { canvas.dataset.motion = 'instant'; restore(); });
        path.addEventListener('click', choose);
        path.addEventListener('keydown', event => {
          canvas.dataset.motion = 'instant';
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
          if (event.key === 'Escape') { selected.current = null; onSelect(null); highlight(svg, null, null); onInspect(path.atlasInfo); }
        });
      });
      attachProximity(svg, ribbons, canvas, config.variant === 'vertical' ? 'y' : 'x', selected, hover, onInspect);
      const infos = ribbons.map(path => path.atlasInfo);
      onPathsChange(infos);
      onRenderError(null);
      const pinned = infos.find(info => info.key === selected.current) ?? null;
      highlight(svg, pinned, selected.current);
      if (selected.current && !pinned) onSelect(null);
      if (introToken > lastIntro.current) {
        printEntrance(svg, config.variant);
        lastIntro.current = introToken;
      }
      return () => { svgRef.current = null; svg.remove(); };
    } catch (error) {
      svgRef.current = null;
      canvas.replaceChildren();
      onPathsChange([]);
      onRenderError(error instanceof Error ? error.message : String(error));
    }
  }, [config, introToken, onSelect, onInspect, onPathsChange, onRenderError, svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const info = paths(svg).find(path => path.atlasInfo.key === selectedKey)?.atlasInfo ?? hover.current;
    highlight(svg, info, selectedKey);
  }, [selectedKey, svgRef]);

  return <div id="canvas" className="canvas" tabIndex={-1} ref={host} />;
}

export function FigurePanel({ config, introToken, selectedKey, inspected, infos, error, svgRef, onSelect, onInspect, onPathsChange, onRenderError, onExport }: {
  config: LabConfig;
  introToken: number;
  selectedKey: string | null;
  inspected: PathInfo | null;
  infos: PathInfo[];
  error: string | null;
  svgRef: RefObject<LabSvg | null>;
  onSelect: (key: string | null) => void;
  onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void;
  onRenderError: (error: string | null) => void;
  onExport: () => void;
}) {
  const index = ['vertical', 'continuous', 'branching'].indexOf(config.variant);
  const active = infos.find(info => info.key === selectedKey) ?? inspected ?? infos[0] ?? null;
  const caption = config.variant === 'vertical' ? captions.vertical[config.options.verticalView ?? 'flat']
    : config.variant === 'continuous' ? captions.continuous[config.options.mirror ? 'mirrored' : 'half']
      : captions.branching;
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
