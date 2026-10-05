# Development workflow

- This repository is the canonical local workspace for Funnel Spine / Atlas kit.
- Work locally by default. Do not synchronize with Sites or publish unless the user explicitly requests it.
- Run `npm run dev` for the local server at `http://127.0.0.1:8000/lab/`. Reuse a running server; it builds and watches `src/lab/`, and edits in `dist/` refresh the browser automatically.
- The active experiment is `dist/lab/`. Preserve the main kit page unless the request concerns it.
- Edit the lab React components in `src/lab/`, then run `npm run build:lab` or use the dev watcher. `dist/lab/lab.js` and `dist/lab/vertical-particles/study.js` are generated bundles. Keep the SVG renderer and data rules in their existing modules.
- The React-first package entry is `dist/react/atlas-funnel.js`; its public types are in the adjacent `.d.ts`. It uses the lab renderer and `dist/core/data.js`. The original `dist/atlas-kit-react.tsx` belongs to the legacy kit page.
- When changing the package API, update its types, `docs/react-integration.md`, the React verification, and the package file list together. Keep module imports safe during server rendering.
- Each lab variant has independent defaults in `dist/lab/default-configs.js`.
- Branching data uses one connected bucket tree. Each split must distribute 100% of its quantity, including drop-off; never introduce crossings or disconnected aggregate stages.
- Keep the English-only lab's single blue ink, cool gray paper, and screened fills.
- Run `npm run check` after changes to rendering, data, or configuration. For copy or style-only edits, use the relevant targeted check.
- Commit related changes with descriptive messages. Do not publish during ordinary edit cycles.
