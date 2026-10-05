import { useEffect, useRef, type RefObject } from 'react';
import { renderFunnel } from '../../dist/lab/lab-engine.js';
import { element, INK, PAPER } from '../../dist/lab/screens.js';
import { ScreenLegend } from './Controls';
import { format, percent } from './utils';
import type { LabConfig, LabPath, LabSvg, PathInfo, Variant } from './types';

const titles: Record<Variant, string> = { continuous: 'Continuous funnel', vertical: 'Vertical funnel', branching: 'Branching funnel' };
const captions: Record<Variant, string> = {
  continuous: '01 / Cohort progression · height encodes quantity',
  vertical: '02 / Stage comparison · width encodes quantity',
  branching: '03 / Connected buckets · every split distributes 100%',
};

function paths(svg: LabSvg): LabPath[] {
  return [...svg.querySelectorAll<SVGPathElement>('[data-key]')] as LabPath[];
}

function highlight(svg: LabSvg, info: PathInfo | null, selectedKey: string | null) {
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
}

function FunnelCanvas({ config, selectedKey, onSelect, onInspect, onPathsChange, onRenderError, svgRef }: {
  config: LabConfig;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onInspect: (info: PathInfo | null) => void;
  onPathsChange: (infos: PathInfo[]) => void;
  onRenderError: (error: string | null) => void;
  svgRef: RefObject<LabSvg | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const hover = useRef<PathInfo | null>(null);
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
        path.addEventListener('pointerleave', restore);
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
      const infos = ribbons.map(path => path.atlasInfo);
      onPathsChange(infos);
      onRenderError(null);
      const pinned = infos.find(info => info.key === selected.current) ?? null;
      highlight(svg, pinned, selected.current);
      if (selected.current && !pinned) onSelect(null);
      return () => { svgRef.current = null; svg.remove(); };
    } catch (error) {
      svgRef.current = null;
      canvas.replaceChildren();
      onPathsChange([]);
      onRenderError(error instanceof Error ? error.message : String(error));
    }
  }, [config, onSelect, onInspect, onPathsChange, onRenderError, svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const info = paths(svg).find(path => path.atlasInfo.key === selectedKey)?.atlasInfo ?? hover.current;
    highlight(svg, info, selectedKey);
  }, [selectedKey, svgRef]);

  return <div id="canvas" className="canvas" tabIndex={-1} ref={host} />;
}

export function FigurePanel({ config, selectedKey, inspected, infos, error, svgRef, onSelect, onInspect, onPathsChange, onRenderError, onExport }: {
  config: LabConfig;
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
  const index = ['continuous', 'vertical', 'branching'].indexOf(config.variant);
  const active = infos.find(info => info.key === selectedKey) ?? inspected ?? infos[0] ?? null;
  return <section className="figure">
    <div className="figure-head"><div>
      <span id="figure-number" className="overline">FIG. 00{index + 1}</span>
      <h2 id="figure-title">{titles[config.variant]}</h2>
      <p className="figure-subtitle">{config.variant === 'branching' ? 'One entry bucket. Every split distributes 100% to its children.' : 'A study of quantity, progression, and loss.'}</p>
    </div><div className="figure-actions"><a href="/lab/benchmark.html">Stipple benchmark ↗</a><a href="/lab/vertical-particles/">Particle study ↗</a><button id="svg-export" disabled={Boolean(error) || !infos.length} onClick={onExport}>Export SVG</button></div></div>
    <div className="ink-spec"><span className="ink-mark" aria-hidden="true" /><span>BLUE 01 <b>#2F4FE0</b></span><span>COOL GRAY STOCK <b>#E4E5E8</b></span><span>ONE SPOT INK</span></div>
    <FunnelCanvas config={config} selectedKey={selectedKey} onSelect={onSelect} onInspect={onInspect} onPathsChange={onPathsChange} onRenderError={onRenderError} svgRef={svgRef} />
    <ScreenLegend options={config.options} seed={config.seed} />
    <div className="caption"><span id="figure-caption">{captions[config.variant]}</span><span>Hover to inspect · click to pin</span></div>
    <div className="inspector" aria-live="polite"><div><span id="inspect-state">{selectedKey ? 'PINNED PATH' : 'PATH INSPECTOR'}</span><strong id="inspect-path">{active?.label ?? 'Explore a ribbon'}</strong></div>
      <div><span>Quantity</span><strong id="inspect-value">{active ? format(active.value) : '—'}</strong></div>
      <div><span>Conversion</span><strong id="inspect-conversion">{active ? percent(active.value, active.denominator) : '—'}</strong></div>
      <div><span>Of total</span><strong id="inspect-total">{active ? percent(active.value, active.total) : '—'}</strong></div>
      {selectedKey && <button id="unpin" onClick={() => onSelect(null)}>Unpin</button>}
    </div>
    {error && <p id="figure-error" role="alert">{error}</p>}
  </section>;
}
