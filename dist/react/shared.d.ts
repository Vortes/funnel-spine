import type { ChartModel, Pattern, Screen } from './model.js';
export declare const screenTypes: Exclude<Screen, 'mixed'>[];
export declare const fmt: (n: number) => string;
export declare const pct: (n: number, d: number) => string;
export declare function createModel(variant: ChartModel['variant'], width: number, height: number): ChartModel;
export declare function createMarkHelpers(model: ChartModel, texture: Screen): {
    marks: import("./model.js").ChartMark[];
    addText: (key: string, x: number, y: number, value: string, size?: number, anchor?: "start" | "end") => number;
    addLine: (key: string, x1: number, y1: number, x2: number, y2: number, strokeWidth?: number, dash?: string, baseline?: boolean) => number;
    chooseScreen: (i: number, neighbors?: number[]) => Pattern;
};
