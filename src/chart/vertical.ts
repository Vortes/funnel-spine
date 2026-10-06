import type { ChartModel, ChartOptions, Inspection, Stage } from './model.js';
import { createMarkHelpers, createModel, fmt, pct } from './shared.js';

export function verticalRimGeometry(data: readonly Stage[], { stageHeight = 310, stageGap = 9, tailRatio = .65, borderRadius = 0 }: Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'borderRadius'> = {}) {
  const max = data[0].value || 1, visibleHeight = Math.max(0, stageHeight / data.length - stageGap);
  const widths = [...data.map(stage => 460 * stage.value / max), 460 * data[data.length - 1].value * tailRatio / max];
  const radii = widths.map(width => Math.min(borderRadius, width / 4, visibleHeight / 3));
  return { widths, radii };
}

type Point2 = { x: number; y: number };
const lerp = (a: Point2, b: Point2, t: number): Point2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const quad = (a: Point2, b: Point2, c: Point2, t: number): Point2 => lerp(lerp(a, b, t), lerp(b, c, t), t);
const point = (p: Point2) => `${p.x} ${p.y}`;
function trimmed(a: Point2, b: Point2, c: Point2, start: number, end: number) {
  const p = quad(a, b, c, start), q = quad(a, b, c, end), t = end - start;
  return { p, q, control: { x: p.x + t * ((1 - start) * (b.x - a.x) + start * (c.x - b.x)), y: p.y + t * ((1 - start) * (b.y - a.y) + start * (c.y - b.y)) } };
}
function intersection(a: Point2, u: Point2, b: Point2, v: Point2, fallback: Point2): Point2 {
  const cross = u.x * v.y - u.y * v.x;
  if (Math.abs(cross) < 1e-8) return fallback;
  const t = ((b.x - a.x) * v.y - (b.y - a.y) * v.x) / cross;
  return { x: a.x + t * u.x, y: a.y + t * u.y };
}
const tangent = (a: Point2, b: Point2, c: Point2, t: number): Point2 => ({ x: (1 - t) * (b.x - a.x) + t * (c.x - b.x), y: (1 - t) * (b.y - a.y) + t * (c.y - b.y) });

export function verticalContainerGeometry(data: readonly Stage[], options: Required<Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'capCurve' | 'borderRadius'>>, index: number) {
  const center = 390, height = options.stageHeight / data.length, y = 70 + index * height, max = data[0].value || 1;
  const width = 460 * data[index].value / max, lowerWidth = 460 * (data[index + 1]?.value ?? data[index].value * options.tailRatio) / max, bottom = y + height - options.stageGap;
  const a = { x: center - width / 2, y }, b = { x: center + width / 2, y }, c = { x: center + lowerWidth / 2, y: bottom }, d = { x: center - lowerWidth / 2, y: bottom };
  const topControl = { x: center, y: y + options.capCurve }, bottomControl = { x: center, y: bottom + options.capCurve / 4 };
  const radius = Math.min(options.borderRadius, (bottom - y) * .25, Math.min(width, lowerWidth) * .2);
  const side = Math.hypot(c.x - b.x, c.y - b.y), u = width ? radius / width : 0, v = lowerWidth ? radius / lowerWidth : 0, s = side ? radius / side : 0;
  const top = trimmed(a, topControl, b, u, 1 - u), base = trimmed(c, bottomControl, d, v, 1 - v);
  const rightStart = lerp(b, c, s), rightEnd = lerp(b, c, 1 - s), leftStart = lerp(d, a, s), leftEnd = lerp(d, a, 1 - s);
  const rightVector = { x: c.x - b.x, y: c.y - b.y }, leftVector = { x: a.x - d.x, y: a.y - d.y };
  const tr = intersection(top.q, tangent(a, topControl, b, 1 - u), rightStart, rightVector, b);
  const br = intersection(rightEnd, rightVector, base.p, tangent(c, bottomControl, d, v), c);
  const bl = intersection(base.q, tangent(c, bottomControl, d, 1 - v), leftStart, leftVector, d);
  const tl = intersection(leftEnd, leftVector, top.p, tangent(a, topControl, b, u), a);
  const path = `M ${point(top.p)} Q ${point(top.control)} ${point(top.q)} Q ${point(tr)} ${point(rightStart)} L ${point(rightEnd)} Q ${point(br)} ${point(base.p)} Q ${point(base.control)} ${point(base.q)} Q ${point(bl)} ${point(leftStart)} L ${point(leftEnd)} Q ${point(tl)} ${point(top.p)} Z`;
  return { path, y, bottom, height: bottom - y, width, lowerWidth, radius, centerX: center, centerY: (y + bottom) / 2,
    topLeft: top.p.x, topRight: top.q.x, bottomLeft: base.q.x, bottomRight: base.p.x };
}

