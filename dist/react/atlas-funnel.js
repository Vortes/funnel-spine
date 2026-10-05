'use client';

import { createElement, forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { validateData } from '../core/data.js';
import { layoutGraph, renderFunnel } from '../lab/lab-engine.js';
import { normalizeOptions } from '../lab/options.js';
import { INK, PAPER } from '../lab/screens.js';

const emptyOptions = Object.freeze({});

function pathByKey(svg, key) {
  if (key == null) return undefined;
  return [...svg.querySelectorAll('[data-key]')].find(path => path.atlasInfo.key === key);
}

function highlight(svg, activeKey, selectedKey) {
  if (!svg) return;
  const active = activeKey == null ? null : pathByKey(svg, activeKey)?.atlasInfo;
  const linked = new Set();
  if (active?.kind === 'link' && svg.atlasLayout) {
    const links = svg.atlasLayout.links;
    const walk = (id, upstream, seen = new Set()) => {
      if (seen.has(id)) return;
      seen.add(id);
      for (const link of links) {
        if (upstream ? link.target === id : link.source === id) {
          linked.add(link.id);
          walk(upstream ? link.source : link.target, upstream, seen);
        }
      }
    };
    linked.add(active.key);
    walk(active.source, true);
    walk(active.target, false);
  }
  svg.querySelectorAll('[data-key]').forEach(path => {
    const visible = !active || (active.kind === 'link' ? linked.has(path.atlasInfo.key) : path.atlasInfo.key === active.key);
    path.setAttribute('fill', visible ? path.getAttribute('data-base-fill') : PAPER);
    if (visible) path.removeAttribute('stroke-dasharray');
    else path.setAttribute('stroke-dasharray', '2 4');
    path.setAttribute('aria-pressed', String(path.atlasInfo.key === selectedKey));
  });
}

export const AtlasFunnel = forwardRef(function AtlasFunnel({
  data,
  variant = 'continuous',
  options = emptyOptions,
  seed = 1234,
  selectedKey,
  defaultSelectedKey = null,
  onSelectionChange,
  onInspect,
  style,
  ...rootProps
}, ref) {
  const optionSignature = JSON.stringify(normalizeOptions(options));
  // Renderer options are primitives; this keeps inline objects stable across parent renders.
  const validOptions = useMemo(() => JSON.parse(optionSignature), [optionSignature]);
  const validData = useMemo(() => {
    validateData(data, variant);
    if (variant === 'branching') layoutGraph(data, validOptions);
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
      throw new Error('Seed must be an integer between 0 and 4294967295.');
    }
    return data;
  }, [data, variant, validOptions, seed]);

  const reactId = useId();
  const idPrefix = `atlas-${reactId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hoverRef = useRef(null);
  const callbacksRef = useRef({ onSelectionChange, onInspect });
  const [internalKey, setInternalKey] = useState(defaultSelectedKey);
  const controlled = selectedKey !== undefined;
  const activeKey = controlled ? selectedKey : internalKey;
  const stateRef = useRef({ controlled, activeKey });
  callbacksRef.current = { onSelectionChange, onInspect };
  stateRef.current = { controlled, activeKey };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = renderFunnel(validData, { ...validOptions, variant, seed, idPrefix });
    svg.style.display = 'block';
    svg.style.height = 'auto';
    svgRef.current = svg;
    hoverRef.current = null;
    container.replaceChildren(svg);
    const resolvedKey = () => pathByKey(svg, stateRef.current.activeKey) ? stateRef.current.activeKey : null;

    svg.querySelectorAll('[data-key]').forEach(path => {
      const info = path.atlasInfo;
      path.style.cursor = 'pointer';
      const preview = () => {
        if (resolvedKey() != null) return;
        hoverRef.current = info.key;
        highlight(svg, info.key, null);
        callbacksRef.current.onInspect?.(info);
      };
      const leave = () => {
        if (hoverRef.current !== info.key) return;
        hoverRef.current = null;
        highlight(svg, resolvedKey(), resolvedKey());
        callbacksRef.current.onInspect?.(null);
      };
      const select = () => {
        const next = resolvedKey() === info.key ? null : info.key;
        if (!stateRef.current.controlled) {
          stateRef.current.activeKey = next;
          setInternalKey(next);
        }
        callbacksRef.current.onSelectionChange?.(next, next === null ? null : info);
      };
      path.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') preview(); });
      path.addEventListener('pointerleave', leave);
      path.addEventListener('focus', () => {
        path.style.outline = `2px solid ${INK}`;
        path.style.outlineOffset = '2px';
        preview();
      });
      path.addEventListener('blur', () => {
        path.style.removeProperty('outline');
        path.style.removeProperty('outline-offset');
        leave();
      });
      path.addEventListener('click', select);
      path.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        } else if (event.key === 'Escape' && resolvedKey() != null) {
          event.preventDefault();
          if (!stateRef.current.controlled) {
            stateRef.current.activeKey = null;
            setInternalKey(null);
          }
          callbacksRef.current.onSelectionChange?.(null, null);
        }
      });
    });
    highlight(svg, resolvedKey(), resolvedKey());
    return () => {
      svgRef.current = null;
      svg.remove();
    };
  }, [validData, variant, validOptions, seed, idPrefix]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const resolved = pathByKey(svg, activeKey) ? activeKey : null;
    highlight(svg, resolved ?? hoverRef.current, resolved);
  }, [activeKey]);

  const setContainer = useCallback(node => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  return createElement('div', {
    ...rootProps,
    ref: setContainer,
    style: { display: 'block', ...style },
  });
});
