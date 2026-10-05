# atlas-kit

Legacy kit page and browser-native SVG library. The React-first package entry now lives in `dist/react/` and uses the lab renderer; see the repository root README for new integrations.

## Files

- `atlas-kit.js`: browser ES module, custom element, renderer, and layout. It imports `core/data.js` for validation.
- `atlas-kit.d.ts`: TypeScript declarations.
- `atlas-kit-react.tsx`: React client adapter. Copy these three files plus `core/data.js`, preserving the `core/` folder.

This is a source distribution. No npm package has been published.

## React

React 18 or later is required for the optional adapter. The adapter imports the browser module after mounting, so it can be used in a Next.js client component without importing HTMLElement on the server.

```tsx
'use client';
import { AtlasFunnel } from './atlas-kit-react';

const stages = [
  { id: 'visitors', label: 'Visitors', value: 12000 },
  { id: 'signups', label: 'Signups', value: 3600 },
  { id: 'activated', label: 'Activated', value: 2160 },
];

export function Example() {
  return <AtlasFunnel variant="continuous" data={stages} texture="mixed"
    onInspect={path => console.log(path)} />;
}
```

Set variant to `vertical` to use the same stage data in a vertical funnel.

## Browser HTML / JavaScript

```html
<atlas-funnel id="chart"></atlas-funnel>
<script type="module">
  import './atlas-kit.js';
  const chart = document.querySelector('#chart');
  chart.update([
    { id: 'a', label: 'Visitors', value: 1000 },
    { id: 'b', label: 'Signups', value: 300 },
  ], { variant: 'continuous', texture: 'hatch' });
  chart.addEventListener('atlas-inspect', event => console.log(event.detail));
  chart.addEventListener('atlas-select', event => console.log(event.detail));
</script>
```

Serve browser examples over HTTP; native modules do not work from file URLs.

## Branching data

```js
const graph = {
  nodes: [
    { id: 'visitors', label: 'Visitors' },
    { id: 'signup', label: 'Signups' },
    { id: 'exit', label: 'Drop-off' },
  ],
  links: [
    { source: 'visitors', target: 'signup', value: 300 },
    { source: 'visitors', target: 'exit', value: 700 },
  ],
};
chart.update(graph, { variant: 'branching' });
```

All node ids must be unique. Links must have positive finite values, connect existing nodes, and form a directed acyclic graph. Combine duplicate source/target links. Outgoing flow cannot exceed incoming flow. Nodes are sized by the maximum of incoming and outgoing quantity. Omitted outgoing flow represents loss. The root sum supplies the denominator for share of total.

The layout is intended for compact funnels, with up to four nodes per column. Excessively dense graphs are rejected with an explanatory error. Node order follows the supplied array; it does not perform crossing minimization.

## Options

- `variant`: continuous / vertical / branching.
- `texture`: mixed / hatch / stipple / cross / solid.
- `density`: pattern spacing, 3–14 SVG pixels, default 7.
- `curve`: cubic curve handle ratio, 0.1–0.8, default 0.5; applies to continuous and branching.
- `strokeWidth`: outline width in SVG pixels, default 1.
- `color`: valid CSS color, default #2442dc.
- `labels`: show annotations, default true.

Stage quantities must be finite, nonnegative, and non-increasing. Continuous height and vertical width encode the stage count. Vertical segment heights are equal; segment area does not encode quantity. The last vertical segment tapers decoratively to 65% of its top width.

## Inspection and selection

Hover or focus a ribbon to inspect it. Click, Enter, or Space to pin it. Escape clears selection. Web component events `atlas-inspect` and `atlas-select` bubble across the shadow boundary. Selection emits null when cleared. The React equivalents are `onInspect` and `onSelect`.

Inspection includes `label`, `value`, `denominator`, `total`, and `kind`, plus source and target ids for graph links. Conversion = value / denominator; share of total = value / total. Zero denominators have no defined percentage. Branch tracing shows connected ancestry and descendants of the chosen link. After a merge, it cannot infer the individual cohort that proceeds downstream.

Call `clearSelection()` to unpin and `exportSVG()` for a standalone 900px SVG with every ribbon visible. Each element scopes its SVG patterns to unique ids. Use `update(data, options)` when switching variant and data together. The standalone `renderFunnel` function accepts `idPrefix` for multiple SVGs in the same document.

## Development

The playground is static: serve `dist/` with any HTTP server. From the repository root run `node verify.mjs` for data and layout checks.
