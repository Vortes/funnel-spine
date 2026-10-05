import { useEffect, useState, type ReactElement } from 'react';
import { stippleImage } from '../../dist/lab/stipple-shader.js';

export interface ScreenDefsProps {
  idPrefix: string;
  width: number;
  height: number;
  density?: number;
  patternAngle?: number;
  dotGain?: number;
  roughness?: number;
  seed?: number;
  paperGrain?: boolean;
  includeSparse?: boolean;
  stippleScale?: number;
}

const INK = '#2F4FE0';
const PAPER = '#E4E5E8';
const TILE_SIZE = 128;
const renderStipple = stippleImage as (options: {
  type: 'dense' | 'sparse';
  width: number;
  height: number;
  density: number;
  dotGain: number;
  seed: number;
  scale: number;
}) => { url: string; count: number } | null;
const screenTypes = ['dense', 'am', 'hatch', 'cross', 'coarse', 'solid', 'grain'] as const;
type ScreenType = (typeof screenTypes)[number] | 'sparse';

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

interface StippleGroup {
  radius: number;
  d: string;
}

interface StippleField {
  count: number;
  groups: StippleGroup[];
}

const stippleCache = new Map<string, StippleField>();

function stippleField(type: 'dense' | 'sparse', width: number, height: number, pitch: number, seed: number): StippleField {
  const key = [type, width, height, pitch, seed].join('/');
  const cached = stippleCache.get(key);
  if (cached) return cached;

  const baseRadius = (type === 'sparse' ? .42 : .62) * (pitch / 6);
  const coverage = type === 'sparse' ? .025 : .28;
  const count = Math.round(width * height * coverage / (Math.PI * baseRadius * baseRadius));
  const random = seededRandom(seed + (type === 'dense' ? 104729 : 0));
  const groups = Array.from({ length: 6 }, (_, index) => ({ radius: baseRadius * (.8 + index * .08), commands: [] as string[] }));

  for (let index = 0; index < count; index++) {
    const x = (random() * width).toFixed(2);
    const y = (random() * height).toFixed(2);
    groups[Math.floor(random() * groups.length)].commands.push(`M${x} ${y}h.01`);
  }

  const field = { count, groups: groups.map(({ radius, commands }) => ({ radius, d: commands.join('') })) };
  if (stippleCache.size >= 24) stippleCache.delete(stippleCache.keys().next().value!);
  stippleCache.set(key, field);
  return field;
}

export function ScreenDefs({
  idPrefix,
  width,
  height,
  density = 6,
  patternAngle = -45,
  dotGain = .03,
  roughness = .15,
  seed = 1234,
  includeSparse = false,
  stippleScale = 2,
}: ScreenDefsProps): ReactElement {
  const pitch = Math.max(3, Math.min(14, density));
  const gain = Math.max(-.8, Math.min(.2, dotGain));
  const types: readonly ScreenType[] = includeSparse ? [...screenTypes, 'sparse'] : screenTypes;
  const imageKey = [width, height, pitch, dotGain, seed, includeSparse, stippleScale].join('/');
  const [images, setImages] = useState<{
    key: string;
    dense?: { url: string; count: number };
    sparse?: { url: string; count: number };
  } | null>(null);

  useEffect(() => {
    const dense = renderStipple({ type: 'dense', width, height, density: pitch, dotGain, seed, scale: stippleScale });
    const sparse = includeSparse ? renderStipple({ type: 'sparse', width, height, density: pitch, dotGain, seed, scale: stippleScale }) : null;
    if (dense || sparse) setImages({ key: imageKey, dense: dense ?? undefined, sparse: sparse ?? undefined });
  }, [imageKey, width, height, pitch, dotGain, seed, includeSparse, stippleScale]);

  return <defs>
    {types.map((type, index) => {
      const stochastic = type === 'dense' || type === 'sparse';
      const size = type === 'coarse' ? pitch * 1.8 : type === 'grain' ? 128 : pitch;
      const image = stochastic && images?.key === imageKey ? images[type] : undefined;
      const patternWidth = stochastic ? image ? width : Math.min(width, TILE_SIZE) : size;
      const patternHeight = stochastic ? image ? height : Math.min(height, TILE_SIZE) : size;
      const random = seededRandom(seed + index * 104729);
      const field = stochastic && !image ? stippleField(type, patternWidth, patternHeight, pitch, seed) : null;
      const patternTransform = type === 'hatch' || type === 'cross' ? `rotate(${patternAngle})` : undefined;

      return <pattern
        key={type}
        id={`${idPrefix}-${type}`}
        width={patternWidth}
        height={patternHeight}
        patternUnits="userSpaceOnUse"
        patternTransform={patternTransform}
        data-dot-count={image?.count ?? field?.count}
        data-stipple-renderer={image ? 'shader' : field ? 'vector' : undefined}
      >
        <rect width={patternWidth} height={patternHeight} fill={PAPER} />
        {image && <image width={patternWidth} height={patternHeight} href={image.url} preserveAspectRatio="none" />}
        {field?.groups.map((group, groupIndex) => <path
          key={groupIndex}
          d={group.d}
          fill="none"
          stroke={INK}
          strokeWidth={group.radius * 2 * (1 + gain)}
          strokeLinecap="round"
        />)}
        {(type === 'am' || type === 'coarse') && <circle
          cx={size / 2}
          cy={size / 2}
          r={size * Math.sqrt((type === 'am' ? .3 : .7) / Math.PI) * (1 + dotGain)}
          fill={INK}
        />}
        {type === 'hatch' && <path d={`M 0 ${size / 2} H ${size}`} stroke={INK} strokeWidth={size * .5 * (1 + dotGain)} />}
        {type === 'cross' && <path
          d={`M 0 ${size / 2} H ${size} M ${size / 2} 0 V ${size}`}
          stroke={INK}
          strokeWidth={size * (1 - Math.sqrt(.5)) * (1 + dotGain)}
        />}
        {type === 'solid' && <>
          <rect width={size} height={size} fill={INK} />
          {roughness > 0 && Array.from({ length: 3 }, (_, pointIndex) => <circle
            key={pointIndex}
            cx={random() * size}
            cy={random() * size}
            r={roughness * .6}
            fill={PAPER}
          />)}
        </>}
        {type === 'grain' && Array.from({ length: 190 }, (_, pointIndex) => <circle
          key={pointIndex}
          cx={random() * size}
          cy={random() * size}
          r={.08 + random() * .09}
          fill={INK}
        />)}
      </pattern>;
    })}
    {roughness > 0 && <filter
      id={`${idPrefix}-edge`}
      x="-5%"
      y="-5%"
      width="110%"
      height="110%"
      colorInterpolationFilters="sRGB"
    >
      <feTurbulence type="fractalNoise" baseFrequency=".28" numOctaves={2} seed={seed % 9997} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={roughness} xChannelSelector="R" yChannelSelector="G" />
    </filter>}
  </defs>;
}
