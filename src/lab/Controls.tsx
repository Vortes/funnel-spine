import { useEffect, useRef } from 'react';
import { edgeFadeStops } from '../chart/model';
import { ScreenDefs } from '../react/ScreenDefs';
import { screenLabels, screenTypes } from '../../dist/lab/screens.js';
import type { LabOptions, Variant } from './types';

type RangeRow = readonly [keyof LabOptions, string, number, number, number, string];
const shared: RangeRow[] = [
  ['density', 'Screen pitch', 3, 14, 1, 'px'],
  ['strokeWidth', 'Outline weight', .25, .75, .05, 'pt'],
  ['patternAngle', 'Hatch angle', -90, 90, 5, '°'],
  ['dotGain', 'Dot gain', -.8, .2, .01, '%'],
  ['roughness', 'Edge irregularity', 0, .6, .05, 'px'],
  ['fontSize', 'Label size', 12, 18, 1, 'px'],
];
const shapes = {
  continuous: [
    ['curve', 'Curvature', .1, .8, .05, ''],
    ['chartHeight', 'Funnel height', 120, 265, 5, 'px'],
    ['edgeFade', 'Edge fade', 0, .45, .05, '%'],
  ],
  vertical: {
    flat: [
      ['stageHeight', 'Funnel height', 250, 330, 5, 'px'],
      ['stageGap', 'Stage gap', 0, 20, 1, 'px'],
      ['capCurve', 'Cap curvature', 0, 20, 1, 'px'],
      ['borderRadius', 'Border radius', 0, 20, 1, 'px'],
      ['tailRatio', 'Terminal taper', .15, 1, .05, '%'],
    ],
    isometric: [
      ['stageHeight', 'Funnel height', 250, 330, 5, 'px'],
      ['stageGap', 'Stage gap', 0, 20, 1, 'px'],
      ['isoDepth', 'Projection depth', 18, 200, 2, 'px'],
      ['isoRotation', 'View rotation', -360, 360, 5, '°'],
      ['borderRadius', 'Border radius', 0, 20, 1, 'px'],
      ['tailRatio', 'Terminal taper', .15, .95, .05, '%'],
    ],
  },
  branching: [
    ['curve', 'Curvature', .1, .8, .05, ''],
    ['nodeGap', 'Branch spacing', 28, 85, 1, 'px'],
    ['nodeWidth', 'Node width', 1, 6, .5, 'px'],
  ],
} satisfies { continuous: RangeRow[]; vertical: { flat: RangeRow[]; isometric: RangeRow[] }; branching: RangeRow[] };

function display(value: number, unit: string) {
  if (unit === '%') return `${Math.round(value * 100)}%`;
  if (unit === '°') return `${value}°`;
  if (unit === 'px') return `${Number(value.toFixed(2))} px`;
  if (unit === 'pt') return `${value.toFixed(2)} pt`;
  return value.toFixed(2);
}

export function ScreenSwatch({ type, options, seed, idPrefix }: { type: string; options: LabOptions; seed: number; idPrefix: string }) {
  return <span aria-hidden="true"><svg viewBox="0 0 32 24" width="32" height="24">
    <ScreenDefs idPrefix={idPrefix} width={32} height={24} density={options.density} patternAngle={options.patternAngle}
      dotGain={options.dotGain} roughness={options.roughness} seed={seed} />
    {type === 'mixed' ? screenTypes.map((screen, index) => <rect key={screen} x={index * 32 / screenTypes.length}
      width={32 / screenTypes.length} height={24} fill={`url(#${idPrefix}-${screen})`} />)
      : <rect x=".5" y=".5" width="31" height="23" fill={`url(#${idPrefix}-${type})`} />}
    <rect x=".5" y=".5" width="31" height="23" fill="none" stroke="#2F4FE0" strokeWidth=".65" />
  </svg></span>;
}

function RangeControl({ row, value, onChange }: { row: RangeRow; value: number; onChange: (value: number) => void }) {
  const [key, label, min, max, step, unit] = row;
  const fade = key === 'edgeFade' ? (value ? `linear-gradient(to right, ${edgeFadeStops(value).map(([offset, alpha]) => `rgb(0 0 0 / ${alpha}) ${Math.round(offset * 1000) / 10}%`).join(', ')})` : 'none') : undefined;
  return <div className={key === 'edgeFade' ? 'control control--fade' : 'control'}>
    <label className="control-label" htmlFor={key}>{label}<output htmlFor={key}>{display(value, unit)}</output></label>
    <input id={key} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
    {fade !== undefined && <><div className="fade-preview" style={{ maskImage: fade }} aria-hidden="true" /><small className="fade-hint">First and last ribbon only</small></>}
  </div>;
}

