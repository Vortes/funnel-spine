import type { ChartModel, Pattern, Screen } from './model.js';

export const screenTypes: Exclude<Screen, 'mixed'>[] = ['dense', 'am', 'hatch', 'cross', 'coarse'];
export const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
export const pct = (n: number, d: number) => d ? `${(100 * n / d).toFixed(1)}%` : '—';

export function createModel(variant: ChartModel['variant'], width: number, height: number): ChartModel {
  return { variant, width, height, marks: [], clips: [], fadeStops: {} };
}

export function createMarkHelpers(model: ChartModel, texture: Screen) {
  const marks = model.marks;
  const addText = (key: string, x: number, y: number, value: string, size = 13, anchor: 'start' | 'end' = 'start') => marks.push({ type: 'text' as const, key, x, y, text: value, fontSize: size, anchor });
  const addLine = (key: string, x1: number, y1: number, x2: number, y2: number, strokeWidth?: number, dash?: string, baseline?: boolean) => marks.push({ type: 'line' as const, key, x1, y1, x2, y2, strokeWidth, dash, baseline });
  const fillTypes: Pattern[] = [];
  const chooseScreen = (i: number, neighbors: number[] = []): Pattern => {
    if (texture !== 'mixed') return texture;
    const used = new Set(neighbors.map(key => fillTypes[key]));
    let type: Pattern = screenTypes[i % screenTypes.length];
    for (let j = 0; j < screenTypes.length; j++) {
      const candidate = screenTypes[(i + j) % screenTypes.length];
      if (!used.has(candidate)) { type = candidate; break; }
    }
    fillTypes[i] = type;
    return type;
  };
  return { marks, addText, addLine, chooseScreen };
}
