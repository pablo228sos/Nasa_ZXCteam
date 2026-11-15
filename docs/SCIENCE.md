# Scientific method and provenance

LUNA—VIEW currently answers a bounded geometric question: at a chosen point and one of 193 hourly UTC samples, are the apparent Sun and Earth above a **local horizon** derived from the included lunar terrain? This document describes that calculation, its sources, and the tests required before extending it to mission planning.

## Global atlas versus local analysis

The landing-page Moon is a **visual atlas** built from [NASA SVS's CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): an LRO-derived global color map and a coarse LOLA global elevation map. The NASA kit notes that polar areas of its color map use LOLA albedo to fill gaps, and that this map is optimized for visual work. Its relief is sampled at 4 pixels per degree; the derived 8-bit browser height texture is only for perceptible globe shape. Neither the global texture nor its lighting is used for the numerical site results.

The site markers use the reference-centre south latitude and east longitude stored in the corresponding local science JSON. They are close enough together that the overview combines them into one south-pole marker. The polar focus connects three labels to their projected coordinates. Zoom is deliberately limited because the global texture does not resolve individual site terrain. Selecting a site opens its separate NASA PGDA 5 m LOLA scene.

The atlas directional light converts each bundled Site 07 JPL Horizons Sun azimuth/elevation sample into a Moon-fixed unit vector using the site's local east, north and up basis. This is a **directional preview** of 193 hourly samples, not a solar irradiance or shadow forecast at every global point. The decorative Sun disc is not an ephemeris-positioned body; its size, placement and distance are illustrative. The background uses the [NASA SVS Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/) as a static visual field, not an observer-aligned sky for the selected hour.

## Source register

| Input | Source and use | Important qualification |
| --- | --- | --- |
| Elevation | [NASA Planetary Geodynamics Data Archive (PGDA), LOLA south-pole 5 m grids](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/) for Sites 01, 04 and 07. The source TIFFs are downloaded by `scripts/build_site_data.py`; derived assets are versioned in `science/`. | [PGDA's product description](https://pgda.gsfc.nasa.gov/products/78) reports that roughly 90% of pixels in these 5 m grids are interpolated. Grid spacing is not independent measurement accuracy. |
| Height uncertainty | Aligned PGDA total-Z RMS GeoTIFFs for the same sites. Used for an adverse input-height sensitivity envelope. | An RMS value is not, by itself, a confidence interval for the visibility result. |
| Sun and Earth | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), topocentric apparent azimuth and elevation of target 10 (Sun) and 399 (Earth) at each reference centre. One-hour UTC spacing, 14 November 2026 00:00 through 22 November 2026 00:00. | Values are precomputed by the data builder and bundled as JSON. [JPL API policy](https://ssd-api.jpl.nasa.gov/doc/index.php) does not permit embedding its API in a website. |
| 3D renderer | Local Three.js r180 modules, under their included [MIT licence](../licenses/three-LICENSE.txt). | Surface colour, fill light and the opening film help interpretation. They are not measured lunar reflectance or site imagery. |

The reference centres are:

| Site | Name | Latitude | East longitude | DEM-sampled height |
| --- | --- | ---: | ---: | ---: |
| 01 | Connecting ridge | 89.463163° S | 222.510447° | +1944.83 m |
| 04 | Shackleton rim | 89.766811° S | 188.130102° | +769.68 m |
| 07 | Peak near Shackleton | 88.811008° S | 123.690068° | +1645.25 m |

Heights are measured relative to the source's 1,737.4 km lunar reference radius. All time labels in the science interface are UTC.

## Data preparation

`scripts/build_site_data.py` acquires each source DEM, reads the 16 × 16 km polar stereographic tile, samples the reference height, queries JPL Horizons, and builds a 360-direction local horizon. The source TIFFs stay in ignored `.cache/`; the browser receives derived terrain, normal maps, and JSON. `scripts/augment_height_sensitivity.py` reads the matching total-Z RMS TIFF. `scripts/build_close_detail.py` prepares the optional 2 × 2 km terrain mesh. `scripts/build_probe_grid.py` packs the full source-pitch height and RMS tiles for on-demand custom-point calculations.

The wide 3D mesh is 384 × 384 vertices at approximately 41.7 m display spacing. The optional close-up is a 401 × 401 mesh at 5 m grid spacing. A 2048² normal map gives the wide mesh finer visual relief, but adds no independent measurement. Height is rendered at 1:1 scale. Colour and ambient fill light are editorial. The 16 × 16 km source footprint remains finite even when the surrounding scene fades into black.

## Coordinates and moved points

Visitors enter south latitude and east longitude or click the terrain. `science/coordinate_probe.mjs` converts that coordinate to the south-polar stereographic plane of the bundled grid. Points are accepted within approximately 1,980 m of one of the three reference centres. This bound keeps every 6 km horizon ray inside the relevant 16 × 16 km source tile. The application selects another included site when the coordinate belongs to its envelope; otherwise it reports missing coverage.

The browser loads the relevant height and RMS grids only after a moved-point request. The source-pitch height grid is stored at 0.1 m precision, and the aligned RMS grid at 0.05 m precision. Bilinear interpolation provides the observer and ray heights. The marker, timeline, local blocker, antenna scenario, evidence CSV and shareable URL all follow the selected point.

Sun/Earth directions at a moved point are calculated by resolving the bundled Horizons topocentric direction into a three-dimensional vector at the reference centre, then projecting it onto the new point's local north/east/up basis. This is a nearby-point transformation of a bundled ephemeris, not a live Horizons query for each input coordinate. Its accuracy was spot-checked against separately requested Horizons values at the other included sites; that check is not a global bound.

## Horizon and opportunity calculation

For each integer azimuth from 0° through 359°, the code samples terrain every 50 m. It uses a maximum range of **8 km at reference centres** and **6 km at moved points**. For a sample at range `d`, its apparent terrain angle is:

```text
angle(d) = atan2(height(d) − observer_height − d² / (2 × lunar_radius), d)
local_horizon(azimuth) = max angle(d) along that azimuth
```

The curvature term uses a lunar radius of 1,737,400 m. A Sun or Earth sample is counted as geometrically visible when its apparent elevation is above the relevant directional local horizon. The mission-window result counts hourly samples where **both** conditions hold. It reports the longest sampled run and the sample maximizing the smaller of the two angular clearances. The ridge explanation points to the range and height that set the blocking horizon in the selected direction.

For a moved-point comparison, **both** the reference and moved point are recalculated with the same 6 km limit. The displayed gain or loss therefore compares like with like. It cannot be compared as an operational outcome against terrain outside that radius.

The antenna control tests 0, 2, and 5 m observer height for the Earth horizon by adjusting the stored directional terrain profiles. Ground-level sunlight is unchanged. At raised heights, the source-RMS envelope is not recalculated; the CSV leaves those sensitivity columns blank.

## Input-height sensitivity

For each sampled ray, an upper adverse horizon raises terrain by one reported local total-Z RMS and lowers the observer by one observer RMS. A lower horizon applies the opposite shifts. Taking the maximum along each ray yields an envelope for **input-height sensitivity**. This check does not model spatial correlation, interpolation error beyond the supplied RMS map, long-range terrain, or the probability of a clear link.

For the full included interval, the reference-site nominal counts are **Site 01: 42/193**, **Site 04: 0/193**, and **Site 07: 95/193**. Of those nominal shared samples, **18/42 at Site 01** and **80/95 at Site 07** remain above the adverse upper local horizon. The Site 07 preselected moved point changes the 6 km nominal count from **95/193 to 193/193** and has **193/193** above its 1-RMS upper local horizon. All counts are geometric hourly samples.

## Verification and reproducibility

Run the tests that use bundled assets only:

```sh
python -m pip install -r requirements.txt
python scripts/verify_site_data.py
npm ci
npm run test:probe
npm run test:ui
npm run test:probe-ui
```

The browser tests require Google Chrome. The Python consistency check verifies the bundled directional horizons and hourly series; it does not independently validate the source DEM or orbital model.

To regenerate assets from the original sources:

```sh
python scripts/build_site_data.py --site 01
python scripts/build_site_data.py --site 04
python scripts/build_site_data.py --site 07
python scripts/augment_height_sensitivity.py --site 01
python scripts/augment_height_sensitivity.py --site 04
python scripts/augment_height_sensitivity.py --site 07
python scripts/build_close_detail.py
python scripts/build_probe_grid.py
```

This operation needs network access; each downloaded source TIFF is roughly 41 MB. Re-run the sensitivity, close-detail and probe-grid builders after replacing a site's JSON or DEM.

With the original TIFFs available in `.cache/`, independent source checks are:

```sh
python scripts/validate_source_spots.py
python scripts/verify_antenna_scenario.py
python scripts/verify_probe_against_source.py
python scripts/verify_probe_examples.py
```

The moved-point TIFF spot check at one offset per region found maximum directional differences of **0.055° nominal** and **0.060° upper 1-RMS** between packed and original float grids. The example-count check reproduces the three guided examples to within one hourly point. A separate coordinate-transform check across the bundled 193 hours at Sites 01 and 07 found a maximum elevation difference of **0.000386°** and azimuth difference of **0.004540°** against independently fetched Horizons data. These are finite spot checks, **not universal error bounds**.

## What the current result cannot establish

- Continuous sunlight, received energy, battery state or solar-array performance between hourly samples.
- A complete direct-to-Earth communications window, including distant terrain, antenna pattern, link budget, pointing, occultation and required margin.
- Landing safety, boulder distribution, traversability, surface strength or mission readiness.
- An uncertainty probability or confidence interval from the adverse ±1-RMS input shifts.
- A result for an arbitrary lunar coordinate outside the three included envelopes, or for dates outside the bundled interval.

Extending these claims requires new sources, validation cases and explicit model definitions. The [roadmap](../ROADMAP.md) tracks those gates; the [vision](VISION.md) describes how they would appear to a user once validated.
