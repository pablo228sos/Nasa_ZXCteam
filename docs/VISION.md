# LUNA—VIEW: product vision

## Purpose

Lunar south-pole terrain creates sharp local differences in sunlight and line of sight. A ridge a short distance away can turn a promising hour into an obstructed one. LUNA—VIEW is designed to make that relationship visible, testable and shareable. The interface should feel like a coherent exploration instrument: one point, one time, one set of assumptions, and a direct path from a result to the terrain and source data behind it.

The current prototype demonstrates this principle in three measured regions. The full vision is an atlas and scenario workspace for researchers, students, mission teams and the public. The sections below describe the **intended product**, not a list of shipped functions.

## The complete user journey

1. **Find a place.** Search a named south-polar feature, paste coordinates or select a point on an atlas. Coverage, source resolution and missing layers appear before analysis begins.
2. **Choose a question.** Ask for geometric sunlight, Earth visibility, a combined interval, an antenna-height scenario or a comparison between candidate points. Each result names its model.
3. **See the Moon respond.** The 3D terrain, Sun/Earth directions, time strip and horizon profile stay synchronized. The camera can move smoothly from regional context to the ridge that sets a local limit.
4. **Challenge the answer.** Scrub time, move the point, change height, expose the source DEM and uncertainty envelope, and compare against a second location under the same assumptions.
5. **Take the evidence away.** Share a stable scenario link or export a compact report with coordinates, data versions, UTC interval, model settings, coverage limits, visuals and machine-readable samples.

The default path should still take one or two clicks. Advanced controls should appear when a visitor asks for them. A result should never depend on understanding a hidden menu.

## Product surfaces

| Surface | Intended experience | Gate before release |
| --- | --- | --- |
| **South-pole atlas** | Searchable, measured terrain with named regions and a coordinate cursor. Zoom reveals the footprint and effective resolution of each source. | Provenance and coordinate-frame metadata for every tile; no value shown outside verified coverage. |
| **Mission-window workspace** | One synchronized UTC strip for sunlight, Earth visibility and their overlap, with clear sampled versus continuous language. | Time-scale checks, multi-scale horizon coverage and explicit treatment of intervals between samples. |
| **3D explanation** | Follow a Sun or Earth ray from the study point to its controlling ridge, inspect height, distance and clearance, then return to the original result. | The highlighted geometry must be computed from the same data and scenario as the numeric result. |
| **Scenario comparison** | Place two or more candidate points side by side, lock the date and assumptions, and see what changed in the terrain. | Equivalent horizon radius, data source, time interval and uncertainty treatment for every compared result. |
| **Engineering layers** | Separate views for antenna height, direct-to-Earth geometry, solar-array exposure and eventually power/communications models. | Each physical model has its own source register, independent test cases and limitation statement. |
| **Evidence report** | A reproducible, human-readable summary beside CSV/JSON data and a shareable URL. | Report values match the live scene; versions and coverage are embedded, not implied. |

## Visual and interaction direction

The visual ambition is cinematic, but the scientific scene remains legible at every stage. Opening media establishes scale and emotion; measured 3D terrain takes over for analysis. Camera moves should preserve spatial orientation between overview, selected point and blocking ridge. Light should distinguish the modeled Sun direction from editorial fill. Surface, elevation and slope views should use an explicit legend and scale. A beautiful shadow must never masquerade as a measured result.

Typography should feel precise and durable: a clear display face for place names, a compact monospaced face for UTC, coordinates, units and source labels. Motion should be smooth, interruptible and reduced when requested by the operating system. Controls must remain usable with touch and keyboard. The central information hierarchy is **place → result → explanation → evidence**.

## Scientific expansion path

The strongest final version requires breadth with disciplined scope:

### Wider geographic coverage

Build a tile catalogue of suitable lunar DEMs, including overlap and quality metadata. Compute a multi-scale horizon that includes distant relief when it matters. Track what portion of each horizon is constrained by measured, interpolated or missing terrain. Expand coordinate freedom only as fast as coverage and validation allow.

### More meaningful time models

Add finer and adaptive time sampling near horizon crossings. Distinguish an hourly sampled opportunity from a continuous interval. Keep ephemeris assumptions, observer location and time scales explicit. Validate boundary cases against independent calculations.

### Physical mission models

Solar energy depends on surface orientation, array geometry, shadowing, efficiency, temperature and storage. Communications depend on pointing, antenna gain, link budget, frequency, Earth-station geometry and required margins. These should enter the interface as separate models with their own controls and evidence, after the required inputs and validation are available. A single unexplained “site score” would hide too much.

### Uncertainty and trust

Uncertainty should be shown as the specific input or model variation being tested: DEM height, spatial interpolation, distant-terrain coverage, time sampling, ephemeris or hardware assumptions. The current adverse ±1-RMS height shift is a first sensitivity probe. A future uncertainty panel should make these contributions understandable without translating them into unsupported probabilities.

## Release standard

A new claim is ready for the main interface only when:

- its data source, version, coordinate frame, coverage and units are documented;
- the calculation has reproducible tests and at least one independent comparison;
- the result and the 3D explanation agree for the same point, hour and settings;
- edge cases produce a visible limitation or error rather than a plausible-looking number;
- the feature works on a phone, with keyboard input and reduced motion;
- the exported evidence is sufficient to reproduce the displayed result.

The implementation sequence is tracked in [ROADMAP.md](../ROADMAP.md) and [ITERATIONS.ru.md](../ITERATIONS.ru.md). Today's bounded prototype and its precise limits are documented in [SCIENCE.md](SCIENCE.md).