export function PrintSettings({ variant, options, seed, seedDraft, onOptionChange, onVerticalViewChange, onSeedDraft, onSeedCommit, onSample, onReset }: {
  variant: Variant;
  options: LabOptions;
  seed: number;
  seedDraft: string;
  onOptionChange: (key: keyof LabOptions, value: number | boolean | string) => void;
  onVerticalViewChange: (view: 'flat' | 'isometric') => void;
  onSeedDraft: (value: string) => void;
  onSeedCommit: () => void;
  onSample: () => void;
  onReset: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [variant]);
  const choices = ['mixed', ...screenTypes];
  const geometry = variant === 'vertical' ? shapes.vertical[options.verticalView ?? 'flat'] : shapes[variant];
  const proximity: RangeRow = ['proximityRadius', 'Proximity radius', 0, 240, 10, 'px'];
  const toggles: [keyof LabOptions, string][] = variant === 'vertical'
    ? [['labels', 'Direct annotations'], ['paperGrain', 'Paper grain']]
    : [['labels', 'Direct annotations'], ['guides', 'Stage guides'], ['paperGrain', 'Paper grain']];
  return <aside aria-label="Figure controls"><div className="sidebar-scroll" ref={scrollRef}>
    <div className="panel-heading"><h2>Print settings</h2><button id="reset" onClick={onReset}>Reset variant</button></div>
    <div id="controls">
      {variant === 'vertical' && <div className="view-switch" role="group" aria-label="Vertical view"><span>VIEW</span>
        {(['isometric', 'flat'] as const).map(view => <button key={view} aria-pressed={options.verticalView === view} onClick={() => onVerticalViewChange(view)}>{view === 'isometric' ? 'Isometric' : 'Flat'}</button>)}
      </div>}
      {variant === 'continuous' && <div className="view-switch" role="group" aria-label="Continuous funnel shape"><span>SHAPE</span>
        <button aria-pressed={!options.mirror} onClick={() => onOptionChange('mirror', false)}>Half</button>
        <button aria-pressed={Boolean(options.mirror)} onClick={() => onOptionChange('mirror', true)}>Full mirror</button>
      </div>}
      <div className="texture-grid" role="group" aria-label="Chart pattern">
        {choices.map(type => <button key={type} data-texture={type} aria-pressed={options.texture === type} onClick={() => onOptionChange('texture', type)}>
          <ScreenSwatch type={type} options={options} seed={seed} idPrefix={`control-${type}`} />{screenLabels[type as keyof typeof screenLabels]}
        </button>)}
      </div>
      {([['Ink & screen', shared], ['Geometry', geometry]] as const).map(([title, rows]) => <fieldset key={title}>
        <legend>{title}</legend>
        {rows.map(row => <RangeControl key={row[0]} row={row} value={options[row[0]] as number} onChange={value => onOptionChange(row[0], value)} />)}
      </fieldset>)}
      {variant === 'vertical' && <fieldset><legend>Interaction</legend>
        <RangeControl row={proximity} value={options.proximityRadius ?? 20} onChange={value => onOptionChange('proximityRadius', value)} />
      </fieldset>}
      {toggles.map(([key, label]) => <label className="toggle" htmlFor={key} key={key}>{label}
        <input id={key} type="checkbox" checked={options[key] as boolean} onChange={event => onOptionChange(key, event.target.checked)} />
      </label>)}
    </div>
    <p className="screen-note">Choose one pattern for the whole chart, or Atlas mix for variation across ribbons.</p>
    <div className="dataset-controls"><label htmlFor="seed">Dataset seed</label><div>
      <input id="seed" type="number" min="0" max="4294967295" step="1" value={seedDraft} onChange={event => onSeedDraft(event.target.value)} onBlur={onSeedCommit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
      <button id="generate" onClick={onSample}>New sample</button>
    </div><p>The same seed produces the same data.</p></div>
  </div></aside>;
}

export function ScreenLegend({ options, seed }: { options: LabOptions; seed: number }) {
  const names = options.texture === 'mixed' ? screenTypes : [options.texture];
  return <div className="screen-legend" id="screen-legend" aria-label="Screen legend">
    {names.map(type => <div className="legend-item" key={type}>
      <ScreenSwatch type={type} options={options} seed={seed} idPrefix={`legend-${type}`} />
      <span>{screenLabels[type as keyof typeof screenLabels]}<small>{options.texture === 'mixed' ? 'MIXED SCREEN' : 'FULL CHART'}</small></span>
    </div>)}
  </div>;
}
