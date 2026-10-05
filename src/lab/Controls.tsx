import { useEffect, useRef } from 'react';
import { edgeFadeStops } from '../../dist/lab/lab-engine.js';
import { screenLabels, screenSwatch, screenTypes } from '../../dist/lab/screens.js';
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
const shapes: Record<Variant, RangeRow[]> = {
  continuous: [
    ['curve', 'Curvature', .1, .8, .05, ''],
    ['chartHeight', 'Funnel height', 120, 265, 5, 'px'],
    ['edgeFade', 'Edge fade', 0, .45, .05, '%'],
  ],
  vertical: [
    ['stageHeight', 'Funnel height', 250, 330, 5, 'px'],
    ['stageGap', 'Stage gap', 0, 20, 1, 'px'],
    ['capCurve', 'Cap curvature', 0, 20, 1, 'px'],
    ['borderRadius', 'Border radius', 0, 20, 1, 'px'],
    ['tailRatio', 'Terminal taper', .15, 1, .05, '%'],
  ],
  branching: [
    ['curve', 'Curvature', .1, .8, .05, ''],
    ['nodeGap', 'Branch spacing', 28, 85, 1, 'px'],
    ['nodeWidth', 'Node width', 1, 6, .5, 'px'],
  ],
};

function display(value: number, unit: string) {
  if (unit === '%') return `${Math.round(value * 100)}%`;
  if (unit === '°') return `${value}°`;
  if (unit === 'px') return `${Number(value.toFixed(2))} px`;
  if (unit === 'pt') return `${value.toFixed(2)} pt`;
  return value.toFixed(2);
}

export function ScreenSwatch({ type, options, seed, idPrefix }: { type: string; options: LabOptions; seed: number; idPrefix: string }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    host.current?.replaceChildren(screenSwatch(type, { ...options, seed }, idPrefix));
  }, [type, options, seed, idPrefix]);
  return <span ref={host} aria-hidden="true" />;
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

export function PrintSettings({ variant, options, seed, seedDraft, onOptionChange, onSeedDraft, onSeedCommit, onSample, onReset }: {
  variant: Variant;
  options: LabOptions;
  seed: number;
  seedDraft: string;
  onOptionChange: (key: keyof LabOptions, value: number | boolean | string) => void;
  onSeedDraft: (value: string) => void;
  onSeedCommit: () => void;
  onSample: () => void;
  onReset: () => void;
}) {
  const choices = [['mixed', 'Atlas mix'], ...screenTypes.map(type => [type, screenLabels[type as keyof typeof screenLabels]])];
  const toggles: [keyof LabOptions, string][] = variant === 'vertical'
    ? [['labels', 'Direct annotations'], ['paperGrain', 'Paper grain']]
    : [['labels', 'Direct annotations'], ['guides', 'Stage guides'], ['paperGrain', 'Paper grain']];
  return <aside aria-label="Figure controls">
    <div className="panel-heading"><h2>Print settings</h2><button id="reset" onClick={onReset}>Reset variant</button></div>
    <div id="controls">
      <div className="texture-grid" role="group" aria-label="Screen sequence">
        {choices.map(([type, label]) => <button key={type} data-texture={type} aria-pressed={options.texture === type} onClick={() => onOptionChange('texture', type)}>
          <ScreenSwatch type={type} options={options} seed={seed} idPrefix={`control-${type}`} />{label}
        </button>)}
      </div>
      {([['Ink & screen', shared], ['Geometry', shapes[variant]]] as const).map(([title, rows]) => <fieldset key={title}>
        <legend>{title}</legend>
        {rows.map(row => <RangeControl key={row[0]} row={row} value={options[row[0]] as number} onChange={value => onOptionChange(row[0], value)} />)}
      </fieldset>)}
      {toggles.map(([key, label]) => <label className="toggle" htmlFor={key} key={key}>{label}
        <input id={key} type="checkbox" checked={options[key] as boolean} onChange={event => onOptionChange(key, event.target.checked)} />
      </label>)}
    </div>
    <p className="screen-note">Choose the starting screen. Neighboring ribbons use different screens.</p>
    <div className="dataset-controls"><label htmlFor="seed">Dataset seed</label><div>
      <input id="seed" type="number" min="0" max="4294967295" step="1" value={seedDraft} onChange={event => onSeedDraft(event.target.value)} onBlur={onSeedCommit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
      <button id="generate" onClick={onSample}>New sample</button>
    </div><p>The same seed produces the same data.</p></div>
  </aside>;
}

export function ScreenLegend({ options, seed }: { options: LabOptions; seed: number }) {
  const names: (keyof typeof screenLabels)[] = ['sparse', 'dense', 'am', 'hatch', 'cross', 'coarse', 'solid'];
  const caption = (type: string) => type === 'am' ? '30% SCREEN' : type === 'cross' || type === 'hatch' ? '50% SCREEN' : type === 'coarse' ? '70% SCREEN' : type === 'solid' ? 'SMALL MARKS ONLY' : 'STOCHASTIC';
  return <div className="screen-legend" id="screen-legend" aria-label="Screen legend">
    {names.map(type => <div className="legend-item" key={type}>
      <ScreenSwatch type={type} options={options} seed={seed} idPrefix={`legend-${type}`} />
      <span>{screenLabels[type]}<small>{caption(type)}</small></span>
    </div>)}
  </div>;
}