type Point = { x: number; y: number };
function roundedPolygonPath(points: Point[], radius: number): string {
  if (!radius) return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  const corners = points.map((point, i) => {
    const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const before = Math.hypot(point.x - previous.x, point.y - previous.y), after = Math.hypot(next.x - point.x, next.y - point.y);
    const trim = Math.min(radius, before / 2, after / 2);
    return { point, entry: { x: point.x + (previous.x - point.x) * trim / before, y: point.y + (previous.y - point.y) * trim / before }, exit: { x: point.x + (next.x - point.x) * trim / after, y: point.y + (next.y - point.y) * trim / after } };
  });
  return `M ${corners[0].entry.x} ${corners[0].entry.y} ${corners.map(({ point, exit }, i) => `Q ${point.x} ${point.y} ${exit.x} ${exit.y} L ${corners[(i + 1) % corners.length].entry.x} ${corners[(i + 1) % corners.length].entry.y}`).join(' ')} Z`;
}

export function isometricStageGeometry(data: readonly Stage[], { stageHeight = 310, stageGap = 20, tailRatio = .65, isoDepth = 36, isoRotation = 30, borderRadius = 0 }: Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'isoDepth' | 'isoRotation' | 'borderRadius'> = {}) {
  const angle = isoRotation * Math.PI / 180, baseline = Math.cos(Math.PI / 6);
  const dx = isoDepth * Math.sin(angle) / .5, rise = isoDepth * Math.cos(angle) / (baseline * Math.sqrt(3));
  const { widths: linearWidths } = verticalRimGeometry(data, { stageHeight, stageGap, tailRatio });
  const widths = linearWidths.map(width => width * Math.cos(angle) / baseline);
  if (widths.some((width, i) => i > 0 && width >= widths[i - 1])) throw new Error('Isometric stages need decreasing quantities and a terminal taper below 100%.');
  const center = 360 + Math.max(0, 60 - (360 - widths[0] / 2 + Math.min(0, dx))), topY = Math.max(70, rise + 20);
  const count = data.length, maxGap = Math.min(stageGap, stageHeight / count * .35);
  const minFront = Math.min(25, (stageHeight - (count - 1) * maxGap) / count * .75);
  const minimums = data.map((_, i) => minFront + (i < count - 1 ? maxGap : 0));
  const totalTaper = widths[0] - widths[widths.length - 1];
  const natural = data.map((_, i) => stageHeight * (widths[i] - widths[i + 1]) / totalTaper);
  let scale = 1;
  if (natural.some((interval, i) => interval < minimums[i])) {
    let low = 0, high = 1;
    for (let i = 0; i < 48; i++) {
      const middle = (low + high) / 2;
      const total = natural.reduce((sum, interval, index) => sum + Math.max(minimums[index], interval * middle), 0);
      if (total > stageHeight) high = middle;
      else low = middle;
    }
    scale = (low + high) / 2;
  }
  const rimY = [topY];
  natural.forEach((interval, i) => rimY.push(rimY[i] + Math.max(minimums[i], interval * scale)));
  return data.map((stage, i) => {
    const y = rimY[i], nextY = rimY[i + 1], interval = nextY - y;
    const gap = i < data.length - 1 ? Math.min(maxGap, interval * .45) : 0, bottom = nextY - gap;
    const bottomWidth = widths[i] + (widths[i + 1] - widths[i]) * (1 - gap / interval);
    const left = center - widths[i] / 2, right = center + widths[i] / 2;
    const leftBottom = center - bottomWidth / 2, rightBottom = center + bottomWidth / 2;
    const outlinePoints = dx >= 0 ? [
      { x: left, y }, { x: left + dx, y: y - rise }, { x: right + dx, y: y - rise },
      { x: rightBottom + dx, y: bottom - rise }, { x: rightBottom, y: bottom }, { x: leftBottom, y: bottom },
    ] : [
      { x: right, y }, { x: right + dx, y: y - rise }, { x: left + dx, y: y - rise },
      { x: leftBottom + dx, y: bottom - rise }, { x: leftBottom, y: bottom }, { x: rightBottom, y: bottom },
    ];
    return {
      key: stage.id, y, bottom, right, outerRight: right + Math.max(0, dx), topWidth: widths[i], bottomWidth,
      centerX: center + dx / 2, centerY: (y + bottom - rise) / 2,
      outline: roundedPolygonPath(outlinePoints, borderRadius),
      front: `M ${left} ${y} L ${right} ${y} L ${rightBottom} ${bottom} L ${leftBottom} ${bottom} Z`,
      top: `M ${left} ${y} L ${left + dx} ${y - rise} L ${right + dx} ${y - rise} L ${right} ${y} Z`,
      side: dx >= 0 ? `M ${right} ${y} L ${right + dx} ${y - rise} L ${rightBottom + dx} ${bottom - rise} L ${rightBottom} ${bottom} Z`
        : `M ${left} ${y} L ${left + dx} ${y - rise} L ${leftBottom + dx} ${bottom - rise} L ${leftBottom} ${bottom} Z`,
    };
  });
}

