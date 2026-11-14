"""Add a local height-error sensitivity envelope from NASA's LOLA total-Z RMS map.

The envelope moves each sampled terrain height and the observer height by one
reported RMS in opposite directions. It is a sensitivity check, not a
statistical confidence interval or a far-field visibility guarantee.
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
import rasterio
import requests


ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--site', required=True, choices=('01', '04', '07'))
args = parser.parse_args()
site_id = args.site
height_path = ROOT / f'.cache/Site{site_id}_final_adj_5mpp_surf.tif'
error_path = ROOT / f'.cache/Site{site_id}_final_adj_5mpp_toterr.tif'
metadata_path = ROOT / f'science/luna_view_site{site_id}_data.json'
error_url = f'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site{site_id}/Site{site_id}_final_adj_5mpp_toterr.tif'

if not height_path.exists():
    raise FileNotFoundError(f'Build Site{site_id} terrain first: {height_path}')
if not error_path.exists() or error_path.stat().st_size < 40_000_000:
    error_path.parent.mkdir(parents=True, exist_ok=True)
    partial = error_path.with_suffix('.tif.part')
    with requests.get(error_url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with partial.open('wb') as target:
            for chunk in response.iter_content(1 << 20):
                target.write(chunk)
    if partial.stat().st_size < 40_000_000:
        raise RuntimeError('Incomplete NASA total-Z uncertainty download')
    partial.replace(error_path)

meta = json.loads(metadata_path.read_text(encoding='utf-8'))
with rasterio.open(height_path) as dem, rasterio.open(error_path) as error:
    if dem.width != error.width or dem.height != error.height or not dem.transform.almost_equals(error.transform):
        raise ValueError('Height and uncertainty grids are not aligned')
    heights = dem.read(1).astype(np.float64)
    rms = error.read(1).astype(np.float64)
    if not np.isfinite(rms).all() or rms.min() < 0:
        raise ValueError('Uncertainty map has invalid values')
    site = meta['site']
    north, east = np.array(meta['north_xy']), np.array(meta['east_xy'])

    def sample(grid, x, y):
        columns = (x - dem.bounds.left) / dem.res[0] - .5
        rows = (dem.bounds.top - y) / dem.res[1] - .5
        valid = (columns >= 0) & (columns < dem.width - 1) & (rows >= 0) & (rows < dem.height - 1)
        columns, rows = columns[valid], rows[valid]
        c0, r0 = np.floor(columns).astype(int), np.floor(rows).astype(int)
        dc, dr = columns - c0, rows - r0
        values = (grid[r0, c0] * (1-dc) * (1-dr) + grid[r0, c0+1] * dc * (1-dr)
                  + grid[r0+1, c0] * (1-dc) * dr + grid[r0+1, c0+1] * dc * dr)
        return values, valid

    observer_rms = float(sample(rms, np.array([site['x_m']]), np.array([site['y_m']]))[0][0])
    lower, upper = [], []
    ranges = np.arange(50., 8001., 50.)
    for bearing in range(360):
        azimuth = math.radians(bearing)
        direction = north * math.cos(azimuth) + east * math.sin(azimuth)
        x = site['x_m'] + ranges * direction[0]
        y = site['y_m'] + ranges * direction[1]
        ridge_height, valid = sample(heights, x, y)
        ridge_rms, rms_valid = sample(rms, x, y)
        if not np.array_equal(valid, rms_valid):
            raise ValueError('Sampling masks differ')
        d = ranges[valid]
        curvature = d*d / (2 * 1_737_400.)
        center = ridge_height - site['height_m'] - curvature
        lower_angle = np.degrees(np.arctan2(center - ridge_rms - observer_rms, d)).max()
        upper_angle = np.degrees(np.arctan2(center + ridge_rms + observer_rms, d)).max()
        nominal = meta['horizon_elevation_deg'][bearing]
        if not lower_angle - .01 <= nominal <= upper_angle + .01:
            raise ValueError(f'Site{site_id} bearing {bearing}: nominal horizon outside RMS envelope')
        lower.append(round(float(lower_angle), 3))
        upper.append(round(float(upper_angle), 3))

meta['observer_height_rms_m'] = round(observer_rms, 4)
meta['horizon_lower_1rms_deg'] = lower
meta['horizon_upper_1rms_deg'] = upper
meta['height_rms_source_url'] = error_url
meta['height_sensitivity_method'] = 'Opposite +/-1 RMS shifts of observer and sampled ridge heights; 50 m radial samples to 8 km. Sensitivity envelope, not a probability bound.'
temporary = metadata_path.with_suffix('.json.tmp')
temporary.write_text(json.dumps(meta, separators=(',', ':')), encoding='utf-8')
temporary.replace(metadata_path)

def count_above_upper():
    return sum(s[2] > upper[round(s[1]) % 360] and e[2] > upper[round(e[1]) % 360]
               for s, e in zip(meta['sun'], meta['earth']))

print(f'Site{site_id}: observer height RMS {observer_rms:.3f} m, {count_above_upper()}/193 shared samples above upper local horizon envelope')
