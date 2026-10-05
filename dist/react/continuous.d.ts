import type { ChartModel, ChartOptions, Stage } from './model.js';
export declare function edgeFadeStops(fade: number, side?: 'left' | 'right' | 'both'): [number, number][];
export declare function continuousModel(stageData: readonly Stage[], options?: ChartOptions): ChartModel;
