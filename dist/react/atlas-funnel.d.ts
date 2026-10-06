import { type HTMLAttributes, type ReactNode } from 'react';
import { type FunnelGraph, type Inspection, type Stage } from './model';
export type { FunnelData, FunnelGraph, FunnelLink, FunnelNode, FunnelVariant, Inspection, Screen, Stage } from './model';
export type VerticalView = 'flat' | 'isometric';
export type VerticalTransition = 'crossfade' | 'overlap' | 'relay' | 'none';
export type FunnelOptions = {
    texture?: 'mixed' | 'dense' | 'am' | 'hatch' | 'cross' | 'coarse';
    density?: number;
    strokeWidth?: number;
    patternAngle?: number;
    dotGain?: number;
    roughness?: number;
    paperGrain?: boolean;
    fontSize?: number;
    labels?: boolean;
    guides?: boolean;
    curve?: number;
    chartHeight?: number;
    edgeFade?: number;
    mirror?: boolean;
    stageHeight?: number;
    stageGap?: number;
    proximityRadius?: number;
    capCurve?: number;
    borderRadius?: number;
    tailRatio?: number;
    verticalView?: VerticalView;
    isoDepth?: number;
    isoRotation?: number;
    verticalViews?: {
        flat: VerticalViewSettings;
        isometric: VerticalViewSettings;
    };
    nodeGap?: number;
    nodeWidth?: number;
};
export type VerticalViewSettings = Partial<Pick<FunnelOptions, 'texture' | 'density' | 'strokeWidth' | 'patternAngle' | 'dotGain' | 'roughness' | 'paperGrain' | 'fontSize' | 'labels' | 'stageHeight' | 'stageGap' | 'capCurve' | 'borderRadius' | 'tailRatio' | 'isoDepth' | 'isoRotation'>>;
type SharedProps = HTMLAttributes<HTMLDivElement> & {
    options?: FunnelOptions;
    seed?: number;
    onInspect?: (inspection: Inspection | null) => void;
    idPrefix?: string;
    viewBox?: string;
    verticalTransition?: VerticalTransition;
    children?: ReactNode;
};
export type AtlasFunnelProps = SharedProps & ({
    variant?: 'continuous';
    data: readonly Stage[];
} | {
    variant: 'vertical';
    data: readonly Stage[];
} | {
    variant: 'branching';
    data: FunnelGraph;
});
export declare const AtlasFunnel: import("react").ForwardRefExoticComponent<AtlasFunnelProps & import("react").RefAttributes<HTMLDivElement>>;
