"""Compare compressed 5 m probe heights and RMS envelope with NASA TIFFs."""

import gzip
import json
import math
from pathlib import Path

import numpy as np
import rasterio


ROOT = Path(__file__).resolve().parents[1]
R = 1_737_400.0


def sample(grid, bounds, pitch, x, y):
    col = (x - bounds.left) / pitch - .5
    row = (bounds.top - y) / pitch - .5
    c, r = np.floor(col).astype(int), np.floor(row).astype(int)
    dc, dr = col - c, row - r
    return (grid[r, c] * (1 - dc) * (1 - dr) + grid[r, c + 1] * dc * (1 - dr)
            + grid[r + 1, c] * (1 - dc) * dr + grid[r + 1, c + 1] * dc * dr)


for site in ('01', '04', '07'):
    data = json.loads((ROOT / f'science/luna_view_site{site}_data.json').read_text())
    with rasterio.open(ROOT / f'.cache/Site{site}_final_adj_5mpp_surf.tif') as source, rasterio.open(ROOT / f'.cache/Site{site}_final_adj_5mpp_toterr.tif') as rms_source:
        full = source.read(1)
        full_rms = rms_source.read(1)
        delta = np.frombuffer(gzip.decompress((ROOT / f'science/luna_view_site{site}_probe_5m.bin.gz').read_bytes()), dtype='<i2').reshape(3200, 3200)
        row_bases = np.cumsum(delta[:, 0].astype('<i4')) - delta[:, 0]
        grid = np.cumsum(delta.astype('<i4'), axis=1) + row_bases[:, None]
        grid = grid / 10
        packed_rms = np.frombuffer(gzip.decompress((ROOT / f'science/luna_view_site{site}_probe_rms_5m.bin.gz').read_bytes()), dtype='u1').reshape(3200, 3200) / 20
        x, y = data['site']['x_m'] + 400, data['site']['y_m'] - 650
        lon = math.atan2(x, y)
        az = np.deg2rad(np.arange(360))[:, None]
        distances = np.arange(50, 6001, 50)[None, :]
        dx = math.sin(lon) * np.cos(az) + math.cos(lon) * np.sin(az)
        dy = math.cos(lon) * np.cos(az) - math.sin(lon) * np.sin(az)
        xs, ys = x + dx * distances, y + dy * distances
        fine_h = sample(full, source.bounds, 5, xs, ys)
        coarse_h = sample(grid, source.bounds, 5, xs, ys)
        fine_center = sample(full, source.bounds, 5, x, y)
        coarse_center = sample(grid, source.bounds, 5, x, y)
        fine_rms = sample(full_rms, source.bounds, 5, xs, ys)
        coarse_rms = sample(packed_rms, source.bounds, 5, xs, ys)
        fine_observer_rms = sample(full_rms, source.bounds, 5, x, y)
        coarse_observer_rms = sample(packed_rms, source.bounds, 5, x, y)
        curvature = distances * distances / (2 * R)
        fine_angles = np.degrees(np.arctan2(fine_h - fine_center - curvature, distances))
        coarse_angles = np.degrees(np.arctan2(coarse_h - coarse_center - curvature, distances))
        fine_horizon = fine_angles.max(axis=1)
        coarse_horizon = coarse_angles.max(axis=1)
        max_difference = float(np.max(np.abs(fine_horizon - coarse_horizon)))
        fine_upper = np.degrees(np.arctan2(fine_h - fine_center - curvature + fine_rms + fine_observer_rms, distances)).max(axis=1)
        coarse_upper = np.degrees(np.arctan2(coarse_h - coarse_center - curvature + coarse_rms + coarse_observer_rms, distances)).max(axis=1)
        max_upper_difference = float(np.max(np.abs(fine_upper - coarse_upper)))
        print(f'Site{site}: observer height difference {abs(fine_center - coarse_center):.2f} m; '
              f'max horizon difference {max_difference:.3f} deg; '
              f'max upper 1-RMS horizon difference {max_upper_difference:.3f} deg')
        if max_difference > .1 or max_upper_difference > .12:
            raise AssertionError('Probe grid differs too much from original DEM for this exploratory model')
