# React integration contract

The package root exports one client component, `AtlasFunnel`. Its implementation and TypeScript declaration live in `dist/react/`. The component renders the lab's SVG engine in a container `div`. It does not require a stylesheet, Tailwind, shadcn/ui, or Recharts.

## Inputs

Pass a `data` array with two or more stages for `continuous` (the default) or `vertical`. Values are finite, nonnegative, and non-increasing. IDs are unique strings; labels are nonempty strings.

```tsx
<AtlasFunnel data={stages} variant="vertical" options={{ borderRadius: 12 }} />
```

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

`options` is a partial object. Unknown names, wrong types, and numbers outside the lab ranges throw errors. The shared defaults and exact ranges are in `dist/lab/options.js`. The fixed ink and paper colors are part of this design; `color` is not a public option. Pass `seed` (an unsigned 32-bit integer) for deterministic stipple and paper grain. Treat `data` as an immutable React prop; a new data object requests a redraw. Options are compared by value, so an inline `options` object with unchanged values does not redraw the SVG.

After validating a lab export and typing its fields in the consuming app, map it to the component:

```tsx
<AtlasFunnel
  data={config.data}
  variant={config.variant}
  options={config.options}
  seed={config.seed}
/>
```

## Interaction

`onInspect(info)` fires on mouse hover and keyboard focus, and `onInspect(null)` fires when that inspection ends. The inspection includes `key`, `kind`, `label`, `value`, `denominator`, and `total`; branching links also include `source` and `target`. Conversion is `value / denominator`, and share of total is `value / total`. Zero denominators have no defined percentage.

Click, Enter, or Space selects a ribbon. Escape clears selection. Use `defaultSelectedKey` for internal state or `selectedKey` plus `onSelectionChange(key, info)` for controlled state. A controlled component requests a change through the callback and waits for the parent to update `selectedKey`. `null` means no selection. Stage ribbon keys are their source stage IDs in continuous charts and stage IDs in vertical charts. Branching link keys are stable `link:<encoded source>:<encoded target>` strings, even when links are reordered. A selected link highlights its connected ancestry and descendants; this is a graph trace, not cohort attribution after a merge.

The component forwards standard `div` attributes, including `className`, `style`, `aria-*`, `data-*`, and a `ref` to the container. Every SVG gets a React-generated pattern prefix so multiple charts can share a page. If an application renders multiple independent React roots on the server, configure each root's React `identifierPrefix` as React recommends.

## Rendering and errors

The module can be imported during server rendering. The server output is an empty `div`; SVG generation starts after hydration because the print engine uses DOM and optionally WebGL. The WebGL 2 stipple path falls back to vector SVG in browsers without WebGL 2. Invalid data or options throw during React rendering so an error boundary can report the problem. The SVG render itself may throw in the effect if the browser cannot create the required DOM elements.

The original `dist/atlas-kit-react.tsx` is a compatibility adapter for the legacy kit page. It has a different appearance and does not expose the lab options. New integrations should import the package root.
