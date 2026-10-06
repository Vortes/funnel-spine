import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { AtlasFunnel } from 'funnel-spine';
import { normalizeOptions } from './dist/lab/options.js';
import { createConfig } from './dist/lab/config.js';
import { validateData } from './dist/core/data.js';

const stages = [
  { id: 'entry', label: 'Entry', value: 100 },
  { id: 'finish', label: 'Finish', value: 40 },
];

const serverChart = renderToString(createElement(AtlasFunnel, { data: stages, options: { roughness: 0 } }));
assert.match(serverChart, /<svg[^>]*viewBox="0 0 900 460"/);
assert.match(serverChart, /data-key="entry"/);
assert.match(serverChart, /<path[^>]*d="M /);
assert.equal(globalThis.document, undefined, 'server rendering must not require a DOM');
assert.throws(() => normalizeOptions({ color: 'red' }), /Unknown funnel option/);
assert.throws(() => normalizeOptions({ constructor: 1 }), /Unknown funnel option/);
assert.throws(() => normalizeOptions({ texture: 'sparse' }), /supported screen pattern/);
assert.throws(() => normalizeOptions({ verticalView: 'sideways' }), /vertical view/);
assert.throws(() => normalizeOptions({ proximityRadius: 241 }), /proximityRadius/);
assert.throws(() => normalizeOptions({ verticalViews: { flat: {}, isometric: { isoDepth: 202 } } }), /isometric isoDepth/);
assert.throws(() => renderToString(createElement(AtlasFunnel, {
  data: stages, variant: 'vertical', options: { verticalView: 'flat', verticalViews: { flat: {}, isometric: { tailRatio: 1 } } },
})), /terminal taper/);
const verticalConfig = createConfig('vertical');
assert.equal(verticalConfig.options.proximityRadius, 20);
assert.equal(normalizeOptions(verticalConfig.options).isoDepth, verticalConfig.options.verticalViews.isometric.isoDepth);
const serverVertical = renderToString(createElement(AtlasFunnel, { data: stages, variant: 'vertical', options: { verticalView: 'isometric', tailRatio: .65 } }));
assert.match(serverVertical, /data-stage-face="entry"/);
assert.throws(() => validateData([{ id: 1, label: 'Bad', value: 10 }, stages[1]]), /unique string id/);

const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLCanvasElement.prototype.getContext = () => null;

const { createRoot } = await import('react-dom/client');
const root = createRoot(document.querySelector('#app'));
const inspected = [];
const options = { roughness: 0 };
let chartRef;
const chartProps = {
  ref: node => { chartRef = node; },
  data: stages,
  className: 'user-chart',
  'data-testid': 'funnel',
  onInspect: info => inspected.push(info?.key ?? null),
};
await act(async () => {
  root.render(createElement(AtlasFunnel, { ...chartProps, options }));
});
assert.equal(chartRef.dataset.testid, 'funnel');
assert.equal(chartRef.className, 'user-chart');
const firstSvg = chartRef.querySelector('svg');
await act(async () => root.render(createElement(AtlasFunnel, { ...chartProps, options: { roughness: 0 } })));
assert.equal(chartRef.querySelector('svg'), firstSvg);
const path = chartRef.querySelector('[data-key="entry"]');
assert(path);
assert.equal(path.getAttribute('aria-pressed'), null);
assert.equal(chartRef.querySelector('.section-emphasis'), null);
await act(async () => path.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true })));
assert.deepEqual(inspected, ['entry']);
await act(async () => path.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(path.getAttribute('aria-pressed'), null);
assert.deepEqual(inspected, ['entry']);
await act(async () => path.dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
assert.equal(inspected.at(-1), null);

const tree = {
  nodes: [{ id: 'root', label: 'Root' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }],
  links: [{ source: 'root', target: 'left', value: 40 }, { source: 'root', target: 'right', value: 60 }],
};
const reordered = { nodes: tree.nodes, links: [...tree.links].reverse() };
const key = 'link:root:left';
const renderTree = data => createElement(AtlasFunnel, {
  data, variant: 'branching', options,
  onInspect: info => inspected.push(info?.key ?? null),
});
await act(async () => root.render(renderTree(tree)));
assert.equal(document.querySelectorAll('#app [data-key]').length, 2);
assert([...document.querySelectorAll('#app [data-key]')].some(node => node.dataset.key === key));
await act(async () => root.render(renderTree(reordered)));
const selectedLink = [...document.querySelectorAll('#app [data-key]')].find(node => node.dataset.key === key);
await act(async () => selectedLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.equal(selectedLink.getAttribute('aria-pressed'), null);
await act(async () => root.render(renderTree(tree)));
await act(async () => document.querySelector('#app [data-key]').dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true })));
assert.equal(inspected.at(-1), 'link:root:left');

