# LUNA—VIEW / ZXC

A working visual study for the NASA Space Apps Challenge 2026 Lunar Landing Site Navigator challenge. The landing page uses cinematic illustration; the linked science screen renders a real 3D lunar elevation model and topocentric Sun/Earth geometry.

## Run locally

From this directory:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. The full terrain view is at `http://localhost:8000/science/`. A local HTTP server is required because the terrain and ephemeris are fetched as separate files. No build step or API token is needed to view the included study.

## What works now

- Cinematic landing page with the **rim glide** video, native scrolling, responsive layouts, reduced-motion behavior, and EN/RU content.
- Interactive 16 × 16 km terrain scene at **Shackleton rim, NASA PGDA Site04**, with drag orbit, overhead camera, zoom, surface/elevation/slope views and a UTC timeline.
- Hourly apparent Sun and Earth azimuth/elevation from **JPL Horizons** for 14–22 November 2026. The light direction and readouts change with the selected hour.
- An approximate local terrain-horizon test for the chosen point, evaluated every degree of azimuth and every 50 m out to 8 km, including lunar curvature.
- Source and display-resolution disclosures in the interface. The generated hero video is explicitly marked as illustration.

## Scientific provenance and limits

| Item | Current implementation |
| --- | --- |
| Terrain | [NASA PGDA high-resolution LOLA south-pole DEM, Site04](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/). Projected polar stereographic grid; source sample pitch 5 m. |
| Display geometry | The 3D mesh is 384 × 384 samples (41.7 m pitch) derived from the 5 m source. A separate 2048² normal map retains finer height variation from that same source; it is not an independent measurement. Height is shown at 1:1 scale. |
| Source uncertainty | [PGDA reports that roughly 90% of the 5 m pixels are interpolated](https://pgda.gsfc.nasa.gov/products/78). A 5 m grid is not 5 m independent measurement resolution. |
| Observer | Site center at 89.766811° S, 188.130102° E, +767.98 m relative to the 1737.4 km lunar reference radius. |
| Ephemeris | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) topocentric observer at the site, targets Sun (10) and Earth (399), quantity 4 apparent azimuth/elevation, hourly UTC samples. Values are bundled in `science/luna_view_site04_data.json`. |
| Horizon | Bilinear samples of this DEM along 360 radial directions, with Moon curvature correction. The test considers relief within 8 km only; it is not a complete direct-to-Earth availability prediction. |
| Editorial light and color | A fill light and procedural surface tone reveal shape. Neither is a measured reflectance product. Sun direction is ephemeris-driven. |
| Film | `media/rim-glide.mp4` and `media/crater-ascent.mp4` were generated in Gemini. Their crater geometry, stars and Earth scale are **illustrative**, not a reconstruction of Site04. |

This is one documented study site, not the final challenge-wide site comparison. It does not yet calculate power yield, full communication windows, long-range occlusion, uncertainty bands or landing suitability scores. Those require additional datasets and validation before they should appear as results.

## Regenerate the science assets

```sh
python -m pip install -r requirements.txt
python scripts/build_site04_data.py
```

The script downloads the source GeoTIFF into ignored `.cache/`, queries Horizons, and writes the terrain, normal map, and ephemeris JSON in `science/`. It needs network access. The downloaded TIFF is about 41 MB.

## Repository map

```text
index.html / site.css / site.js    Landing page
science/                           Standalone 3D science screen and derived data
media/                             Two generated cinematic studies
scripts/build_site04_data.py       Reproducible data preparation
licenses/three-LICENSE.txt         License for bundled Three.js r180 modules
ROADMAP.md                         Next implementation gates
```

Three.js r180 is bundled locally so the science screen can run without a CDN. The bundled files retain the original [Three.js MIT license](licenses/three-LICENSE.txt).
