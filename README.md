# Funnel Spine

A design playground for funnel ribbon charts. One HTML file, no build, no
dependencies.

**Live tool:** https://vortes.github.io/funnel-spine/

## What it does

The page renders a four-stage funnel as a ribbon. The ribbon's height at each
stage is that stage's share of the first stage. The chart sits inside a demo
report band, so you judge the shape in the context it has to live with: stage
headings, drop-off labels, and a table of small row glyphs.

A properties panel controls the design:

- **Data** - four stage labels and counts.
- **Shape** - ramp curve, thickness, a minimum-thickness floor, centered or
  flat baseline, ramp width, and an edge fade on both ends.
- **Fill** - flat, vertical gradient, horizontal gradient, or one shade per
  stage. Color and opacity.
- **Stroke** - full outline, top-and-bottom hairlines, or none.
- **Cap** - the final plateau: solid or underline, rounded end, inset, bar
  height, color, and opacity. The ribbon end follows the cap's rounding when
  the cap sits flush.
- **Depth** - drop shadow and a top highlight.
- **Guides** - vertical rules, solid or dashed.

Presets give starting looks. Reset restores the default.

## Export

- **Copy settings** - a JSON of every value, for a handoff to code.
- **Copy SVG** - the chart as standalone SVG markup.
- **Share link** - the full state lives in the URL hash, so a link restores
  the exact design and data.

## Run it

Open `index.html` in a browser. There is no step two.

## License

MIT
