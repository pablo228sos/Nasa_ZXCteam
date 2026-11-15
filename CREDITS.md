# Sources, credits and reuse

LUNA—VIEW is an independent project by **ZXC**. The NASA Space Apps Challenge context does not imply NASA or JPL endorsement. This register separates measured data, software dependencies and generated visual media.

| Material | Provider / creator | Use in this repository |
| --- | --- | --- |
| South-polar elevation grids and aligned total-Z RMS maps | [NASA Planetary Geodynamics Data Archive, LOLA 5 m products](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/) | Source data for the three terrain regions, local horizons and height-input sensitivity. Derived browser assets retain source attribution. |
| Sun and Earth apparent directions | [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Precomputed hourly reference-site ephemerides for 14–22 November 2026 UTC. Nearby-point directions are transformed from these vectors. |
| 3D renderer | [Three.js](https://threejs.org/), r180 | Bundled `science/three.module.js` and `science/three.core.js`; upstream [MIT licence](licenses/three-LICENSE.txt) included. |
| Interface fonts | [Manrope](https://fonts.google.com/specimen/Manrope) and [DM Mono](https://fonts.google.com/specimen/DM+Mono) | Loaded from Google Fonts in the current website, with local fallbacks. |
| Introductory film | ZXC visual direction; generated in Google Flow (Omni 1.2 Flash), Google upscaling and local editorial retiming | `media/earth-rim-loop.mp4` and the phone encode. Crater form, stars and apparent Earth size are artistic and do not represent a measured site. Earlier generated studies remain in `media/`. |
| README cover image | ZXC art direction; generated with OpenAI image generation | `docs/brand/lunar-rim-banner.png`. Artistic lunar panorama, not survey imagery or a reconstruction of any study site. |
| Site, interfaces and analysis code | ZXC | Project work in this repository. |

Source attribution and technical limitations are detailed in [docs/SCIENCE.md](docs/SCIENCE.md). The repository currently has **no project-wide licence** granting reuse of ZXC code or creative media. Upstream licence terms for Three.js remain in force. NASA/JPL source material has its own applicable terms; consult the linked providers for reuse requirements.

If you discover an incorrect credit or a source-version mismatch, please open a scientific correction issue with the relevant file and provider link.
