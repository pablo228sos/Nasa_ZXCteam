# Implementation gates

This repository currently demonstrates three scientifically traceable sites: Site04 has no shared Sun/Earth sample in the bundled interval, Site01 has 42 and Site07 has 95. Site switching loads independent terrain, horizon and ephemeris assets. The landing page shows all three on a synchronized 193-sample timeline computed from those assets. The science view can search one bundled UTC day or the full interval, preserving the date in comparisons and CSV exports. The next steps extend that proof into the challenge application.

## 1. Data model and site catalogue

- Define typed records for candidate sites, DEM footprints, source versions, coordinate frames, vertical datums and uncertainty metadata.
- Three comparable south-polar sites now use authoritative DEM coverage. Formalize their metadata as typed records, including footprint, source version, coordinate frame and uncertainty.
- Acceptance: switching sites changes terrain, coordinates and provenance together; no site silently reuses Site04 values.

## 2. Geometry and validation

- Move the current standalone scene into reusable terrain and ephemeris modules, retaining smooth camera movement and mobile touch controls.
- Validate projection orientation, elevation at known control points, unit scale and Sun-light azimuth against independent reference cases.
- Extend the current NASA total-Z RMS height-error sensitivity envelope into a documented uncertainty model; do not present its adverse ±1-RMS shifts as a confidence interval.
- Acceptance: documented spot checks reproduce the source DEM and Horizons outputs within displayed rounding; static science values never come from the generated film.

## 3. Time, solar opportunity and Earth visibility

- Add terrain-aware illumination calculations for each selected site/date; state whether the result is geometric sunlight, modeled power opportunity, or actual expected energy.
- Extend Earth occlusion beyond the local 8 km tile with an appropriate wider-area terrain source and compute contiguous direct-to-Earth windows.
- Acceptance: each metric exposes method, input coverage, interval and uncertainty; no percentage is shown without a tested calculation.

## 4. Comparison workspace

- Extend the existing synchronized three-site landing summary into an interactive comparison workspace that responds to date controls, with unit labels and provenance for each site.
- Let visitors open the 3D scene, inspect the horizon, and export/share a comparison with source citations.
- Acceptance: date and site changes are reflected in all visible panels and URLs; EN/RU remains complete for both interface and explanatory text.

## 5. Performance, accessibility and challenge submission

- Profile video decode and WebGL together on desktop and mobile; stream or decimate terrain by device capability while keeping source/display resolution visible.
- Keyboard navigation, labelled controls, contrast checks, reduced-motion paths, non-WebGL fallback and error states.
- Acceptance: no overlapping controls at 390 px and 1280 px; interactive scene remains responsive, and core scientific readouts remain available when motion or WebGL is unavailable.
