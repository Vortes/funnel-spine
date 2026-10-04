# Funnel lab

Open `/lab/` for the experimental workshop. The original kit page and core renderer remain unchanged.

Each variant has independent settings. Shared controls adjust texture, pattern spacing, hatch angle, outline weight, fill tint, pattern ink, label size, and annotations. Continuous funnels expose curvature and height. Vertical funnels expose height, stage gaps, cap curvature, and terminal taper. Branching funnels expose curvature, branch spacing, and node width.

`config.js` generates deterministic examples and validates portable configurations. A configuration contains its version, variant, seed, all options, and complete data. `lab-engine.js` renders those options without mutating the original library. New sample assigns a new seed; changing a seed regenerates its data. Applying JSON data marks the configuration as custom.

Save configuration retains a named copy in browser storage. Select it from the shelf to restore it. Export config downloads the full JSON; Import config restores that JSON with validation. Export SVG includes every ribbon, even when a path is pinned.

Extended lab geometry options are experimental and do not yet apply to the main React component. To render a lab config programmatically in the browser:

```js
import { renderFunnel } from './lab-engine.js';
import { parseConfig } from './config.js';
const config = parseConfig(savedJson);
const svg = renderFunnel(config.data, {
  ...config.options,
  variant: config.variant,
  idPrefix: 'my-figure',
});
document.querySelector('#figure').replaceChildren(svg);
```

Serve `dist/` over HTTP for development. From the repository root run `node verify-lab.mjs` to check deterministic sampling, configuration round trips, validation, and geometry at slider limits.
