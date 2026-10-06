import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import { DialRoot, useDialKitController } from 'dialkit';
import { createConfig } from '../../../dist/lab/config.js';
import { AtlasFunnel, type FunnelOptions, type Stage } from '../../react/AtlasFunnel';
import './idle.css';

const config = createConfig('vertical');
const data = config.data as Stage[];
const options = config.options as FunnelOptions;
const SVG = 'http://www.w3.org/2000/svg';
const INK = '#2F4FE0';

type Motion = {
  island: { enabled: boolean; lift: number; sideShift: number; cycle: number; stagger: number };
  flow: { enabled: boolean; fallTime: number; dotRate: number; dotSize: number };
  yieldToHover: boolean;
};
type Point = { x: number; y: number };
type Gap = { group: SVGGElement; clip: SVGRectElement; bottom: number; x0: number; x1: number; depth: Point; landFront: number; rate: number; carry: number };
type Dot = { node: SVGCircleElement; gap: number; x: number; from: number; to: number; born: number; fall: number };

const points = (d: string | null) => {
  const values = (d ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return Array.from({ length: values.length / 2 }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }));
};

function random(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

// Idle motion runs only while nobody is inspecting the prism; intensity eases between 0 and 1 so hand-offs never jump.
function useIdleMotion(root: React.RefObject<HTMLDivElement | null>, motion: React.RefObject<Motion>) {
  useEffect(() => {
    const svg = root.current?.querySelector('svg');
    if (!svg) return;
    const stages = [...svg.querySelectorAll<SVGGElement>('.atlas-vertical-stage')];
    const defs = svg.querySelector('defs') ?? svg.insertBefore(document.createElementNS(SVG, 'defs'), svg.firstChild);
    const rand = random(config.seed);
    const gaps: Gap[] = stages.slice(0, -1).map((source, index) => {
      const target = stages[index + 1];
      const front = points(source.querySelector(`[data-stage-front="${data[index].id}"]`)?.getAttribute('d') ?? null);
      const top = points(target.querySelector('[data-face="top"]')?.getAttribute('d') ?? null);
      const [frontLeft, backLeft, , frontRight] = top;
      const clipPath = document.createElementNS(SVG, 'clipPath');
      clipPath.id = `idle-gap-${index}`;
      clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
      const clip = document.createElementNS(SVG, 'rect');
      clip.setAttribute('x', '-2000'); clip.setAttribute('width', '6000'); clip.setAttribute('height', '6000');
      clipPath.append(clip); defs.append(clipPath);
      const group = document.createElementNS(SVG, 'g');
      group.setAttribute('clip-path', `url(#${clipPath.id})`);
      group.setAttribute('pointer-events', 'none');
      group.dataset.idleFlow = String(index);
      target.append(group);
      return {
        group, clip, bottom: front[2].y, depth: { x: backLeft.x - frontLeft.x, y: backLeft.y - frontLeft.y },
        x0: Math.max(front[3].x, frontLeft.x) + 3, x1: Math.min(front[2].x, frontRight.x) - 3,
        landFront: frontLeft.y, rate: data[index].value / data[0].value, carry: 0,
      };
    });
    const dots: Dot[] = [];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let intensity = 1, last = performance.now(), clock = 0, frame = 0;

    const interacting = () => svg.hasAttribute('data-proximity-active') || svg.hasAttribute('data-pointer-tracking')
      || !!svg.querySelector('[aria-pressed="true"]') || svg.contains(document.activeElement);

    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      const m = motion.current;
      const goal = reduced.matches || (m.yieldToHover && interacting()) ? 0 : 1;
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
        const { x, y } = offsets[index];
        group.style.translate = x || y ? `${x.toFixed(3)}px ${y.toFixed(3)}px` : '';
      });
      gaps.forEach((gap, index) => {
        gap.clip.setAttribute('y', String(gap.bottom + offsets[index].y - offsets[index + 1].y));
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
        dot.node.setAttribute('cx', dot.x.toFixed(2));
        dot.node.setAttribute('cy', (dot.from + (dot.to - dot.from) * progress * progress).toFixed(2));
        dot.node.setAttribute('r', String(m.flow.dotSize));
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
      gaps.forEach(gap => { gap.group.remove(); defs.querySelector(`#idle-gap-${gaps.indexOf(gap)}`)?.remove(); });
    };
  }, [root, motion]);
}

function IdleMotion() {
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
    yieldToHover: true,
    reset: { type: 'action', label: 'Reset' },
  }, { id: 'idle-motion', persist: true, onAction: action => { if (action === 'reset') dial.resetValues(); } });
  const values = dial.values;
  const motion = useRef<Motion>(values as Motion);
  motion.current = values as Motion;
  const figure = useRef<HTMLDivElement>(null);
  useIdleMotion(figure, motion);

  return <main className="idle">
    <header className="idle-header">
      <div><span className="idle-overline">Prototype</span><h1>Idle motion</h1></div>
      <p>Floating island and data flow play while the prism is at rest, then step aside when you inspect a stage.</p>
    </header>
    <section className="idle-figure" aria-label="Vertical funnel with idle motion">
      <AtlasFunnel ref={figure} data={data} variant="vertical" options={options} seed={config.seed} />
    </section>
    <DialRoot position="bottom-right" theme="light" defaultOpen productionEnabled />
  </main>;
}

createRoot(document.getElementById('idle-root')!).render(<IdleMotion />);
