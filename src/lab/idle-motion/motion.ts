import { useEffect, useRef, type RefObject } from 'react';
import { useDialKitController } from 'dialkit';

const SVG = 'http://www.w3.org/2000/svg';
const INK = '#2F4FE0';

export type IdleMotionValues = {
  island: { enabled: boolean; lift: number; sideShift: number; cycle: number; stagger: number };
  flow: { enabled: boolean; fallTime: number; dotRate: number; dotSize: number };
  hatch: { enabled: boolean; strokes: number; reach: number; weight: number; drawTime: number; hold: number; eraseTime: number; sideFace: boolean;
    directions: number; angleStep: number; jitter: number; mix: string; style: string; stippleDensity: number; stippleSize: number; halftoneDensity: number; halftoneDotSize: number };
};
type Point = { x: number; y: number };
type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };
type Gap = { group: SVGGElement; clip: SVGRectElement; bottom: number; x0: number; x1: number; depth: Point; landFront: number; rate: number; carry: number };
type Screen = { type: string; size: number; radius: number };
type Corner = { group: SVGGElement; corner: Point; front: Point[]; side: Point[]; frontScreen: Screen; sideScreen: Screen; scale: number; carry: number };
// Lines draw along their length; dots swell from one radius to another.
type HandMark = { node: SVGElement; kind: 'line' | 'dot'; corner: number; born: number; draw: number; hold: number; erase: number; from: number; to: number };
// Dot coordinates are local to the stages: x and from in the source stage, x and to in the target stage.
type Dot = { node: SVGCircleElement; gap: number; x: number; from: number; to: number; born: number; fall: number };

const points = (d: string | null) => {
  const values = (d ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return Array.from({ length: values.length / 2 }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }));
};

const inside = (polygon: Point[], p: Point) => polygon.every((a, index) => {
  const b = polygon[(index + 1) % polygon.length], c = polygon[(index + 2) % polygon.length];
  const side = (q: Point) => (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
  return side(p) * side(c) >= 0;
});

// Parameter range [low, high] where the line p + t·direction lies inside a convex polygon.
function chord(polygon: Point[], p: Point, direction: Point): [number, number] {
  let low = -Infinity, high = Infinity;
  const center = polygon.reduce((sum, q) => ({ x: sum.x + q.x / polygon.length, y: sum.y + q.y / polygon.length }), { x: 0, y: 0 });
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    let normal = { x: a.y - b.y, y: b.x - a.x };
    if ((center.x - a.x) * normal.x + (center.y - a.y) * normal.y < 0) normal = { x: -normal.x, y: -normal.y };
    const along = direction.x * normal.x + direction.y * normal.y, offset = (p.x - a.x) * normal.x + (p.y - a.y) * normal.y;
    if (Math.abs(along) < 1e-9) { if (offset < 0) high = -Infinity; return; }
    const t = -offset / along;
    if (along > 0) low = Math.max(low, t); else high = Math.min(high, t);
  });
  return [low, high];
}

