# Launch readiness

The repository now has a React-first package entry, one shared data validator, one set of option rules, a typed contract, and package contents that exclude the workshop and legacy page. `npm run check` is the local gate. No package has been published.

Before a developer launch, decide and verify these points:

1. **Distribution:** choose the final package name and whether the installation model is npm, copyable source/registry, or both. The current `private: true` package is an integration candidate. A CLI or shadcn registry has not been built.
2. **Server rendering:** the component is import safe on the server but produces SVG only after hydration. Decide whether that is acceptable for the intended frameworks and document the client boundary prominently in release docs.
3. **Consumer matrix:** test the packed artifact in real React 18 and 19 apps, including a Next.js client component, with browser coverage for SVG patterns, WebGL fallback, keyboard focus, and touch selection.
4. **Performance:** record mount and update costs for large funnels and several charts on one page. The lab's `/lab/benchmark.html` compares shader and vector stipple but is not a consumer app benchmark.
5. **Public docs and examples:** replace the legacy kit page's React snippet and downloadable ZIP when the package API is final. Publish a plain Markdown API reference and copyable examples for agents alongside the chosen distribution method.

The current lab remains the visual source of truth. Its branching invariant is one connected bucket tree with 100% split conservation. The English-only design uses one blue ink, cool gray paper, and screened fills.
