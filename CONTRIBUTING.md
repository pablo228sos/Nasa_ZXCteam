# Contributing to LUNA—VIEW

We welcome reproducible scientific corrections, interaction fixes, accessibility improvements and design work that makes the underlying evidence easier to understand. The project is a bounded research prototype; a useful contribution states clearly what it changes and how to verify it.

## Start with an issue

Use the repository templates for a bug, a scientific correction or a product proposal. For geometry or data concerns, include site/coordinates, UTC time, selected scenario, source link and observed versus expected result. Screenshots help with visual defects, but numeric reports need reproducible inputs.

For substantial changes, describe the intended data source and validation plan before editing large binary assets. The [roadmap](ROADMAP.md) and [vision](docs/VISION.md) describe planned work; they do not imply that every proposed approach is fixed.

## Local setup

```sh
python -m http.server 8000
# open http://localhost:8000/
```

The included application is static. Viewing it needs no build step or API key. For development checks:

```sh
python -m pip install -r requirements.txt
npm ci
python scripts/verify_site_data.py
npm run test:probe
npm run test:ui
npm run test:probe-ui
```

The browser checks use installed Google Chrome. Source-TIFF validation and asset regeneration require downloads from NASA PGDA and, for fresh ephemeris checks, JPL Horizons. These source files stay in ignored `.cache/`. See [docs/SCIENCE.md](docs/SCIENCE.md) for commands and limits.

## Change standards

### Scientific values

- Keep units, coordinate conventions, source links, time scale and horizon radius explicit.
- Reproduce a changed calculation with a test that can fail for the old behaviour. Compare against an independent source or original TIFF when possible.
- Update the 3D explanation, timeline, CSV and documentation together when a model changes.
- Describe what the model does **not** establish. Do not turn a geometric overlap or adverse 1-RMS shift into a communication probability, power forecast or landing recommendation.
- Avoid committing cached source TIFFs, credentials or personal data.

### Interface and visuals

- Make the primary action clear on phone and desktop. Check overlays at short desktop heights as well as narrow widths.
- Keep controls reachable by pointer, touch and keyboard; respect reduced-motion preferences.
- Label generated film, editorial colour, measured terrain and calculated overlays according to their actual roles.
- Update EN and RU copy for user-visible changes. If adding a new control, verify its selected, loading, error and empty states.

### Pull request

Keep a pull request focused. Include a concise description, verification commands and results, screenshots or a short capture for visual changes, and source/uncertainty notes for scientific changes. The [PR template](.github/PULL_REQUEST_TEMPLATE.md) is a checklist, not a substitute for explanation.

## Licensing and attribution

The repository has no project-wide reuse licence at present. The included Three.js modules retain their upstream MIT licence, and NASA/JPL source data has separate provider terms. Read [CREDITS.md](CREDITS.md) before adding external material. Contributors should submit work they have the right to contribute and identify any third-party assets or model-generated media.
