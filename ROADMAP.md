# Implementation gates

This repository currently demonstrates one scientifically traceable site. The next steps extend that proof into the challenge application.

## 1. Data model and site catalogue

- Define typed records for candidate sites, DEM footprints, source versions, coordinate frames, vertical datums and uncertainty metadata.
- Add at least three comparable south-polar sites using authoritative DEM coverage. Each selectable site must report the exact source and effective display resolution.
- Acceptance: switching sites changes terrain, coordinates and provenance together; no site silently reuses Site04 values.

## 2. Geometry and validation

- Move the current standalone scene into reusable terrain and ephemeris modules, retaining smooth camera movement and mobile touch controls.
- Validate projection orientation, elevation at known control points, unit scale and Sun-light azimuth against independent reference cases.
- Acceptance: documented spot checks reproduce the source DEM and Horizons outputs within displayed rounding; static science values never come from the generated film.

## 3. Time, solar opportunity and Earth visibility

- Add terrain-aware illumination calculations for each selected site/date; state whether the result is geometric sunlight, modeled power opportunity, or actual expected energy.
- Extend Earth occlusion beyond the local 8 km tile with an appropriate wider-area terrain source and compute contiguous direct-to-Earth windows.
- Acceptance: each metric exposes method, input coverage, interval and uncertainty; no percentage is shown without a tested calculation.

## 4. Comparison workspace

- Put two sites on one synchronized timeline with the same time scale, scientific units and legend.
- Let visitors open the 3D scene, inspect the horizon, and export/share a comparison with source citations.
- Acceptance: date and site changes are reflected in all visible panels and URLs; EN/RU remains complete for both interface and explanatory text.

## 5. Performance, accessibility and challenge submission

- Profile video decode and WebGL together on desktop and mobile; stream or decimate terrain by device capability while keeping source/display resolution visible.
- Keyboard navigation, labelled controls, contrast checks, reduced-motion paths, non-WebGL fallback and error states.
- Acceptance: no overlapping controls at 390 px and 1280 px; interactive scene remains responsive, and core scientific readouts remain available when motion or WebGL is unavailable.
