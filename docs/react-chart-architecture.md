# React chart architecture

## Goal

The package and lab render the same chart through React-owned SVG. Plain TypeScript functions validate data and calculate positions, paths, and labels. React renders the resulting marks and owns selection, focus, and hover state. DOM access is reserved for measurement, export, and time-based particle animation.

## Parallel work

1. **Chart model:** Extract pure layout and path calculations for Continuous, Vertical (Flat and Isometric), and Branching. Keep stable IDs, flow conservation, seeded screens, and all current geometry options.
2. **Screen definitions:** Render the print screens, grain, and edge filter as deterministic React SVG definitions that also work during server rendering.
3. **Lab integration:** Use the same React chart component in the workshop and particle study. Preserve controls, inspection, selection, motion, import/export, and saved configurations.
4. **Package integration:** Make `AtlasFunnel` render SVG on the first React render, with controlled and uncontrolled selection, forwarded refs, DOM props, and accessible paths. Build the package from source and remove the lab's imperative renderer from the published dependency graph.

## Acceptance checks

- Server rendering contains the full SVG and deterministic IDs; hydration produces no mismatch.
- Every variant works in the lab and in the public React API, including Flat/Isometric, mirror, and connected branching links.
- Keyboard and pointer selection, inspection, and reduced-motion behavior remain usable.
- SVG export preserves fills, clip paths, masks, and labels.
- The particle study preserves container geometry and playback controls.
- `npm run check`, package packing, and browser checks pass before a local commit. Publishing remains a separate step.
