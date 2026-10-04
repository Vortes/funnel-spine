'use client';
import { createElement, useEffect, useRef } from 'react';
import type { AtlasFunnel as Element, FunnelData, FunnelOptions, Inspection } from './atlas-kit.js';
export type AtlasFunnelProps = FunnelOptions & { data: FunnelData; className?: string; onInspect?: (detail: Inspection) => void; onSelect?: (detail: Inspection | null) => void };
export function AtlasFunnel({ data, className, onInspect, onSelect, ...options }: AtlasFunnelProps) {
 const ref = useRef<Element>(null);
 useEffect(() => { let cancelled=false; import('./atlas-kit.js').then(() => { if(!cancelled && ref.current){ref.current.update(data,options);} }); return ()=>{cancelled=true;}; }, [data, options.variant, options.texture, options.density, options.strokeWidth, options.color, options.labels, options.curve]);
 useEffect(() => { const el=ref.current;if(!el)return;const inspect=(e: Event)=>onInspect?.((e as CustomEvent<Inspection>).detail);const select=(e: Event)=>onSelect?.((e as CustomEvent<Inspection | null>).detail);el.addEventListener('atlas-inspect',inspect);el.addEventListener('atlas-select',select);return ()=>{el.removeEventListener('atlas-inspect',inspect);el.removeEventListener('atlas-select',select);}; },[onInspect,onSelect]);
 return createElement('atlas-funnel', { ref, className });
}
