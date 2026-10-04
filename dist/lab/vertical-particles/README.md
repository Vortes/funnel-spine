# Vertical particle study

Open `http://127.0.0.1:8000/lab/vertical-particles/` with `npm run dev` running. The main lab links to it as Particle study.

This isolated tool pairs the existing vertical funnel with the supplied placement reference. It uses seeded, staggered particle streams, with a quadratic acceleration curve implemented through CSS transforms. Each stream is clipped between the actual curved lower rim and next container's upper rim. Counts decrease with stage quantities; they illustrate flow rather than represent individual users.

Live controls set dot radius, maximum particle count, fall time, sideways drift, container gap, and rim curvature. Pause freezes the current frame. Reduced motion disables animation and shows static dots. Offscreen and background previews pause automatically. The main page and default lab renderer do not import this experiment.

Save configuration writes the complete funnel data, print settings, seed, and particle settings to `designs/vertical-particles/latest.json` through the local server. The written absolute path appears in the UI. A new visit restores that file. Download JSON and Import JSON provide portable copies. The reference PNG is bundled locally; there are no external assets or rendering dependencies.

`study-config.js` defines and validates the format. `particleGaps()` in `particles.js` computes the seeded geometry; `addParticles()` adds a non-interactive particle layer to an existing lab SVG. `study.css` supplies motion and reduced-motion styles. When a configuration is chosen, read the saved file and promote that configuration with the particle rendering logic; do not copy slider values by eye.

Run `npm run check` to include particle configuration and geometry checks.
