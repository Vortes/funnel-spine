# Atlas kit migration

The original Funnel Spine commit remains in history. The earlier implementation is replaced by the Atlas kit work, grouped as follows:

| Commit group | Original Atlas source commits | Result |
| --- | --- | --- |
| Kit and lab | `980e521`, `2baefdf` | Browser SVG library, React adapter, types, kit page, three lab variants, config import/export, saved configurations. |
| Scientific screens and motion | `8204d65`, `2d9ac82` | One blue ink and gray paper, English annotations, seeded full-figure stipple, finer dot gain, hover contours, reduced motion. |
| Connected bucket tree | `2d86382`, `143781a` | The overlap experiment and its correction are combined into the final connected tree: one entry, complete splits, no crossings or disconnected aggregate. |
| Approved defaults | `159b7ee` | The three seed-1234 exports supply the defaults; older branching data migrates to the connected tree. |
| Local workflow | New | Dependency-free development server, automatic browser refresh, check scripts, and local-first instructions. |

The final `dist/` files and checks match the approved Atlas source at `159b7eed6910b3a41a0ea61eef8a4893ef67af48`. The Sites hosting manifest is intentionally excluded from this local repository.
