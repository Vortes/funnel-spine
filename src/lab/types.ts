import type { FunnelOptions, FunnelVariant, Inspection } from '../react/AtlasFunnel';
import type { FunnelData } from '../chart/model';

export type Variant = FunnelVariant;
export type LabOptions = Required<Omit<FunnelOptions, 'mirror' | 'verticalView' | 'verticalViews' | 'isoDepth' | 'isoRotation'>> &
  Pick<FunnelOptions, 'mirror' | 'verticalView' | 'verticalViews' | 'isoDepth' | 'isoRotation'>;
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
export type LabSvg = SVGSVGElement;

export type ParticleStudy = {
  version: 1;
  kind: 'vertical-particles';
  funnel: Omit<LabConfig, 'options' | 'variant'> & {
    variant: 'vertical';
    options: Omit<LabOptions, 'edgeFade' | 'borderRadius'> & Partial<Pick<LabOptions, 'edgeFade' | 'borderRadius'>> & { cornerRadius: number };
  };
  particles: { size: number; count: number; duration: number; drift: number; edgeAngle: number; absorption: number; tension: number; recoil: number };
};
