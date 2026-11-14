"""Spot-check bundled site coordinates, heights and one hour against source files.

Requires cached NASA GeoTIFFs and network access for independent fresh JPL
Horizons responses. It supplements, rather than replaces, offline consistency
checks; neither test covers relief outside the 8 km study radius.
"""

import json
import math
import re
from pathlib import Path

import rasterio
import requests
from pyproj import CRS, Transformer


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_INDEX = 130  # 19 Nov 2026, 10:00 UTC


def at_center(dataset, x, y):
    col, row = (~dataset.transform) * (x, y)
    col -= .5
    row -= .5
    c, r = math.floor(col), math.floor(row)
    patch = dataset.read(1, window=((r, r + 2), (c, c + 2))).astype(float)
    dx, dy = col - c, row - r
    return float(patch[0, 0] * (1-dx) * (1-dy) + patch[0, 1] * dx * (1-dy)
                 + patch[1, 0] * (1-dx) * dy + patch[1, 1] * dx * dy)


def query_horizons(target, lon, lat, height_km):
    params = {
        'format': 'json', 'COMMAND': str(target), 'EPHEM_TYPE': 'OBSERVER',
        'CENTER': 'coord@301', 'COORD_TYPE': 'GEODETIC',
        'SITE_COORD': f'{lon:.9f},{lat:.9f},{height_km:.6f}',
        'START_TIME': '2026-11-19 10:00', 'STOP_TIME': '2026-11-19 11:00',
        'STEP_SIZE': '1 h', 'QUANTITIES': '4', 'CSV_FORMAT': 'YES',
        'ANG_FORMAT': 'DEG', 'EXTRA_PREC': 'YES',
    }
    response = requests.get('https://ssd.jpl.nasa.gov/api/horizons.api', params=params, timeout=90)
    response.raise_for_status()
    output = response.json()['result']
    if '$$SOE' not in output or '$$EOE' not in output:
        raise ValueError(output[:500])
    for line in output.split('$$SOE', 1)[1].split('$$EOE', 1)[0].splitlines():
        parts = [part.strip() for part in line.split(',')]
        if len(parts) >= 5 and re.match(r'^2026-Nov-19 10:00', parts[0]):
            return float(parts[-3]), float(parts[-2])
    raise ValueError('Requested Horizons hour not found')


for site_id in ('01', '04', '07'):
    data = json.loads((ROOT / f'science/luna_view_site{site_id}_data.json').read_text(encoding='utf-8'))
    site = data['site']
    terrain = ROOT / f'.cache/Site{site_id}_final_adj_5mpp_surf.tif'
    error = ROOT / f'.cache/Site{site_id}_final_adj_5mpp_toterr.tif'
    with rasterio.open(terrain) as dem, rasterio.open(error) as rms_map:
        assert dem.width == rms_map.width and dem.height == rms_map.height
        assert dem.transform.almost_equals(rms_map.transform)
        height = at_center(dem, site['x_m'], site['y_m'])
        rms = at_center(rms_map, site['x_m'], site['y_m'])
        assert abs(height - site['height_m']) < 0.001
        assert abs(rms - data['observer_height_rms_m']) < 0.0001
        projected = CRS.from_wkt(dem.crs.to_wkt())
        lon, lat = Transformer.from_crs(projected, projected.geodetic_crs, always_xy=True).transform(site['x_m'], site['y_m'])
        assert abs(lon % 360 - site['lon_e_deg']) < 0.00001
        assert abs(lat - site['lat_deg']) < 0.00001
    for target, name in ((10, 'sun'), (399, 'earth')):
        expected = data[name][SAMPLE_INDEX]
        az, el = query_horizons(target, site['lon_e_deg'], site['lat_deg'], site['height_m'] / 1000)
        assert expected[0] == '2026-Nov-19 10:00'
        assert abs(az - expected[1]) < .0002 and abs(el - expected[2]) < .0002, (site_id, name, expected, az, el)
    print(f'Site{site_id}: DEM center {height:.3f} m; height RMS {rms:.3f} m; JPL Sun/Earth spot check passed')
