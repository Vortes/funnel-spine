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
for (const model of [flat, iso]) assert(!model.marks.some(mark => mark.key.endsWith(':number')), 'vertical figures have no stage numbers');
assert.equal(paths(iso).length, 3);
assert.equal(iso.marks.filter(mark => mark.type === 'path' && mark.face).length, 6);
assert.equal(iso.clips.length, 3);
assert.throws(() => buildChartModel(stages, 'vertical', { verticalView: 'isometric', tailRatio: 1, stageGap: 20 }), /terminal taper/);
const steep = [10000, 5000, 100, 10, 1].map((value, i) => ({ id: String(i), label: `Stage ${i}`, value }));
const steepIso = buildChartModel(steep, 'vertical', { verticalView: 'isometric', stageHeight: 330, stageGap: 20, tailRatio: .15 });
assert.equal(paths(steepIso).length, steep.length);
assert(steepIso.marks.every(mark => mark.type !== 'path' || !/NaN|Infinity/.test(mark.d)));

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

// Isometric Vertical figures are a parallel (oblique) projection: every depth edge shares one direction and every
// side face is a parallelogram. The default preset's stages are slices of one tapered solid with a single apex.
{
  globalThis.HTMLElement ??= class {};
  const { createConfig, sampleData } = await import('./dist/lab/config.js');
  const preset = createConfig('vertical');
  const corners = d => { const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g).map(Number); return Array.from({ length: n.length / 2 }, (_, i) => ({ x: n[2 * i], y: n[2 * i + 1] })); };
  const faces = (model, id) => Object.fromEntries(['front', 'top', 'side'].map(face => [face,
    corners(model.marks.find(mark => mark.key === (face === 'front' ? id : `stage:${id}:${face}`)).d)]));
  const near = (a, b, label) => assert(Math.abs(a - b) < 1e-6, `${label}: ${a} vs ${b}`);
  for (const data of [preset.data, ...[0, 1, 7, 99, 1234].map(seed => sampleData('vertical', seed))]) {
    const model = buildChartModel(data, 'vertical', preset.options);
    const depth = faces(model, data[0].id).top;
    for (const stage of data) {
      const { front: [tl, tr, br], top, side } = faces(model, stage.id);
      near(top[1].x - top[0].x, depth[1].x - depth[0].x, 'top depth x'); near(top[1].y - top[0].y, depth[1].y - depth[0].y, 'top depth y');
      near(side[1].x - side[0].x, depth[1].x - depth[0].x, 'side depth x'); near(side[1].y - side[0].y, depth[1].y - depth[0].y, 'side depth y');
      near((side[2].x - side[1].x) * (br.y - tr.y), (side[2].y - side[1].y) * (br.x - tr.x), 'side face parallelogram');
    }
    const turn = preset.options.isoRotation * Math.PI / 180;
    near(Math.atan2(-(depth[1].y - depth[0].y), depth[1].x - depth[0].x), Math.atan2(Math.cos(turn) / 1.5, 2 * Math.sin(turn)), 'depth angle');
  }
  const apexes = preset.data.map(stage => {
    const [tl, tr, br, bl] = faces(buildChartModel(preset.data, 'vertical', preset.options), stage.id).front;
    const left = (bl.x - tl.x) / (bl.y - tl.y), right = (br.x - tr.x) / (br.y - tr.y);
    return tl.y + (tr.x - tl.x) / (left - right);
  });
  for (const apex of apexes) near(apex, apexes[0], 'default preset shared apex');
}
console.log('Verified pure chart models for continuous, flat and isometric vertical, parallel isometric depth with a shared default apex, and connected branching flows.');
