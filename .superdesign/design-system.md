# LUNA—VIEW design system / November 2026 direction

## Product
LUNA—VIEW is a public, bilingual lunar landing-site analysis experience for NASA Space Apps Challenge 2026. A visitor should move from an emotional, cinematic first impression into a scientifically traceable comparison of locations and dates. The science view is a working 3D terrain model, not a decorative globe: topography comes from NASA LOLA; Sun and Earth geometry comes from JPL Horizons; uncertainty and visual-asset provenance stay visible.

## Primary style direction
Apple-like restraint and motion discipline, adapted to a lunar research instrument. Do not reproduce Apple's branding or product page layout. The first viewport is nearly all moving lunar landscape, with very little text. Later sections use a measured typographic rhythm, large negative space, sparse fine rules, and direct data. Avoid sci-fi HUD clichés, glowing neon, glass-card grids, purple gradients, abstract wireframes, floating spheres, and generic AI illustrations.

## Palette
- Void: `#040608`; deep panel: `#0c1014`; muted panel: `rgba(12,16,20,.72)`.
- Primary text: `#f2f3ef`; secondary text: `#c3c8c6`; quiet metadata: `#8f9fa1`.
- Solar accent: `#d9b47a` only where light or Sun is represented.
- Earth/communication accent: `#adc8cf` only where Earth or direct-to-Earth is represented.
- Borders: `rgba(255,255,255,.17)`; scientific elevation map uses muted slate/ochre, not neon.

## Type
- Headlines: Manrope 600 or Helvetica Neue, with tight tracking `-0.06em` to `-0.075em`, line-height `0.9` to `1.0`.
- Body: Manrope 400–600, 14–17 px desktop, generous `1.6–1.75` line-height.
- Labels/data: DM Mono 400–500, 10–12 px desktop, uppercase, `0.1em–0.15em` tracking.
- No novelty space fonts. No fake NASA logo. LUNA—VIEW wordmark is simple type plus an orbital ring.

## Layout
- Full-bleed 16:9 lunar video in the hero, muted autoplay and a still fallback. Text stays at left with a dark gradient behind it; site entry CTA is clear but small.
- Content width 1180–1360 px. Headline/paragraph groups occupy one third to half the width. Large media earns most of the screen.
- Science screen: live 3D terrain fills viewport. Sparse left title and right data readout. Bottom timeline and view modes. All overlay panels must leave terrain visible.
- Mobile: video and 3D remain a real visual layer; text gets stronger contrast and panels stack under the introduction. Touch interaction must work.

## Motion
- Ease curves should feel cinematic and damped: gentle camera orbit, no abrupt snaps, no scroll hijacking. Content enter transitions 400–700 ms; controls 200–300 ms.
- Timeline scrubbing updates sunlight and readout immediately. Camera movement must not change scientific values.
- Honor `prefers-reduced-motion`; keep all data accessible without playing media.

## Science and provenance
- Distinguish generated cinematic hero from measured 3D analysis. The video is illustrative and must not be presented as the actual local topography or true Earth apparent size.
- NASA PGDA LOLA Site04, Shackleton rim, 5 m/pixel source. Roughly 90% of source pixels are interpolated; 3D scene mesh can be lower resolution and must say so.
- JPL Horizons apparent azimuth/elevation, topocentric site; local terrain horizon is evaluated only within the DEM footprint. No uncomputed power/communications percentage or certainty claim.
- Required screen controls: site/date selection, compare candidate sites, 3D terrain, Sun/Earth local horizon, power opportunity, DTE window, provenance and assumptions, EN/RU language switch.
