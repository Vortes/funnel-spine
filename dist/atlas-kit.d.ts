export type Stage = { id: string; label: string; value: number };
export type FunnelGraph = { nodes: { id: string; label: string }[]; links: { source: string; target: string; value: number }[] };
export type FunnelData = Stage[] | FunnelGraph;
export type FunnelOptions = { variant?: 'continuous' | 'vertical' | 'branching'; texture?: 'mixed' | 'hatch' | 'stipple' | 'cross' | 'solid'; density?: number; strokeWidth?: number; color?: string; labels?: boolean; curve?: number; idPrefix?: string };
export type Inspection = { label: string; value: number; denominator: number; total: number; kind: 'link' | 'stage'; source?: string; target?: string };
export declare const stages: Stage[];
export declare const graph: FunnelGraph;
export declare function validateData(data: FunnelData, variant?: FunnelOptions['variant']): FunnelData;
export type LayoutNode = { id: string; label: string; level: number; value: number; x: number; y: number; height: number; incoming: LayoutLink[]; outgoing: LayoutLink[] };
export type LayoutLink = { id: string; source: string; target: string; value: number; sourceNode: LayoutNode; targetNode: LayoutNode; sy: number; ty: number; width: number };
export declare function layoutGraph(data: FunnelGraph): {nodes: LayoutNode[]; links: LayoutLink[]; total: number};
export declare function renderFunnel(data: FunnelData, options?: FunnelOptions): SVGSVGElement;
export declare class AtlasFunnel extends HTMLElement { data: FunnelData; options: FunnelOptions; update(data: FunnelData, options?: FunnelOptions): void; select(info: Inspection | null): void; clearSelection(): void; exportSVG(): string; }
