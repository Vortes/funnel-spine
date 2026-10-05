# Vertical particle study

Open `http://127.0.0.1:8000/lab/vertical-particles/` with `npm run dev` running. The main lab links to it as Particle study.

This isolated tool previews falling particles between the existing vertical funnel containers. It uses seeded, staggered particle streams, with a quadratic acceleration curve implemented through CSS transforms. Each stream is clipped between the actual curved lower rim and next container's upper rim. Counts decrease with stage quantities; they illustrate flow rather than represent individual users.

The supplied particle-study configuration is the starting preset and Reset study default: radius 0.6 px, count 124, fall time 540 ms, drift 0 px, inward edge angle 58°, and gap 14 px. `default-study.js` stores the complete approved configuration.

Live controls set dot radius, maximum particle count (up to 124), fall time, sideways drift, inward edge angle (0–70° from vertical), container gap, and rim curvature. The outer half of each stream progressively tilts inward; central particles retain their original drift. Dots always land within the next rim. Older exported configurations without an edge angle import at 0°. Pause freezes the current frame. Reduced motion disables animation and shows static dots. Offscreen and background previews pause automatically. The main page and default lab renderer do not import this experiment.

Save configuration writes the complete funnel data, print settings, seed, and particle settings to `designs/vertical-particles/latest.json` through the local server. The written absolute path appears in the UI. A new visit restores that file. Download JSON and Import JSON provide portable copies. The page UI uses React and has no external assets.

`src/lab/particle-main.tsx` contains the React controls and preview; `npm run build:lab` generates `study.js`. Edit the source rather than the generated bundle. `study-config.js` defines and validates the format. `particleGaps()` in `particles.js` computes the seeded geometry; `addParticles()` adds a non-interactive particle layer to an existing lab SVG. `study.css` supplies motion and reduced-motion styles. When a configuration is chosen, read the saved file and promote that configuration with the particle rendering logic; do not copy slider values by eye.

Run `npm run check` to include particle configuration and geometry checks.
