import type { FunnelData, FunnelOptions, FunnelVariant, Inspection } from '../../dist/react/atlas-funnel';

export type Variant = FunnelVariant;
export type LabOptions = Required<FunnelOptions>;
export type LabConfig = {
  version: 3;
  variant: Variant;
  seed: number;
  dataOrigin: 'seed' | 'custom';
  options: LabOptions;
  data: FunnelData;
};
export type SavedConfig = { name: string; config: LabConfig };
export type PathInfo = Inspection;
export type LabPath = SVGPathElement & { atlasInfo: PathInfo; atlasEmphasis?: SVGPathElement };
export type LabSvg = SVGSVGElement & {
  atlasLayout?: { links: { id: string; source: string; target: string }[] };
  atlasClearPull?: () => void;
  atlasHighlightedKey?: string | null;
};

export type ParticleStudy = {
  version: 1;
  kind: 'vertical-particles';
  funnel: Omit<LabConfig, 'options' | 'variant'> & {
    variant: 'vertical';
    options: Omit<LabOptions, 'edgeFade' | 'borderRadius'> & Partial<Pick<LabOptions, 'edgeFade' | 'borderRadius'>> & { cornerRadius: number };
  };
  particles: { size: number; count: number; duration: number; drift: number; edgeAngle: number; absorption: number; tension: number; recoil: number };
};
