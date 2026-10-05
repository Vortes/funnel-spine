# Launch readiness

The repository now has a React-first package entry, one shared data validator, one set of option rules, a typed contract generated from source, and package contents that exclude the workshop and legacy page. React owns the chart SVG; pure model functions calculate geometry. `npm run check` is the local gate. No package has been published.

Before a developer launch, decide and verify these points:

1. **Distribution:** choose the final package name and whether the installation model is npm, copyable source/registry, or both. The current `private: true` package is an integration candidate. A CLI or shadcn registry has not been built.
2. **Framework matrix:** confirm full SVG server rendering and hydration in the intended frameworks, including React 18, React 19, and a Next.js client component.
3. **Consumer matrix:** test the packed artifact in real React 18 and 19 apps, including a Next.js client component, with browser coverage for SVG patterns, WebGL fallback, and keyboard focus.
4. **Performance:** record mount and update costs for large funnels and several charts on one page. The SSR vector stipple uses a compact tile; supporting browsers upgrade to a full-chart shader texture after hydration. The lab's `/lab/benchmark.html` compares shader and vector stipple but is not a consumer app benchmark.
5. **Public docs and examples:** replace the legacy kit page's React snippet and downloadable ZIP when the package API is final. Publish a plain Markdown API reference and copyable examples for agents alongside the chosen distribution method.

Both lab pages use React components in `src/lab/` and share the package renderer; their UI bundles are generated for the local server and excluded from the package. The latest Isometric and Flat Vertical views, mirrored Continuous geometry, and chart pattern controls are represented in the React lab. The package exposes their rendering options while keeping Flat as its default Vertical view for existing consumers. The lab remains the visual source of truth. Its branching invariant is one connected bucket tree with 100% split conservation. The English-only design uses one blue ink, cool gray paper, and screened fills.
