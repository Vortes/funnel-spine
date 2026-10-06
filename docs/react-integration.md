# React integration contract

The package root exports one client component, `AtlasFunnel`. Its source lives in `src/react/`; `dist/react/` contains the built module and generated declaration. Pure functions in `src/chart/` calculate geometry. React renders the SVG marks, patterns, labels, and interaction state inside a container `div`. It does not require a stylesheet, Tailwind, shadcn/ui, or Recharts.

## Inputs

Pass a `data` array with two or more stages for `continuous` (the default) or `vertical`. Values are finite, nonnegative, and non-increasing. IDs are unique strings; labels are nonempty strings.

```tsx
<AtlasFunnel data={stages} variant="vertical" options={{ borderRadius: 12 }} />
```

The package keeps Flat as the default Vertical view for existing integrations. The lab opens in Isometric. Select that view explicitly in an app:

```tsx
<AtlasFunnel
  data={stages}
  variant="vertical"
  options={{ verticalView: 'isometric', isoDepth: 36, isoRotation: 30, tailRatio: 0.65 }}
/>
```

Isometric depth ranges from 18–200 px and rotation from −45° to 45°. Its stages require decreasing quantities and a terminal taper below 100%. Flat and Isometric use the same stage data. The lab stores independent controls for the two views in `options.verticalViews`; passing an exported lab config directly to `AtlasFunnel` applies the settings for its selected view. For Continuous, `options={{ mirror: true }}` draws a symmetric funnel using full thickness for quantity.

Pass a connected bucket tree for `branching`. There is one entry bucket, each child has one parent, and every non-final bucket distributes all of its incoming quantity, including drop-off. A node's optional `value` asserts its quantity. Links must have positive finite quantities and unique source/target pairs. The renderer rejects disconnected nodes, cycles, merges, incomplete splits, and mismatched declared values.

```tsx
const data = {
  nodes: [
    { id: 'visits', label: 'Visits', value: 1000 },
    { id: 'signups', label: 'Signups' },
    { id: 'dropoff', label: 'Drop-off' },
  ],
  links: [
    { source: 'visits', target: 'signups', value: 300 },
    { source: 'visits', target: 'dropoff', value: 700 },
  ],
};

<AtlasFunnel data={data} variant="branching" />
```

`options` is a partial object. Unknown names, wrong types, and numbers outside the lab ranges throw errors. The shared defaults and exact ranges are in `dist/lab/options.js`. `texture: 'mixed'` distributes patterns across ribbons; `dense`, `am`, `hatch`, `cross`, and `coarse` each fill the whole chart with one pattern. Sparse stipple is reserved for Isometric top faces and is not a selectable chart texture. The fixed ink and paper colors are part of this design; `color` is not a public option. Pass `seed` (an unsigned 32-bit integer) for deterministic stipple and paper grain. Treat `data` as an immutable React prop; memoize large inputs when their contents have not changed.

After validating a lab export, narrow its variant and data together before rendering. For example, the Vertical branch is:

```tsx
import type { Stage } from 'funnel-spine';

<AtlasFunnel
  data={config.data as Stage[]}
  variant="vertical"
  options={config.options}
  seed={config.seed}
/>
```

## Interaction

`onInspect(info)` fires as the mouse approaches a Vertical stage, on hover for other variants, and on keyboard focus. `onInspect(null)` fires when that inspection ends. The inspection includes `key`, `kind`, `label`, `value`, `denominator`, and `total`; branching links also include `source` and `target`. Conversion is `value / denominator`, and share of total is `value / total`. Zero denominators have no defined percentage. In Vertical, `options.proximityRadius` controls the mouse sensing distance in screen pixels (0–240, default 20; 0 requires the cursor to be inside a stage). The cursor becomes a pointer inside that range. The sensor triggers a timed expansion or return when the cursor enters or leaves that range; moving faster or farther within it does not change the animation speed. Their original screen fills remain visible.
`verticalTransition` selects the handoff between Vertical prisms: `crossfade` (default, simultaneous fade), `overlap` (new focus appears before the old focus leaves), `relay` (old focus leaves before the new focus appears), or `none` (instant handoff). On a direct pointer switch, the previous prism returns to the stack while the next expands. The geometry is unchanged. The base handoff lasts 150 ms, while initial hover and hover out each last 240 ms. Set `--atlas-crossfade-duration`, `--atlas-proximity-duration`, `--atlas-overlap-delay` (default 50 ms), and `--atlas-relay-duration` (default 75 ms) on the component's `style` to tune them. Keyboard inspection and reduced-motion preferences disable every transition.

Mouse inspection is temporary. Tapping a Vertical stage pins it until another stage is tapped or the chart background is tapped; Enter or Space toggles the focused Vertical stage, and Escape clears the pin. Continuous and Branching clicks do not pin ribbons. Stage ribbon keys are their source stage IDs in continuous charts and stage IDs in vertical charts. Branching link keys are stable `link:<encoded source>:<encoded target>` strings, even when links are reordered. Hovering or focusing a branching link highlights its connected ancestry and descendants; this is a graph trace, not cohort attribution after a merge.

The component forwards standard `div` attributes, including `className`, `style`, `aria-*`, `data-*`, and a `ref` to the container. Its `viewBox` prop can crop the inner SVG, and SVG `children` can add an overlay. Every SVG gets a React-generated pattern prefix so multiple charts can share a page; `idPrefix` can set it explicitly for exported figures. If an application renders multiple independent React roots on the server, configure each root's React `identifierPrefix` as React recommends.

## Rendering and errors

Server rendering includes the complete SVG, with deterministic vector print screens. Hydration starts from the same markup. In supporting browsers, the stipple screen upgrades through React state to a full-chart WebGL texture; otherwise the vector screen remains visible. Invalid data or options throw during React rendering so an error boundary can report the problem. Chart geometry and SVG creation do not depend on browser DOM APIs.

The original `dist/atlas-kit-react.tsx` is a compatibility adapter for the legacy kit page. It has a different appearance and does not expose the lab options. New integrations should import the package root.
