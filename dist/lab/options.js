import { screenTypes } from './screens.js';

export const ranges = {
  density: [3, 14], strokeWidth: [.25, .75], patternAngle: [-90, 90],
  dotGain: [-.8, .2], roughness: [0, .6], fontSize: [12, 18],
  curve: [.1, .8], chartHeight: [120, 265], edgeFade: [0, .45],
  stageHeight: [250, 330], stageGap: [0, 20], capCurve: [0, 20],
  borderRadius: [0, 20], tailRatio: [.15, 1], nodeGap: [28, 85],
  nodeWidth: [1, 6],
};

export const defaultOptions = {
  texture: 'mixed', density: 6, strokeWidth: .5, patternAngle: -45,
  dotGain: .03, roughness: .15, paperGrain: false, fontSize: 14,
  labels: true, guides: true, curve: .5, chartHeight: 235, edgeFade: 0,
  stageHeight: 310, stageGap: 9, capCurve: 12, borderRadius: 0,
  tailRatio: .65, nodeGap: 66, nodeWidth: 2.5,
};

export function normalizeOptions(input = {}, base = defaultOptions, { strict = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Options must be an object.');
  }
  const options = { ...base };
  for (const [key, value] of Object.entries(input)) {
    if (Object.hasOwn(ranges, key)) {
      const [min, max] = ranges[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${key} must be between ${min} and ${max}.`);
      }
    } else if (key === 'texture') {
      if (!['mixed', ...screenTypes].includes(value)) throw new Error('Choose a supported screen sequence.');
    } else if (['labels', 'guides', 'paperGrain'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`${key} must be true or false.`);
    } else if (strict) {
      throw new Error(`Unknown funnel option: ${key}.`);
    } else {
      continue;
    }
    options[key] = value;
  }
  return options;
}
