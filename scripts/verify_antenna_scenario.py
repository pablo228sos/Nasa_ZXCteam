"""Check raised-antenna horizons against the original NASA LOLA TIFFs.

Run after the source TIFFs have been downloaded into .cache/ by build_site_data.py.
The web app uses 50 m ray profiles rounded to 0.01 degree; this check compares
its derived 2 m and 5 m horizons to fresh bilinear samples of the source DEM.
"""

import json
import math
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[1]
RANGES = np.arange(50.0, 8001.0, 50.0)
MOON_RADIUS = 1_737_400.0


def nearest_azimuth(sample):
    return int(math.floor(sample[1] + 0.5)) % 360


for site in ("01", "04", "07"):
    metadata = json.loads((ROOT / f"science/luna_view_site{site}_data.json").read_text())
    source = ROOT / f".cache/Site{site}_final_adj_5mpp_surf.tif"
    with rasterio.open(source) as dataset:
        dem = dataset.read(1)
        north = np.asarray(metadata["north_xy"])
        east = np.asarray(metadata["east_xy"])
        center = metadata["site"]
        true_horizons = {height: [] for height in (2, 5)}
        web_horizons = {height: [] for height in (2, 5)}

        for azimuth in range(360):
            angle = math.radians(azimuth)
            direction = north * math.cos(angle) + east * math.sin(angle)
            xs = center["x_m"] + RANGES * direction[0]
            ys = center["y_m"] + RANGES * direction[1]
            cols = (xs - dataset.bounds.left) / dataset.res[0] - 0.5
            rows = (dataset.bounds.top - ys) / dataset.res[1] - 0.5
            valid = (cols >= 0) & (cols < dataset.width - 1) & (rows >= 0) & (rows < dataset.height - 1)
            cols, rows, ranges = cols[valid], rows[valid], RANGES[valid]
            c0, r0 = np.floor(cols).astype(int), np.floor(rows).astype(int)
            dc, dr = cols - c0, rows - r0
            heights = (
                dem[r0, c0] * (1 - dc) * (1 - dr)
                + dem[r0, c0 + 1] * dc * (1 - dr)
                + dem[r0 + 1, c0] * (1 - dc) * dr
                + dem[r0 + 1, c0 + 1] * dc * dr
            )
            original_angles = np.radians(metadata["horizon_profile_deg"][azimuth])
            assert len(original_angles) == len(ranges)
            for height in (2, 5):
                true_angles = np.degrees(np.arctan2(
                    heights - center["height_m"] - height - ranges**2 / (2 * MOON_RADIUS),
                    ranges,
                ))
                web_angles = np.degrees(np.arctan(np.tan(original_angles) - height / ranges))
                true_horizons[height].append(float(max(true_angles)))
                web_horizons[height].append(float(max(web_angles)))

    for height in (2, 5):
        max_error = max(abs(a - b) for a, b in zip(true_horizons[height], web_horizons[height]))
        assert max_error <= 0.0051, (site, height, max_error)
        counts = []
        for horizon in (true_horizons[height], web_horizons[height]):
            counts.append(sum(
                sun[2] > metadata["horizon_elevation_deg"][nearest_azimuth(sun)]
                and earth[2] > horizon[nearest_azimuth(earth)]
                for sun, earth in zip(metadata["sun"], metadata["earth"])
            ))
        assert counts[0] == counts[1], (site, height, counts)
        print(f"Site{site}, antenna {height} m: {counts[0]}/193 shared; max horizon rounding error {max_error:.4f} deg")
