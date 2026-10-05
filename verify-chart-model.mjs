import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { verticalContainerGeometry as legacyContainer } from './dist/lab/vertical-geometry.js';

const output = await build({
  entryPoints: ['src/chart/model.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm', target: 'es2022',
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].contents).toString('base64')}`;
const { buildChartModel, verticalContainerGeometry } = await import(moduleUrl);

assert.equal(globalThis.document, undefined);
const stages = [
  { id: 'entry', label: 'Entry', value: 100 },
  { id: 'active', label: 'Active', value: 70 },
  { id: 'finish', label: 'Finish', value: 40 },
];
const stageSnapshot = structuredClone(stages);
const paths = model => model.marks.filter(mark => mark.type === 'path' && mark.inspection);

const continuous = buildChartModel(stages, 'continuous', { edgeFade: .2 });
const mirrored = buildChartModel(stages, 'continuous', { mirror: true });
assert.equal(paths(continuous).length, 2);
assert.notEqual(paths(continuous)[0].d, paths(mirrored)[0].d);
assert.deepEqual(Object.keys(continuous.fadeStops).sort(), ['both', 'left', 'right']);
assert.deepEqual(continuous.marks.filter(mark => mark.type === 'line' && mark.baseline), []);
assert(continuous.marks.every(mark => mark.type !== 'path' || !/NaN|Infinity/.test(mark.d)));

const flatOptions = { verticalView: 'flat', stageHeight: 310, stageGap: 9, tailRatio: .65, capCurve: 12, borderRadius: 6 };
const flat = buildChartModel(stages, 'vertical', flatOptions);
assert.equal(paths(flat).length, 3);
assert.equal(flat.marks.filter(mark => mark.type === 'path' && mark.face).length, 0);
const expectedContainer = legacyContainer(stages, flatOptions, 0);
assert.equal(paths(flat)[0].d, expectedContainer.path);
assert.equal(verticalContainerGeometry(stages, flatOptions, 0).path, expectedContainer.path);

const iso = buildChartModel(stages, 'vertical', { verticalView: 'isometric', tailRatio: .65, borderRadius: 3 });
assert.equal(paths(iso).length, 3);
assert.equal(iso.marks.filter(mark => mark.type === 'path' && mark.face).length, 6);
assert.equal(iso.clips.length, 3);
assert.throws(() => buildChartModel(stages, 'vertical', { verticalView: 'isometric', tailRatio: 1, stageGap: 20 }), /terminal taper/);

const graph = {
  nodes: [
    { id: 'root', label: 'Root', value: 100 },
    { id: 'active', label: 'Active' },
    { id: 'dropoff', label: 'Drop-off' },
    { id: 'finish', label: 'Finish' },
    { id: 'inactive', label: 'Inactive' },
  ],
  links: [
    { source: 'root', target: 'active', value: 70 },
    { source: 'root', target: 'dropoff', value: 30 },
    { source: 'active', target: 'finish', value: 40 },
    { source: 'active', target: 'inactive', value: 30 },
  ],
};
const graphSnapshot = structuredClone(graph);
const branching = buildChartModel(graph, 'branching');
assert.equal(paths(branching).length, 4);
assert.deepEqual(paths(branching).map(path => path.inspection.key), [
  'link:root:active', 'link:root:dropoff', 'link:active:finish', 'link:active:inactive',
]);
assert.equal(branching.graph.links.filter(link => link.source === 'root').reduce((sum, link) => sum + link.value, 0), 100);
const reordered = buildChartModel({ ...graph, links: [...graph.links].reverse() }, 'branching');
assert.deepEqual(new Set(paths(reordered).map(path => path.inspection.key)), new Set(paths(branching).map(path => path.inspection.key)));
assert.throws(() => buildChartModel({ ...graph, links: graph.links.slice(1) }, 'branching'), /entry bucket|100%|account|connected|root/i);
assert.deepEqual(stages, stageSnapshot);
assert.deepEqual(graph, graphSnapshot);

console.log('Verified pure chart models for continuous, flat and isometric vertical, and connected branching flows.');