await act(async () => root.render(createElement(AtlasFunnel, { data: stages, variant: 'vertical', onInspect: info => inspected.push(info?.key ?? null) })));
assert.equal(document.querySelectorAll('#app [data-stage-face]').length, 0);
await act(async () => root.render(createElement(AtlasFunnel, {
  data: stages, variant: 'vertical', options: { verticalView: 'isometric', tailRatio: .65, proximityRadius: 100 },
  onInspect: info => inspected.push(info?.key ?? null),
})));
await act(async () => document.querySelector('#app [data-key="entry"]').dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true })));
const faces = [...document.querySelectorAll('#app .atlas-vertical-stage [data-stage-face]')];
assert.equal(faces.length, 4);
assert(faces.every(face => face.getAttribute('fill') === face.getAttribute('data-base-fill')));
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '0.28');
assert.equal(document.querySelector('#app [data-stage="entry"]').style.opacity, '0');
assert.equal(document.querySelector('#app [data-stage-focus="entry"]').style.opacity, '1');
assert.match(document.querySelector('#app [data-stage-focus="entry"]').style.transform, /^scale\(/);
assert.match(document.querySelector('#app [data-stage-focus="entry"]').style.transformOrigin, /^\d+(?:\.\d+)?px \d+(?:\.\d+)?px$/);
assert.equal(document.querySelector('#app [data-stage="finish"]').style.transform, 'translateY(22px) scale(0.98)');
assert.equal(document.querySelector('#app [data-stage-front="finish"]').getAttribute('fill'),
  document.querySelector('#app [data-stage-front="finish"]').getAttribute('data-base-fill'));
assert.deepEqual([...document.querySelectorAll('#app .atlas-vertical-stage')].map(group => group.dataset.stage), ['entry', 'finish']);
assert.equal(document.querySelector('#app [data-stage-focus="finish"]').style.opacity, '0');
assert.equal(document.querySelector('#app [data-keyboard-motion]').dataset.keyboardMotion, 'off');
await act(async () => document.querySelector('#app [data-key="entry"]').dispatchEvent(new dom.window.FocusEvent('focusout', { bubbles: true })));
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '1');
const svg = document.querySelector('#app svg');
const entryHit = document.querySelector('#app [data-hit-stage][data-key="entry"]');
const finishHit = document.querySelector('#app [data-hit-stage][data-key="finish"]');
entryHit.getBoundingClientRect = () => ({ left: 100, right: 200, top: 100, bottom: 180 });
finishHit.getBoundingClientRect = () => ({ left: 100, right: 200, top: 300, bottom: 360 });
const frames = new Map();
let nextFrame = 0;
dom.window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
dom.window.cancelAnimationFrame = id => frames.delete(id);
const movePointer = async (x, y) => {
  const move = new dom.window.Event('pointermove', { bubbles: true });
  Object.defineProperties(move, { pointerType: { value: 'mouse' }, clientX: { value: x }, clientY: { value: y } });
  await act(async () => svg.dispatchEvent(move));
  for (const [id, callback] of frames) { frames.delete(id); callback(); }
};
await movePointer(250, 140);
assert.equal(inspected.at(-1), 'entry', 'inspection begins before the cursor reaches the stage');
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '0.64');
assert.equal(svg.getAttribute('data-proximity-active'), 'true');
const halfScale = Number(document.querySelector('#app [data-stage-focus="entry"]').style.transform.match(/scale\(([^)]+)\)/)[1]);
await movePointer(210, 140);
const nearScale = Number(document.querySelector('#app [data-stage-focus="entry"]').style.transform.match(/scale\(([^)]+)\)/)[1]);
assert(nearScale > halfScale, 'focus grows as the cursor approaches');
await movePointer(150, 330);
assert.equal(document.querySelector('#app [data-stage-focus="finish"]').style.opacity, '1');
assert.equal(document.querySelector('#app [data-stage-focus="entry"]').style.opacity, '0');
assert.deepEqual([...document.querySelectorAll('#app .atlas-vertical-stage')].map(group => group.dataset.stage), ['entry', 'finish'], 'stage DOM order stays fixed when switching rapidly');
await movePointer(150, 140);
assert.equal(document.querySelector('#app [data-stage-focus="entry"]').style.opacity, '1');
await movePointer(500, 140);
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '1');
assert.equal(inspected.at(-1), null);
assert.equal(svg.hasAttribute('data-proximity-active'), false);
await act(async () => root.render(createElement(AtlasFunnel, {
  data: stages, variant: 'vertical', options: { verticalView: 'isometric', tailRatio: .65 },
  onInspect: info => inspected.push(info?.key ?? null),
})));
await movePointer(250, 140);
assert.equal(svg.hasAttribute('data-proximity-active'), false, 'the default radius does not reach a stage 50 px away');
await movePointer(210, 140);
assert.equal(svg.getAttribute('data-proximity-active'), 'true');
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '0.64', 'the default radius is 20 px');
await movePointer(500, 140);
await act(async () => root.render(createElement(AtlasFunnel, {
  data: stages, variant: 'vertical', options: { verticalView: 'isometric', tailRatio: .65, proximityRadius: 0 },
  onInspect: info => inspected.push(info?.key ?? null),
})));
assert.equal(document.querySelector('#app svg'), svg);
await movePointer(250, 140);
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '1', 'zero radius requires direct hover');
assert.equal(svg.hasAttribute('data-proximity-active'), false);
await movePointer(150, 140);
assert.equal(inspected.at(-1), 'entry');
assert.equal(document.querySelector('#app [data-stage="finish"]').style.opacity, '0.28');
assert.equal(svg.getAttribute('data-proximity-active'), 'true');
const touch = new dom.window.Event('pointerup', { bubbles: true });
Object.defineProperty(touch, 'pointerType', { value: 'touch' });
await act(async () => document.querySelector('#app [data-key="finish"]').dispatchEvent(touch));
assert.equal(document.querySelector('#app [data-key="finish"]').getAttribute('aria-pressed'), 'true');
assert.equal(document.querySelector('#app [data-stage="entry"]').style.opacity, '0.28');
assert.equal(svg.hasAttribute('data-proximity-active'), false);
assert.equal(inspected.at(-1), 'finish');

await act(async () => root.render(createElement('section', null,
  createElement(AtlasFunnel, { data: stages, options }),
  createElement(AtlasFunnel, { data: stages, options }),
)));
const svgIds = [...document.querySelectorAll('svg')].map(svg => svg.querySelector('pattern').id);
assert.equal(new Set(svgIds).size, 2);
await act(async () => root.unmount());
const hydrateHost = document.createElement('div');
hydrateHost.innerHTML = serverChart;
document.body.append(hydrateHost);
const errors = [];
const { hydrateRoot } = await import('react-dom/client');
let hydrated;
await act(async () => {
  hydrated = hydrateRoot(hydrateHost, createElement(AtlasFunnel, { data: stages, options: { roughness: 0 } }), {
    onRecoverableError: error => errors.push(error),
  });
});
assert.deepEqual(errors, [], 'React should hydrate the server SVG without replacing it');
assert(hydrateHost.querySelector('svg [data-key="entry"]'));
await act(async () => hydrated.unmount());
dom.window.close();
console.log('Verified React SVG SSR and hydration, geometry options, proximity radius, DOM props and refs, focus inspection without pinning, stable branching keys, and multiple SVG instances.');
