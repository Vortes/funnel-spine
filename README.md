# Funnel Spine / Atlas kit

A local workshop for continuous, vertical, and branching conversion charts. The kit page lives at `/`; the risograph lab lives at `/lab/`.

## Local development

Use Node.js 22 or later. No dependency installation or build step is needed.

```sh
cd /Users/alan/Programming/funnel-spine
npm run dev
```

Open **http://127.0.0.1:8000/lab/**. Edits in `dist/` refresh the browser automatically. The server binds to your computer's loopback interface and disables caching. For another port, use `PORT=4173 npm run dev`.

```sh
npm run check
```

The checks cover data validation, proportional geometry, configuration migration, seeded screens, and connected branching layouts with 100% conservation and no overlaps.

## Project layout

- `dist/lab/`: the active lab, renderer, screen definitions, configuration handling, and approved defaults.
- `dist/index.html`, `dist/app.js`, `dist/style.css`: the original kit playground.
- `dist/atlas-kit.js`, `dist/atlas-kit.d.ts`, `dist/atlas-kit-react.tsx`: the original library and optional React adapter.
- `scripts/dev.mjs`: dependency-free local server and browser refresh.
- `verify.mjs`, `verify-lab.mjs`: core and lab checks.

All three lab variants start from the approved seed-1234 configurations. Reset variant restores its full preset. Configurations saved in the browser are scoped to the local origin; import an exported JSON to bring a hosted configuration into the local lab.

The lab renderer includes newer screen and branching behavior than the original library. See [lab documentation](dist/lab/README.md) and [library documentation](dist/README.md) for their respective APIs.

Work locally by default. Publish or deploy only when explicitly requested. The local repo has no Sites hosting manifest or automatic publication step.

## History

The migration replaces the previous implementation and keeps its MIT license. Work from the Atlas kit session is grouped into descriptive commits; see [migration history](docs/history.md).
