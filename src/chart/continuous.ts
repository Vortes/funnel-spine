import type { ChartModel, ChartOptions, Inspection, Stage } from './model.js';
import { createMarkHelpers, createModel, fmt, pct } from './shared.js';

export function edgeFadeStops(fade: number, side: 'left' | 'right' | 'both' = 'both'): [number, number][] {
  if (!fade) return [[0, 1], [1, 1]];
  const ramp: [number, number][] = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return [fade * t, +(t * t * (3 - 2 * t)).toFixed(4)];
  });
  const left: [number, number][] = [...ramp, [1, 1]];
  const right: [number, number][] = [[0, 1], ...ramp.slice().reverse().map(([offset, alpha]): [number, number] => [1 - offset, alpha])];
  return side === 'left' ? left : side === 'right' ? right : [...ramp, [1 - fade, 1], ...right.slice(2)];
}

export function continuousModel(stageData: readonly Stage[], options: ChartOptions = {}): ChartModel {
  const { texture = 'mixed', strokeWidth = .5, labels = true, curve = .5,
    chartHeight = 235, edgeFade = 0, mirror = false, guides = true, fontSize = 14 } = options;
  const model = createModel('continuous', 900, 460);
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, max = stageData[0].value || 1;
  if (edgeFade > 0) for (const side of ['left', 'right', 'both'] as const) model.fadeStops[side] = edgeFadeStops(edgeFade, side);
    const step = 790 / (stageData.length - 1), base = 365, center = base - chartHeight / 2;
    if (guides) {
      const marks = mirror ? [1, .75, .5, .25, 0, .25, .5, .75, 1].map((ratio, i) => [center + (i - 4) * chartHeight / 8, ratio]) : [0, .25, .5, .75, 1].map(ratio => [base - chartHeight * ratio, ratio]);
      for (const [i, [y, ratio]] of marks.entries()) {
        addLine(`scale:${i}:tick`, 38, y, 46, y, .4);
        addText(`scale:${i}:label`, 31, y + 3, `${Math.round(ratio * 100)}`, 10, 'end');
      }
      addText('scale:unit', 31, base - chartHeight - 13, '%', 10, 'end');
    }
    stageData.forEach((s, i) => {
      const x = 50 + i * step, h = s.value / max * chartHeight, top = mirror ? center - h / 2 : base - h, bottom = mirror ? center + h / 2 : base;
      if (guides) addLine(`stage:${s.id}:guide`, x, 96, x, 386, undefined, '2 5');
      if (labels) {
        const anchor = i === stageData.length - 1 ? 'end' : 'start';
        addText(`stage:${s.id}:label`, x, 59, s.label, fontSize, anchor);
        addText(`stage:${s.id}:value`, x, 81, fmt(s.value), fontSize - 2, anchor);
      }
      if (i < stageData.length - 1) {
        const next = stageData[i + 1], h2 = next.value / max * chartHeight, top2 = mirror ? center - h2 / 2 : base - h2, bottom2 = mirror ? center + h2 / 2 : base;
        const xx = x + step, c = step * curve;
        const d = mirror ? `M ${x} ${top} C ${x + c} ${top} ${xx - c} ${top2} ${xx} ${top2} L ${xx} ${bottom2} C ${xx - c} ${bottom2} ${x + c} ${bottom} ${x} ${bottom} Z`
          : `M ${x} ${top} C ${x + c} ${top} ${xx - c} ${top2} ${xx} ${top2} L ${xx} ${base} L ${x} ${base} Z`;
        const maskSide = edgeFade > 0 ? (i === 0 && i === stageData.length - 2 ? 'both' : i === 0 ? 'left' : i === stageData.length - 2 ? 'right' : undefined) : undefined;
        const inspection: Inspection = { key: s.id, label: `${s.label} → ${next.label}`, value: next.value, denominator: s.value, total: max, kind: 'stage' };
        marks.push({ type: 'path', key: s.id, d, pattern: chooseScreen(i), stroke: true, strokeWidth: sw, inspection, maskSide });
      }
      addText(`stage:${s.id}:ratio`, x, 417, `${String(i + 1).padStart(2, '0')} / ${pct(s.value, max)}`, 12, i === stageData.length - 1 ? 'end' : 'start');
    });
    if (!mirror && !edgeFade) addLine('baseline', 50, 365, 840, 365, sw, undefined, true);
  return model;
}
