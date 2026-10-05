import type { ChartModel, ChartOptions, Stage } from './model.js';
export declare function verticalRimGeometry(data: readonly Stage[], { stageHeight, stageGap, tailRatio, borderRadius }?: Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'borderRadius'>): {
    widths: number[];
    radii: number[];
};
export declare function verticalContainerGeometry(data: readonly Stage[], options: Required<Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'capCurve' | 'borderRadius'>>, index: number): {
    path: string;
    y: number;
    bottom: number;
    height: number;
    width: number;
    lowerWidth: number;
    radius: number;
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
};
export declare function isometricStageGeometry(data: readonly Stage[], { stageHeight, stageGap, tailRatio, isoDepth, isoRotation, borderRadius }?: Pick<ChartOptions, 'stageHeight' | 'stageGap' | 'tailRatio' | 'isoDepth' | 'isoRotation' | 'borderRadius'>): {
    key: string;
    y: number;
    bottom: number;
    right: number;
    outerRight: number;
    topWidth: number;
    bottomWidth: number;
    outline: string;
    front: string;
    top: string;
    side: string;
}[];
export declare function verticalModel(stageData: readonly Stage[], options?: ChartOptions): ChartModel;
