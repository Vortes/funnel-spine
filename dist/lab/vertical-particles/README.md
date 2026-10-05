# Vertical particle study

Open `http://127.0.0.1:8000/lab/vertical-particles/` with `npm run dev` running. The main lab links to it as Particle study.

This isolated tool previews falling particles between the existing vertical funnel containers. It uses seeded, staggered particle streams, with a quadratic acceleration curve driven by the Web Animations API. The source containers flex as dots release; receiving containers compress and show a brief absorption mark. The geometry keeps each dot within the source and destination openings. Counts decrease with stage quantities; they illustrate flow rather than represent individual users.

The supplied `atlas-vertical-particles.json` is the starting preset and Reset study default: radius 0.6 px, count 124, fall time 540 ms, drift 0 px, inward edge angle 58°, and gap 14 px. `default-study.js` stores the complete approved configuration.

Live controls set dot radius, maximum particle count (up to 124), fall time, sideways drift, inward edge angle (0–70° from vertical), container gap, rim curvature, border radius, absorption, release tension, and recoil. The outer half of each stream progressively tilts inward; central particles retain their original drift. Dots always land within the next rim. Older exported configurations without an edge angle import at 0°; missing surface settings use their defaults. Pause freezes the current frame. Reduced motion disables animation and shows static dots. Offscreen and background previews pause automatically. The main page and default lab renderer do not import this experiment.

Save configuration writes the complete funnel data, print settings, seed, and particle settings to `designs/vertical-particles/latest.json` through the local server. The written absolute path appears in the UI. A new visit restores that file. Download JSON and Import JSON provide portable copies. There are no external assets or rendering dependencies.

`study-config.js` defines and validates the format. `containerGeometry()` builds rounded container paths, `particleGaps()` computes seeded dot positions, and `animateTransfer()` coordinates dots and surface response. Reduced motion shows still dots. When a configuration is chosen, read the saved file and promote that configuration with the particle rendering logic; do not copy slider values by eye.

Run `npm run check` to include particle configuration and geometry checks.
