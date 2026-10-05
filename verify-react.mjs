import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { AtlasFunnel } from 'funnel-spine';
import { normalizeOptions } from './dist/lab/options.js';
import { validateData } from './dist/core/data.js';

const stages = [
  { id: 'entry', label: 'Entry', value: 100 },
  { id: 'finish', label: 'Finish', value: 40 },
];

assert.equal(renderToString(createElement(AtlasFunnel, { data: stages })), '<div style="display:block"></div>');
assert.throws(() => normalizeOptions({ color: 'red' }), /Unknown funnel option/);
assert.throws(() => normalizeOptions({ constructor: 1 }), /Unknown funnel option/);
assert.throws(() => validateData([{ id: 1, label: 'Bad', value: 10 }, stages[1]]), /unique string id/);

const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLCanvasElement.prototype.getContext = () => null;

const { createRoot } = await import('react-dom/client');
const root = createRoot(document.querySelector('#app'));
const selected = [];
const inspected = [];
const options = { roughness: 0 };
let chartRef;
const chartProps = {
  ref: node => { chartRef = node; },
  data: stages,
  className: 'user-chart',
  'data-testid': 'funnel',
  onSelectionChange: (key, info) => selected.push([key, info?.value ?? null]),
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
assert.equal(path.getAttribute('aria-pressed'), 'false');
await act(async () => path.dispatchEvent(new dom.window.Event('focus')));
assert.deepEqual(inspected, ['entry']);
await act(async () => path.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.deepEqual(selected, [['entry', 40]]);
assert.equal(path.getAttribute('aria-pressed'), 'true');
await act(async () => path.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
assert.deepEqual(selected.at(-1), [null, null]);
assert.equal(path.getAttribute('aria-pressed'), 'false');

const tree = {
  nodes: [{ id: 'root', label: 'Root' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }],
  links: [{ source: 'root', target: 'left', value: 40 }, { source: 'root', target: 'right', value: 60 }],
};
const reordered = { nodes: tree.nodes, links: [...tree.links].reverse() };
const key = 'link:root:left';
const renderTree = (data, selectedKey = key) => createElement(AtlasFunnel, {
  data, variant: 'branching', options, selectedKey,
  onSelectionChange: (next, info) => selected.push([next, info?.value ?? null]),
  onInspect: info => inspected.push(info?.key ?? null),
});
await act(async () => root.render(renderTree(tree)));
assert.equal(document.querySelectorAll('#app [data-key]').length, 2);
assert.equal([...document.querySelectorAll('#app [data-key]')].find(node => node.dataset.key === key).getAttribute('aria-pressed'), 'true');
await act(async () => root.render(renderTree(reordered)));
const selectedLink = [...document.querySelectorAll('#app [data-key]')].find(node => node.dataset.key === key);
assert.equal(selectedLink.getAttribute('aria-pressed'), 'true');
await act(async () => selectedLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
assert.deepEqual(selected.at(-1), [null, null]);
assert.equal(selectedLink.getAttribute('aria-pressed'), 'true');
await act(async () => root.render(renderTree(tree, 'missing-key')));
await act(async () => document.querySelector('#app [data-key]').dispatchEvent(new dom.window.Event('focus')));
assert.equal(inspected.at(-1), 'link:root:left');

await act(async () => root.render(createElement('section', null,
  createElement(AtlasFunnel, { data: stages, options }),
  createElement(AtlasFunnel, { data: stages, options }),
)));
const svgIds = [...document.querySelectorAll('svg')].map(svg => svg.querySelector('pattern').id);
assert.equal(new Set(svgIds).size, 2);
await act(async () => root.unmount());
dom.window.close();
console.log('Verified React SSR import, DOM props and refs, inspection, keyboard selection, stable branching keys, and multiple SVG instances.');
