# LUNA—VIEW / ZXC

A working visual study for the NASA Space Apps Challenge 2026 Lunar Landing Site Navigator challenge. The landing page uses cinematic illustration; the linked science screen renders real 3D lunar elevation models and topocentric Sun/Earth geometry for two documented study points.

## Run locally

From this directory:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. The full terrain view is at `http://localhost:8000/science/`; open `http://localhost:8000/science/?site=01&find=1` to inspect the second site with the result already shown. A local HTTP server is required because the terrain and ephemeris are fetched as separate files. No build step or API token is needed to view the included study.

## What works now

- Cinematic landing page with the **Earth over a lunar rim** video, native scrolling, responsive layouts, reduced-motion behavior, and EN/RU content. The main action opens the mission-window analysis.
- Interactive 16 × 16 km terrain scenes at **Shackleton rim (NASA PGDA Site04)** and **Connecting ridge (Site01)**, with drag orbit, overhead camera, zoom, surface/elevation/slope views and a UTC timeline. The site selector and one-click compare action load each site's own DEM, normal map, horizon and ephemeris.
- Hourly apparent Sun and Earth azimuth/elevation from **JPL Horizons** for 14–22 November 2026. The light direction and readouts change with the selected hour.
- An approximate local terrain-horizon test for the chosen point, evaluated every degree of azimuth and every 50 m out to 8 km, including lunar curvature.
- **Find a mission window** checks the 193 hourly samples for simultaneous geometric sunlight and Earth visibility. The explanation marks the measured ridge and draws the matching horizon profile for the selected UTC hour. Site04 has **0/193** shared samples; Site01 has **42/193**. The first Site01 overlap at **20 Nov 2026 07:00 UTC** clears the modeled Earth horizon by only about **0.01°**, so it needs uncertainty analysis before mission use. The 3D explanation selects the hour maximizing the smaller of the Sun and Earth angular clearances; on Site01 it is **20 Nov 18:00 UTC**.
- Source and display-resolution disclosures in the interface. The generated hero video is explicitly marked as illustration.

## Scientific provenance and limits

| Item | Current implementation |
| --- | --- |
| Terrain | [NASA PGDA high-resolution LOLA south-pole DEMs, Site01 and Site04](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/). Projected polar stereographic grid; source sample pitch 5 m. |
| Display geometry | The 3D mesh is 384 × 384 samples (41.7 m pitch) derived from the 5 m source. A separate 2048² normal map retains finer height variation from that same source; it is not an independent measurement. Height is shown at 1:1 scale. |
| Source uncertainty | [PGDA reports that roughly 90% of the 5 m pixels are interpolated](https://pgda.gsfc.nasa.gov/products/78). A 5 m grid is not 5 m independent measurement resolution. |
| Observer | Site04 center: 89.766811° S, 188.130102° E, +769.68 m. Site01 center: 89.463163° S, 222.510447° E, +1944.83 m. Heights are bilinearly sampled at the exact center coordinates, relative to the 1737.4 km lunar reference radius. |
| Ephemeris | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) topocentric observer at each site, targets Sun (10) and Earth (399), quantity 4 apparent azimuth/elevation, hourly UTC samples. Site-specific values are bundled in `science/luna_view_site01_data.json` and `science/luna_view_site04_data.json`. |
| Horizon | Bilinear samples of this DEM along 360 radial directions, with Moon curvature correction. Each direction also records the range and height of the highest blocking ridge. The test considers relief within 8 km only; it is not a complete direct-to-Earth availability prediction. |
| Editorial light and color | A fill light and procedural surface tone reveal shape. Neither is a measured reflectance product. Sun direction is ephemeris-driven. |
| Film | `media/earth-rim-loop.mp4` was generated in Google Flow with Omni 1.2 Flash at native 720p, upscaled by Google to 1080p, then locally retimed into a 30-second seamless presentation loop. The Earth size, crater geometry and stars are **artistic**, not a reconstruction of Site04. Earlier Gemini studies are retained in `media/` for comparison. |

This is a two-point comparison study, not the final challenge-wide site comparison. The current window search uses hourly samples and the local 8 km terrain horizon. It does not calculate power yield, full communication availability, long-range occlusion, uncertainty bands or landing suitability scores. Those require additional datasets and validation before they should appear as results. See [the iteration plan](ITERATIONS.ru.md) for concrete acceptance criteria.

## Regenerate the science assets

```sh
python -m pip install -r requirements.txt
python scripts/build_site_data.py --site 04
python scripts/build_site_data.py --site 01
```

The script downloads the source GeoTIFF into ignored `.cache/`, queries Horizons, and writes the terrain, normal map, and ephemeris JSON in `science/`. It needs network access. The downloaded TIFF is about 41 MB.

Check the bundled scientific data without network access:

```sh
python scripts/verify_site_data.py
```

This checks both sets of 360 directional profiles against their recorded horizon maxima and blocker distances, verifies hourly ephemeris spacing, and confirms the displayed site results. It checks internal consistency; it is not an independent validation of JPL Horizons or of terrain beyond the supplied tiles.

## Repository map

```text
index.html / site.css / site.js    Landing page
science/                           Standalone 3D science screen and both sites' derived data
media/                             Flow hero loop and earlier Gemini studies
scripts/build_site_data.py         Reproducible data preparation for Site01 and Site04
scripts/augment_horizon_blockers.py Local augmentation from the source TIFF
scripts/verify_site_data.py        Offline data-consistency check
licenses/three-LICENSE.txt         License for bundled Three.js r180 modules
ROADMAP.md                         Next implementation gates
ITERATIONS.ru.md                   Detailed status, steps and acceptance criteria
```

Three.js r180 is bundled locally so the science screen can run without a CDN. The bundled files retain the original [Three.js MIT license](licenses/three-LICENSE.txt).
