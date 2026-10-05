import { screenTypes } from './screens.js';

export const ranges = {
  density: [3, 14], strokeWidth: [.25, .75], patternAngle: [-90, 90],
  dotGain: [-.8, .2], roughness: [0, .6], fontSize: [12, 18],
  curve: [.1, .8], chartHeight: [120, 265], edgeFade: [0, .45],
  stageHeight: [250, 330], stageGap: [0, 20], capCurve: [0, 20],
  borderRadius: [0, 20], tailRatio: [.15, 1], isoDepth: [18, 200],
  isoRotation: [-45, 45], nodeGap: [28, 85],
  nodeWidth: [1, 6],
};

export const defaultOptions = {
  texture: 'mixed', density: 6, strokeWidth: .5, patternAngle: -45,
  dotGain: .03, roughness: .15, paperGrain: false, fontSize: 14,
  labels: true, guides: true, curve: .5, chartHeight: 235, edgeFade: 0,
  stageHeight: 310, stageGap: 9, capCurve: 12, borderRadius: 0,
  tailRatio: .65, nodeGap: 66, nodeWidth: 2.5,
};

export const verticalControlKeys = [
  'texture', 'density', 'strokeWidth', 'patternAngle', 'dotGain',
  'roughness', 'fontSize', 'labels', 'paperGrain', 'stageHeight',
  'stageGap', 'capCurve', 'borderRadius', 'tailRatio', 'isoDepth',
  'isoRotation',
];

export const verticalSettings = options => Object.fromEntries(
  verticalControlKeys.map(key => [key, options[key]]),
);

function validateOption(key, value) {
  if (Object.hasOwn(ranges, key)) {
    const [min, max] = ranges[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}.`);
    }
  } else if (key === 'texture') {
    if (!['mixed', ...screenTypes].includes(value)) throw new Error('Choose a supported screen pattern.');
  } else if (['labels', 'guides', 'paperGrain', 'mirror'].includes(key)) {
    if (typeof value !== 'boolean') throw new Error(`${key} must be true or false.`);
  } else if (key === 'verticalView') {
    if (!['flat', 'isometric'].includes(value)) throw new Error('Choose a flat or isometric vertical view.');
  } else {
    return false;
  }
  return true;
}

export function normalizeOptions(input = {}, base = defaultOptions, { strict = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Options must be an object.');
  }
  const options = { ...base };
  for (const [key, value] of Object.entries(input)) {
    if (key === 'verticalViews') continue;
    if (!validateOption(key, value)) {
      if (!strict) continue;
      throw new Error(`Unknown funnel option: ${key}.`);
    }
    options[key] = value;
  }
  if (input.verticalViews !== undefined) {
    const views = input.verticalViews;
    if (!views || typeof views !== 'object' || Array.isArray(views) || !views.flat || !views.isometric) {
      throw new Error('Vertical controls need flat and isometric settings.');
    }
    options.verticalViews = {};
    for (const view of ['flat', 'isometric']) {
      const settings = views[view];
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        throw new Error(`${view} controls must be an object.`);
      }
      const resolved = verticalSettings(options);
      for (const [key, value] of Object.entries(settings)) {
        if (!verticalControlKeys.includes(key)) {
          if (strict) throw new Error(`Unknown ${view} control: ${key}.`);
          continue;
        }
        try { validateOption(key, value); }
        catch (error) { throw new Error(`${view} ${error.message}`); }
        resolved[key] = value;
      }
      options.verticalViews[view] = resolved;
    }
    Object.assign(options, options.verticalViews[options.verticalView ?? 'flat']);
  }
  return options;
}
