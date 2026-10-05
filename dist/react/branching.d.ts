import type { ChartModel, ChartOptions, FunnelGraph, GraphLayout } from './model.js';
export declare function layoutGraph(data: FunnelGraph, { nodeGap, nodeWidth }?: Pick<ChartOptions, 'nodeGap' | 'nodeWidth'>): GraphLayout;
export declare function branchingModel(data: FunnelGraph, options?: ChartOptions): ChartModel;