export function verticalModel(stageData: readonly Stage[], options: ChartOptions = {}): ChartModel {
  const { texture = 'mixed', strokeWidth = .5, labels = true, stageHeight = 310,
    stageGap = 9, capCurve = 12, borderRadius = 0, tailRatio = .65,
    verticalView = 'isometric', isoDepth = 36, isoRotation = 30, fontSize = 14 } = options;
  const stages = verticalView === 'isometric' ? isometricStageGeometry(stageData, { stageHeight, stageGap, tailRatio, isoDepth, isoRotation, borderRadius }) : undefined;
  const annotationX = stages ? Math.max(670, Math.ceil(stages[0].outerRight + 56)) : 670;
  const height = stages ? Math.max(460, Math.ceil(stages[stages.length - 1].bottom + 60)) : 460;
  const width = stages ? Math.max(900, annotationX + 230) : 900;
  const model = createModel('vertical', width, height);
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, max = stageData[0].value || 1;
  if (stages) {
    if (borderRadius) stages.forEach((stage, i) => model.clips.push({ id: `stage-clip-${i}`, d: stage.outline }));
    stages.forEach((stage, i) => {
      const clipId = borderRadius ? `stage-clip-${i}` : undefined;
      marks.push({ type: 'path', key: `stage:${stage.key}:side`, d: stage.side, pattern: 'cross', stroke: true, strokeWidth: sw, clipId, face: 'side', stageId: stage.key });
      marks.push({ type: 'path', key: `stage:${stage.key}:top`, d: stage.top, pattern: 'sparse', stroke: true, strokeWidth: sw, clipId, face: 'top', stageId: stage.key });
    });
    stages.forEach((stage, i) => {
      const s = stageData[i], clipId = borderRadius ? `stage-clip-${i}` : undefined;
      const inspection: Inspection = { key: s.id, label: s.label, value: s.value, denominator: stageData[i - 1]?.value ?? max, total: max, kind: 'stage' };
      marks.push({ type: 'path', key: s.id, d: stage.front, pattern: chooseScreen(i), stroke: true, strokeWidth: sw, clipId, inspection,
        focus: { x: stage.centerX, y: stage.centerY } });
      if (borderRadius) marks.push({ type: 'path', key: `stage:${s.id}:outline`, d: stage.outline, fill: 'none', stroke: true, strokeWidth: sw, lineJoin: 'round', outline: true, stageId: s.id });
    });
    if (labels) stages.forEach((stage, i) => {
      const s = stageData[i], mid = (stage.y + stage.bottom) / 2;
      addLine(`stage:${s.id}:leader`, stage.outerRight + 12, mid, annotationX - 15, mid, .5, '2 3');
      addText(`stage:${s.id}:label`, annotationX, mid - 4, s.label, fontSize);
      addText(`stage:${s.id}:value`, annotationX, mid + 15, `${fmt(s.value)} · ${pct(s.value, max)}`, fontSize - 2);
    });
    return model;
  }
  stageData.forEach((s, i) => {
    const geometry = verticalContainerGeometry(stageData, { stageHeight, stageGap, tailRatio, capCurve, borderRadius }, i);
    const inspection: Inspection = { key: s.id, label: s.label, value: s.value, denominator: stageData[i - 1]?.value ?? max, total: max, kind: 'stage' };
    marks.push({ type: 'path', key: s.id, d: geometry.path, pattern: chooseScreen(i), stroke: true, strokeWidth: sw, inspection,
      focus: { x: geometry.centerX, y: geometry.centerY } });
    if (labels) {
      const mid = geometry.y + stageHeight / stageData.length / 2;
      addLine(`stage:${s.id}:leader`, 390 + geometry.width / 2 + 12, mid, 655, mid, .5, '2 3');
      addText(`stage:${s.id}:label`, 670, mid - 4, s.label, fontSize);
      addText(`stage:${s.id}:value`, 670, mid + 15, `${fmt(s.value)} · ${pct(s.value, max)}`, fontSize - 2);
    }
  });
  return model;
}
