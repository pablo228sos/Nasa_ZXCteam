"""Extract a 2 km close-up mesh directly from each cached NASA LOLA source DEM.

The grid pitch is 5 m, matching the source grid spacing. It must not be
interpreted as 5 m independent measurement resolution: most source pixels
were interpolated by the product team.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio


ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--site', choices=('01', '04', '07', 'all'), default='all')
args = parser.parse_args()

for site_id in (('01', '04', '07') if args.site == 'all' else (args.site,)):
    metadata_path = ROOT / f'science/luna_view_site{site_id}_data.json'
    source_path = ROOT / f'.cache/Site{site_id}_final_adj_5mpp_surf.tif'
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    if not source_path.exists():
        raise FileNotFoundError(f'{source_path}: run build_site_data.py first')

    x0, y0 = metadata['site']['x_m'], metadata['site']['y_m']
    offsets = np.arange(-1000.0, 1000.1, 5.0)
    xs = x0 + offsets[None, :]
    ys = y0 - offsets[:, None]
    with rasterio.open(source_path) as source:
        col = (xs - source.bounds.left) / source.res[0] - 0.5
        row = (source.bounds.top - ys) / source.res[1] - 0.5
        if col.min() < 0 or col.max() >= source.width - 1 or row.min() < 0 or row.max() >= source.height - 1:
            raise ValueError(f'Site{site_id}: close-up extends beyond source DEM')
        c0 = np.floor(col).astype(int)
        r0 = np.floor(row).astype(int)
        dc, dr = col - c0, row - r0
        full = source.read(1)
        heights = (
            full[r0, c0] * (1 - dc) * (1 - dr)
            + full[r0, c0 + 1] * dc * (1 - dr)
            + full[r0 + 1, c0] * (1 - dc) * dr
            + full[r0 + 1, c0 + 1] * dc * dr
        ).astype('<f4')

    if abs(float(heights[200, 200]) - metadata['site']['height_m']) > 0.001:
        raise AssertionError(f'Site{site_id}: center height differs from study point')
    destination = ROOT / f'science/luna_view_site{site_id}_close.bin'
    heights.tofile(destination)
    print(f'Site{site_id}: {heights.shape[0]} x {heights.shape[1]}, 5 m grid, {destination.stat().st_size} bytes')
