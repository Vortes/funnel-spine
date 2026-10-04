# Funnel lab

Open `/lab/` for the experimental workshop. The original kit page and core renderer remain unchanged.

Each variant has independent settings. Shared controls adjust the starting screen, screen pitch, hatch angle, outline weight (0.25–0.75 pt), dot gain (−80% to +20%), edge irregularity, label size, annotations, and optional paper grain. The lab uses only blue ink (`#2F4FE0`) and cool gray paper (`#E4E5E8`). Tonal differences come from sparse and dense stochastic stipple, 30% AM dots, diagonal hatch, 50% diamond lattice, and 70% coarse dots; neighboring ribbons receive different screens. Stipple is seeded across the entire figure rather than repeated from a small tile. Dense stipple has over twice the previous dot count; reducing dot gain makes dots smaller without reducing their number. Six grouped vector paths render the dots efficiently. Solid ink is reserved for small marks. All labels are English. Continuous funnels expose curvature and height. Vertical funnels expose height, stage gaps, cap curvature, and terminal taper. Branching funnels expose curvature, branch spacing, and node width.

`config.js` generates deterministic examples and validates portable configurations. Version 2 configurations contain their version, variant, seed, all options, and complete data. Version 1 imports and browser saves are migrated to the new screen controls; old opacity settings are discarded. `lab-engine.js` renders those options without mutating the original library. New sample assigns a new seed; changing a seed regenerates its data. Applying JSON data marks the configuration as custom.

Save configuration retains a named copy in browser storage. Select it from the shelf to restore it. Export config downloads the full JSON; Import config restores that JSON with validation. Export SVG includes every ribbon, even when a path is pinned, and excludes interaction overlays. Mouse hover settles a thin contour over the selected section and its connected path in 150 ms; leaving takes 110 ms. The filled geometry and hit area remain stationary. Keyboard and touch feedback is immediate, and reduced-motion preferences disable all transitions.

Extended lab geometry options are experimental and do not yet apply to the main React component. To render a lab config programmatically in the browser:

```js
import { renderFunnel } from './lab-engine.js';
import { parseConfig } from './config.js';
const config = parseConfig(savedJson);
const svg = renderFunnel(config.data, {
  ...config.options,
  variant: config.variant,
  seed: config.seed,
  idPrefix: 'my-figure',
});
document.querySelector('#figure').replaceChildren(svg);
```

Serve `dist/` over HTTP for development. From the repository root run `node verify-lab.mjs` to check deterministic sampling, configuration round trips, validation, and geometry at slider limits.
