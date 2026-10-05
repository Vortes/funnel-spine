# Funnel Spine / Atlas kit

Funnel Spine is a local workshop for continuous, vertical, and branching conversion charts. The intended developer API is now React first. The package entry uses the same renderer as the active risograph lab; the original kit page remains a legacy playground.

**Status:** this is an unpublished package candidate. `private: true` prevents accidental publication. The package name and install method are not final.

## Local development

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open [the lab](http://127.0.0.1:8000/lab/) for the active workshop and [the particle study](http://127.0.0.1:8000/lab/vertical-particles/) for its vertical flow experiment. The [original kit](http://127.0.0.1:8000/) remains available for comparison. `npm run dev` builds both React pages, watches `src/lab/`, and refreshes the browser when the generated files in `dist/` change. Run `npm run build:lab` to regenerate those files without starting the server. For another port, use `PORT=4173 npm run dev`.

```sh
npm run check
```

The checks cover data and option validation, seeded print screens, connected branching geometry and conservation, configuration migration, the React package DOM and server import, package types, and both React lab pages.

## React integration

The local package exposes `AtlasFunnel` from `funnel-spine`. It requires the consumer's React 18.3 or 19 installation and has no Tailwind or shadcn requirement. Until publication, use a local tarball from `npm pack` to test it in another project:

```sh
npm pack
# In the consumer project:
npm install /absolute/path/to/funnel-spine-0.1.0.tgz
```

```tsx
'use client';
import { AtlasFunnel } from 'funnel-spine';

const stages = [
  { id: 'visits', label: 'Visits', value: 12000 },
  { id: 'signups', label: 'Signups', value: 3600 },
  { id: 'active', label: 'Active', value: 2160 },
];

export function ConversionChart() {
  return <AtlasFunnel data={stages} options={{ texture: 'dense' }} />;
}
```

The component accepts standard `div` props and a `ref` to its container. It supports `onInspect`, `onSelectionChange`, and controlled or uncontrolled selection. The lab also exercises Isometric and Flat Vertical views, mirrored Continuous funnels, and whole-chart or mixed print patterns through React controls. See [the integration contract](docs/react-integration.md) for branching data, lab config reuse, options, and behavior.

## Source map

| Path | Role |
| --- | --- |
| `dist/react/` | React component and public TypeScript declaration |
| `src/lab/` | React source for the workshop and particle study |
| `scripts/build-lab.mjs` | Builds the two lab entry points into `dist/lab/` |
| `dist/core/data.js` | Shared data validation |
| `dist/lab/lab-engine.js`, `screens.js`, `options.js` | Package renderer and print rules |
| `dist/lab/` | Lab pages, generated UI bundles, renderer, and saved-config format |
| `dist/atlas-kit.js`, `dist/atlas-kit-react.tsx`, `dist/index.html` | Legacy kit and its original API |
| `verify*.mjs`, `types.test.tsx` | Runtime and type checks |

The current package is source distributed: `npm pack --dry-run` lists the exact files. The legacy kit and its source ZIP are outside that package. The lab's single blue ink, cool gray paper, and screened fills are intentional defaults.

Work locally by default. Do not publish or synchronize with Sites unless explicitly requested. See [launch readiness](docs/launch-readiness.md) for the remaining release decisions and verification work.
