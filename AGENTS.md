# Development workflow

- This repository is the canonical local workspace for Funnel Spine / Atlas kit.
- Work locally by default. Do not synchronize with Sites or publish unless the user explicitly requests it.
- Run `npm run dev` for the local server at `http://127.0.0.1:8000/lab/`. Reuse a running server; edits in `dist/` refresh the browser automatically.
- The active experiment is `dist/lab/`. Preserve the main kit page unless the request concerns it.
- Each lab variant has independent defaults in `dist/lab/default-configs.js`.
- Branching data uses one connected bucket tree. Each split must distribute 100% of its quantity, including drop-off; never introduce crossings or disconnected aggregate stages.
- Keep the English-only lab's single blue ink, cool gray paper, and screened fills.
- Run `npm run check` after changes to rendering, data, or configuration. For copy or style-only edits, use the relevant targeted check.
- Commit related changes with descriptive messages. Do not publish during ordinary edit cycles.