function random(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

export type IdleScene = { data: readonly { id: string; value: number }[]; patternAngle?: number; seed: number };

let instances = 0;

/** Removes every node and style the idle motion adds, for exporting a still figure. */
export function stripIdleMotion(svg: SVGSVGElement) {
  svg.querySelectorAll('[data-idle-flow-layer],[data-idle-hatch],[data-idle-clip],[data-idle-mirror]').forEach(node => node.remove());
  svg.querySelectorAll<SVGElement>('.atlas-vertical-stage').forEach(stage => stage.style.removeProperty('translate'));
}

// Idle motion runs only while nobody is inspecting the prism; intensity eases between 0 and 1 so hand-offs never jump.
// It needs the isometric Vertical view, whose top faces receive the falling dots; pass a null scene to turn it off.
export function useIdleMotion(root: RefObject<HTMLElement | null>, motion: RefObject<IdleMotionValues>, scene: IdleScene | null) {
  useEffect(() => {
    const svg = root.current?.querySelector('svg');
    if (!svg || !scene || typeof requestAnimationFrame !== 'function') return;
    const { data } = scene;
    const stages = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage')];
    if (stages.length !== data.length || stages.some(stage => !stage.querySelector('[data-face="top"]'))) return;
    const defs = svg.querySelector('defs') ?? svg.insertBefore(document.createElementNS(SVG, 'defs'), svg.firstChild);
    const instance = ++instances;
    const rand = random(scene.seed);
    // Falling dots live in one layer above every stage, so no stage's hover dimming applies to them. Each frame they
    // are placed through the on-screen transform of the stage they leave and the stage they land on.
    const focusGroups = stages.map((_, index) => svg.querySelector<SVGGElement>(`.atlas-vertical-focus[data-stage-index="${index}"]`));
    const flowLayer = document.createElementNS(SVG, 'g');
    flowLayer.dataset.idleFlowLayer = '';
    flowLayer.setAttribute('pointer-events', 'none');
    const above = focusGroups.filter(Boolean).at(-1) ?? stages.at(-1)!;
    above.parentNode!.insertBefore(flowLayer, above.nextSibling);
    const gaps: Gap[] = stages.slice(0, -1).map((source, index) => {
      const target = stages[index + 1];
      const front = points(source.querySelector(`[data-stage-front="${data[index].id}"]`)?.getAttribute('d') ?? null);
      const top = points(target.querySelector('[data-face="top"]')?.getAttribute('d') ?? null);
      const [frontLeft, backLeft, , frontRight] = top;
      const clipPath = document.createElementNS(SVG, 'clipPath');
      clipPath.id = `idle-${instance}-gap-${index}`;
      clipPath.dataset.idleClip = '';
      clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
      const clip = document.createElementNS(SVG, 'rect');
      clip.setAttribute('x', '-2000'); clip.setAttribute('width', '6000'); clip.setAttribute('height', '6000');
      clipPath.append(clip); defs.append(clipPath);
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('clip-path', `url(#${clipPath.id})`);
      group.setAttribute('pointer-events', 'none');
      group.dataset.idleFlow = String(index);
      flowLayer.append(group);
      return {
        group, clip, bottom: front[2].y, depth: { x: backLeft.x - frontLeft.x, y: backLeft.y - frontLeft.y },
        x0: Math.max(front[3].x, frontLeft.x) + 3, x1: Math.min(front[2].x, frontRight.x) - 3,
        landFront: frontLeft.y, rate: data[index].value / data[0].value, carry: 0,
      };
    });
    // Hand-drawn shading: individual strokes appear at random near each front face's lower-right corner,
    // draw in, hold, then erase, so the shading is always present but never static.
    const screenAngle = scene.patternAngle ?? -45;
    // Layered mix adds each further direction only closer to the corner, building tone the way hand cross-hatching does.
    const strokeDirection = (h: IdleMotionValues['hatch'], closeness: number, cross: boolean) => {
      const count = cross ? Math.max(2, Math.round(h.directions)) : Math.max(1, Math.round(h.directions)), step = cross ? 90 : h.angleStep;
      const allowed = h.mix === 'layered' ? 1 + [...Array(count - 1).keys()].filter(k => closeness > (k + 1) / count * .85).length : count;
      const angle = (screenAngle + Math.floor(rand() * allowed) * step + (rand() * 2 - 1) * h.jitter) * Math.PI / 180;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    };
    const frontHeight = (group: SVGGElement, index: number) => {
      const front = points(group.querySelector(`[data-stage-front="${data[index].id}"]`)?.getAttribute('d') ?? null);
      return front[2].y - front[0].y;
    };
    // Each face's screen is read from its pattern fill, so hand marks sit on the real grid pitch and dot radius.
    const screenOf = (face: Element | null): Screen => {
      const id = /url\(#([^)]+)\)/.exec(face?.getAttribute('fill') ?? '')?.[1] ?? '';
      const pattern = id ? svg.querySelector(`pattern[id="${id}"]`) : null;
      return { type: id.slice(id.lastIndexOf('-') + 1), size: Number(pattern?.getAttribute('width') ?? 3),
        radius: Number(pattern?.querySelector('circle')?.getAttribute('r') ?? 0) };
    };
    const halftone = screenOf(svg.querySelector('[fill$="-am)"]'));
    const halftoneSize = halftone.type === 'am' ? halftone.size : 3;
    const corners: Corner[] = stages.map((stage, index) => {
      const frontFace = stage.querySelector(`[data-stage-front="${data[index].id}"]`), sideFace = stage.querySelector('[data-face="side"]');
      const front = points(frontFace?.getAttribute('d') ?? null), side = points(sideFace?.getAttribute('d') ?? null);
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('pointer-events', 'none');
      group.dataset.idleHatch = String(index);
      group.id = `idle-${instance}-hatch-${index}`;
      stage.insertBefore(group, stage.querySelector('[data-stage-outline]'));
      return { group, corner: front[2], front, side, frontScreen: screenOf(frontFace), sideScreen: screenOf(sideFace),
        scale: frontHeight(stage, index) / frontHeight(stages[0], 0), carry: 0 };
    });
    const marks: HandMark[] = [];
    const isStipple = (screen: Screen) => screen.type === 'dense' || screen.type === 'sparse';
    const isGrid = (screen: Screen) => screen.type === 'am' || screen.type === 'coarse';
    const timing = (h: IdleMotionValues['hatch'], drawScale = 1) => ({ draw: h.drawTime * drawScale * (.7 + rand() * .6),
      hold: h.hold * 1000 * (.5 + rand()), erase: h.eraseTime * (.7 + rand() * .6) });
    const addDot = (cornerIndex: number, now: number, h: IdleMotionValues['hatch'], at: Point, from: number, to: number) => {
      const node = document.createElementNS(SVG, 'circle');
      node.setAttribute('cx', at.x.toFixed(2)); node.setAttribute('cy', at.y.toFixed(2)); node.setAttribute('r', '0');
      node.setAttribute('fill', INK);
      corners[cornerIndex].group.append(node);
      marks.push({ node, kind: 'dot', corner: cornerIndex, born: now, from, to, ...timing(h, .5) });
    };
    const spawnMark = (cornerIndex: number, now: number, h: IdleMotionValues['hatch']) => {
      const target = corners[cornerIndex], reach = h.reach * target.scale;
      for (let attempt = 0; attempt < 12; attempt++) {
        const distance = reach * rand() ** 1.6, direction = Math.PI * (1 + rand() * (h.sideFace ? 1 : .5));
        const p = { x: target.corner.x + Math.cos(direction) * distance, y: target.corner.y + Math.sin(direction) * distance };
        const polygon = inside(target.front, p) ? target.front : h.sideFace && inside(target.side, p) ? target.side : null;
        if (!polygon) continue;
        const closeness = 1 - distance / reach, screen = polygon === target.front ? target.frontScreen : target.sideScreen;
        if (h.style === 'halftone' && !isGrid(screen)) {
          // Halftone style inks new dots on the AM grid, growing toward the corner like a halftone gradient.
          const size = halftoneSize, at = { x: (Math.floor(p.x / size) + .5) * size, y: (Math.floor(p.y / size) + .5) * size };
          if (!inside(polygon, at)) continue;
          addDot(cornerIndex, now, h, at, 0, h.halftoneDotSize * (.3 + .7 * closeness));
          return;
        }
        if (h.style === 'match' && isStipple(screen)) {
          addDot(cornerIndex, now, h, p, 0, h.stippleSize * (.75 + rand() * .5));
          return;
        }
        if (h.style !== 'lines' && isGrid(screen)) {
          const { size, radius } = screen;
          // Halftone style scales every grid mark by its dot size; Match screen keeps the screen's own proportions.
          const scale = h.style === 'halftone' ? h.halftoneDotSize / (halftoneSize * .52) : 1;
          if (radius < size * .45) {
            // Open halftone: swell the real grid dot toward touching its neighbours.
            const at = { x: (Math.floor(p.x / size) + .5) * size, y: (Math.floor(p.y / size) + .5) * size };
            if (!inside(polygon, at)) continue;
            addDot(cornerIndex, now, h, at, radius, radius + Math.max(0, size * .52 * scale - radius) * (.35 + .65 * closeness));
          } else {
            // Closed halftone: dots already overlap, so ink the paper gap at the cell corner instead.
            const at = { x: Math.round(p.x / size) * size, y: Math.round(p.y / size) * size };
            if (!inside(polygon, at)) continue;
            addDot(cornerIndex, now, h, at, 0, (size * Math.SQRT1_2 - radius + .3) * scale * (.6 + .6 * closeness));
          }
          return;
        }
        const hatchDirection = strokeDirection(h, closeness, h.style === 'match' && screen.type === 'cross');
        const [low, high] = chord(polygon, p, hatchDirection);
        const length = Math.min(high - low, 2 + (reach * .8) * closeness * (.5 + rand() * .5));
        const start = Math.max(low + .4, Math.min(-length / 2, high - .4 - length)), end = Math.min(high - .4, start + length);
        if (end - start < 1.5) continue;
        const [a, b] = rand() < .5 ? [start, end] : [end, start];
        const node = document.createElementNS(SVG, 'path');
        node.setAttribute('d', `M ${(p.x + hatchDirection.x * a).toFixed(2)} ${(p.y + hatchDirection.y * a).toFixed(2)} L ${(p.x + hatchDirection.x * b).toFixed(2)} ${(p.y + hatchDirection.y * b).toFixed(2)}`);
        node.setAttribute('pathLength', '1');
        node.setAttribute('fill', 'none'); node.setAttribute('stroke', INK); node.setAttribute('stroke-linecap', 'round');
        node.setAttribute('stroke-dasharray', '0 2');
        target.group.append(node);
        marks.push({ node, kind: 'line', corner: cornerIndex, born: now, from: 0, to: 1, ...timing(h) });
        return;
      }
    };
    const dots: Dot[] = [];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let intensity = 1, last = performance.now(), clock = 0, frame = 0;

    // Motion keeps playing while a stage is inspected. Hover hides the inspected stage and shows an enlarged copy,
    // so the copy floats with its stage and mirrors the live corner marks through a <use> reference.
    const mirror = (focus: SVGGElement | null, id: string, before: Element | null) => {
      if (!focus) return;
      const use = document.createElementNS(SVG, 'use');
      use.setAttribute('href', `#${id}`);
      use.dataset.idleMirror = '';
      focus.insertBefore(use, before);
    };
    focusGroups.forEach((focus, index) => {
      mirror(focus, `idle-${instance}-hatch-${index}`, focus?.querySelector('[data-stage-outline]') ?? null);
    });
    // The inspected stage is drawn by its enlarged focus copy; every other stage by its own group.
    const shown = (index: number) => focusGroups[index]?.hasAttribute('data-visible') ? focusGroups[index]! : stages[index];
    const matrixOf = (element: SVGGraphicsElement, offset: Point): Matrix => {
      const root = svg.getScreenCTM?.(), own = element.getScreenCTM?.();
      if (!root || !own) return { a: 1, b: 0, c: 0, d: 1, e: offset.x, f: offset.y };
      const { a, b, c, d, e, f } = root.inverse().multiply(own);
      return { a, b, c, d, e, f };
    };
    const apply = (m: Matrix, x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });

    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const m = motion.current!;
      const goal = reduced.matches ? 0 : 1;
      intensity += (goal - intensity) * (1 - Math.exp(-dt / (goal ? .45 : .12)));
      clock += dt;
      const offsets = stages.map((group, index) => {
        if (!m.island.enabled) return { x: 0, y: 0 };
        const phase = (clock - index * m.island.stagger) / m.island.cycle * Math.PI * 2;
        return {
          x: m.island.sideShift * Math.sin(phase * .73 + 1.3) * intensity,
          y: -m.island.lift * Math.sin(phase) * intensity,
        };
      });
      stages.forEach((group, index) => {
        const { x, y } = offsets[index], translate = x || y ? `${x.toFixed(3)}px ${y.toFixed(3)}px` : '';
        group.style.translate = translate;
        if (focusGroups[index]) focusGroups[index]!.style.translate = translate;
      });
      const flowing = gaps.length > 0 && (m.flow.enabled || dots.length > 0);
      const placed = flowing ? stages.map((_, index) => shown(index)) : [];
      const matrices = placed.map((element, index) => matrixOf(element, offsets[index]));
      const opacities = placed.map(element => Number(window.getComputedStyle(element).opacity || 1));
      const hatch = m.hatch, life = hatch.drawTime + hatch.hold * 1000 + hatch.eraseTime;
      corners.forEach((corner, index) => {
        corner.group.setAttribute('opacity', Math.min(1, intensity * 1.5).toFixed(3));
        if (!hatch.enabled || intensity < .5) { corner.carry = 0; return; }
        const density = hatch.style === 'halftone' ? hatch.halftoneDensity
          : hatch.style === 'match' && isStipple(corner.frontScreen) ? hatch.stippleDensity : 1;
        const wanted = hatch.strokes * corner.scale * density, live = marks.filter(mark => mark.corner === index).length;
        corner.carry += wanted / (life / 1000) * dt;
        while (corner.carry >= 1) { corner.carry -= 1; if (live < wanted * 1.3) spawnMark(index, now, hatch); }
      });
      const ease = (t: number) => 1 - (1 - t) ** 3;
      for (let index = marks.length - 1; index >= 0; index--) {
        const mark = marks[index], age = now - mark.born;
        const drawn = ease(Math.min(1, age / mark.draw));
        const erased = ease(Math.max(0, Math.min(1, (age - mark.draw - mark.hold) / mark.erase)));
        if (erased >= 1 || (!hatch.enabled && intensity < .02)) { mark.node.remove(); marks.splice(index, 1); continue; }
        if (mark.kind === 'line') {
          mark.node.setAttribute('stroke-dasharray', `0 ${erased.toFixed(4)} ${Math.max(0, drawn - erased).toFixed(4)} 2`);
          mark.node.setAttribute('stroke-width', String(hatch.weight));
        } else {
          mark.node.setAttribute('r', (mark.from + (mark.to - mark.from) * drawn * (1 - erased)).toFixed(3));
        }
      }
      gaps.forEach((gap, index) => {
        if (flowing) {
          gap.clip.setAttribute('y', String(apply(matrices[index], 0, gap.bottom).y));
          gap.group.setAttribute('opacity', Math.max(opacities[index], opacities[index + 1]).toFixed(3));
        }
        if (!m.flow.enabled || intensity < .5) { gap.carry = 0; return; }
        gap.carry += m.flow.dotRate * gap.rate * dt;
        while (gap.carry >= 1) {
          gap.carry -= 1;
          const depth = .08 + rand() * .84, across = gap.x0 + rand() * Math.max(0, gap.x1 - gap.x0);
          const node = document.createElementNS(SVG, 'circle');
          node.setAttribute('fill', INK);
          gap.group.append(node);
          dots.push({ node, gap: index, x: across + gap.depth.x * depth, from: gap.bottom + gap.depth.y * depth,
            to: gap.landFront + gap.depth.y * depth, born: now, fall: m.flow.fallTime });
        }
      });
      for (let index = dots.length - 1; index >= 0; index--) {
        const dot = dots[index], age = now - dot.born, fade = 180;
        const progress = Math.min(1, age / dot.fall);
        const opacity = age < dot.fall ? 1 : 1 - (age - dot.fall) / fade;
        if (opacity <= 0 || (intensity < .02 && !m.flow.enabled)) { dot.node.remove(); dots.splice(index, 1); continue; }
        const start = apply(matrices[dot.gap], dot.x, dot.from), end = apply(matrices[dot.gap + 1], dot.x, dot.to);
        dot.node.setAttribute('cx', (start.x + (end.x - start.x) * progress).toFixed(2));
        dot.node.setAttribute('cy', (start.y + (end.y - start.y) * progress * progress).toFixed(2));
        dot.node.setAttribute('r', (m.flow.dotSize * matrices[dot.gap + 1].a).toFixed(3));
        dot.node.setAttribute('opacity', (opacity * Math.min(1, intensity * 1.5)).toFixed(3));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const visibility = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      stages.forEach(group => { group.style.translate = ''; });
      focusGroups.forEach(focus => { if (focus) focus.style.translate = ''; });
      svg.querySelectorAll(`[data-idle-mirror]`).forEach(use => { if (use.getAttribute('href')?.startsWith(`#idle-${instance}-`)) use.remove(); });
      corners.forEach(corner => corner.group.remove());
      flowLayer.remove();
      defs.querySelectorAll(`[id^="idle-${instance}-gap-"]`).forEach(node => node.remove());
    };
  }, [root, motion, scene]);
}

/** The shared Idle motion DialKit panel. Values persist under one id, so the lab and the prototype page stay in step. */
export function useIdleMotionPanel(): RefObject<IdleMotionValues> {
  const dial = useDialKitController('Idle motion', {
    island: {
      enabled: true,
      lift: [1.5, 0, 16, 0.1],
      sideShift: [2, 0, 24, 0.1],
      cycle: [6, 1, 20, 0.1],
      stagger: [1.2, 0, 4, 0.05],
    },
    flow: {
      enabled: true,
      fallTime: [540, 120, 3000, 10],
      dotRate: [8, 0, 60, 1],
      dotSize: [1, 0.3, 3, 0.05],
    },
    hatch: {
      enabled: true,
      strokes: [40, 0, 120, 1],
      reach: [36, 6, 120, 1],
      weight: [0.5, 0.2, 2, 0.05],
      drawTime: [420, 60, 3000, 10],
      hold: [2.5, 0, 12, 0.1],
      eraseTime: [520, 60, 3000, 10],
      sideFace: false,
      directions: [2, 1, 4, 1],
      angleStep: [50, 5, 90, 1],
      jitter: [6, 0, 30, 1],
      mix: { type: 'select', options: [
        { value: 'layered', label: 'Layered' },
        { value: 'mixed', label: 'Mixed' },
      ], default: 'layered' },
      style: { type: 'select', options: [
        { value: 'halftone', label: 'Halftone' },
        { value: 'match', label: 'Match screen' },
        { value: 'lines', label: 'Lines' },
      ], default: 'halftone' },
      halftoneDensity: [2.5, 1, 8, 0.5],
      halftoneDotSize: [1.55, 0.3, 4, 0.05],
      stippleDensity: [4, 1, 12, 0.5],
      stippleSize: [0.45, 0.2, 1.5, 0.05],
    },
    reset: { type: 'action', label: 'Reset' },
  }, { id: 'idle-motion', persist: true, onAction: action => { if (action === 'reset') dial.resetValues(); } });
  const motion = useRef(dial.values as IdleMotionValues);
  motion.current = dial.values as IdleMotionValues;
  return motion;
}
