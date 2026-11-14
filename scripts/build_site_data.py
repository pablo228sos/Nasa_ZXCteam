import argparse
import json
import math
import re
from pathlib import Path

import numpy as np
import requests
import rasterio
from PIL import Image
from pyproj import CRS, Transformer
from rasterio.enums import Resampling


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'science'
parser = argparse.ArgumentParser(description='Build a documented NASA PGDA lunar study site')
parser.add_argument('--site', choices=('01', '04', '07'), default='04')
args = parser.parse_args()
SITE_ID = args.site
SITE_NAME, SITE_X, SITE_Y = {
    '01': ('Connecting ridge', -11000.0, -12000.0),
    '04': ('Shackleton rim', -1000.0, -7000.0),
    '07': ('Peak near Shackleton', 30000.0, -20000.0),
}[SITE_ID]
SOURCE = ROOT / f'.cache/Site{SITE_ID}_final_adj_5mpp_surf.tif'
SOURCE_URL = f'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site{SITE_ID}/Site{SITE_ID}_final_adj_5mpp_surf.tif'
SIZE = 384


def horizons(target, lon, lat, height_km):
    params = {
        'format': 'json', 'COMMAND': str(target), 'EPHEM_TYPE': 'OBSERVER',
        'CENTER': 'coord@301', 'COORD_TYPE': 'GEODETIC',
        'SITE_COORD': f'{lon % 360:.9f},{lat:.9f},{height_km:.6f}',
        'START_TIME': '2026-11-14 00:00', 'STOP_TIME': '2026-11-22 00:00',
        'STEP_SIZE': '1 h', 'QUANTITIES': '4', 'CSV_FORMAT': 'YES',
        'ANG_FORMAT': 'DEG', 'EXTRA_PREC': 'YES',
    }
    response = requests.get('https://ssd.jpl.nasa.gov/api/horizons.api', params=params, timeout=90)
    response.raise_for_status()
    result = response.json()['result']
    if '$$SOE' not in result or '$$EOE' not in result:
        raise RuntimeError(result[:1000])
    body = result.split('$$SOE', 1)[1].split('$$EOE', 1)[0]
    records = []
    for line in body.splitlines():
        fields = [x.strip() for x in line.split(',')]
        if len(fields) < 5 or not re.match(r'\d{4}-[A-Za-z]{3}-\d\d', fields[0]):
            continue
        records.append([fields[0], float(fields[-3]), float(fields[-2])])
    if len(records) < 190:
        raise RuntimeError(f'Only {len(records)} ephemeris samples for {target}')
    return records


if not SOURCE.exists() or SOURCE.stat().st_size < 40_000_000:
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    partial = SOURCE.with_suffix('.tif.part')
    with requests.get(SOURCE_URL, timeout=120, stream=True) as response:
        response.raise_for_status()
        with partial.open('wb') as destination:
            for chunk in response.iter_content(1 << 20):
                destination.write(chunk)
    if partial.stat().st_size < 40_000_000:
        raise RuntimeError('Incomplete LOLA source download')
    partial.replace(SOURCE)

with rasterio.open(SOURCE) as ds:
    center_col = (SITE_X - ds.bounds.left) / ds.res[0] - 0.5
    center_row = (ds.bounds.top - SITE_Y) / ds.res[1] - 0.5
    c0, r0 = math.floor(center_col), math.floor(center_row)
    dc, dr = center_col - c0, center_row - r0
    patch = ds.read(1, window=((r0, r0 + 2), (c0, c0 + 2))).astype(float)
    center_height = float(
        patch[0, 0] * (1 - dc) * (1 - dr) + patch[0, 1] * dc * (1 - dr)
        + patch[1, 0] * (1 - dc) * dr + patch[1, 1] * dc * dr
    )
    dem = ds.read(1, out_shape=(SIZE, SIZE), resampling=Resampling.bilinear)
    transform = ds.transform * ds.transform.scale(ds.width / SIZE, ds.height / SIZE)
    projected = CRS.from_wkt(ds.crs.to_wkt())
    geographic = projected.geodetic_crs
    to_geo = Transformer.from_crs(projected, geographic, always_xy=True)
    to_proj = Transformer.from_crs(geographic, projected, always_xy=True)
    lon, lat = to_geo.transform(SITE_X, SITE_Y)
    nx, ny = to_proj.transform(lon, lat + 0.001)
    ex, ey = to_proj.transform(lon + 0.01, lat)
    north = np.array([nx - SITE_X, ny - SITE_Y], dtype=float)
    east = np.array([ex - SITE_X, ey - SITE_Y], dtype=float)
    north /= np.linalg.norm(north)
    east /= np.linalg.norm(east)

    # The horizon is from the DEM at this site, with lunar curvature included.
    # It is limited to 8 km and cannot rule out farther relief.
    full = ds.read(1)
    horizon = []
    horizon_distance = []
    horizon_height = []
    horizon_profiles = []
    distances = np.arange(50.0, 8001.0, 50.0)
    for az in range(360):
        angle = math.radians(az)
        direction = north * math.cos(angle) + east * math.sin(angle)
        xs = SITE_X + distances * direction[0]
        ys = SITE_Y + distances * direction[1]
        cols = (xs - ds.bounds.left) / ds.res[0] - 0.5
        rows = (ds.bounds.top - ys) / ds.res[1] - 0.5
        valid = (cols >= 0) & (cols < ds.width - 1) & (rows >= 0) & (rows < ds.height - 1)
        cols = cols[valid]
        rows = rows[valid]
        ranges = distances[valid]
        c0 = np.floor(cols).astype(int)
        r0 = np.floor(rows).astype(int)
        dc, dr = cols - c0, rows - r0
        heights = (
            full[r0, c0] * (1 - dc) * (1 - dr) +
            full[r0, c0 + 1] * dc * (1 - dr) +
            full[r0 + 1, c0] * (1 - dc) * dr +
            full[r0 + 1, c0 + 1] * dc * dr
        )
        curvature = ranges * ranges / (2 * 1_737_400.0)
        slope = np.arctan2(heights - center_height - curvature, ranges)
        blocker = int(np.argmax(slope))
        horizon.append(round(float(np.degrees(slope[blocker])), 3))
        horizon_distance.append(float(ranges[blocker]))
        horizon_height.append(float(heights[blocker]))
        horizon_profiles.append(np.round(np.degrees(slope), 2).tolist())

    # Signed 16-bit metres; the original 5 m pixels are retained in provenance,
    # while this screen mesh has an approximately 42 m display sample pitch.
    np.rint(dem).astype('<i2').tofile(OUT / f'luna_view_site{SITE_ID}_terrain.bin')
    metadata = {
        'width': SIZE, 'height': SIZE,
        'site_id': SITE_ID, 'site_name': SITE_NAME,
        'source': f'NASA PGDA LOLA 5 m/pixel Site{SITE_ID} final adjusted surface',
        'source_url': 'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/',
        'product_url': 'https://pgda.gsfc.nasa.gov/products/78',
        'source_download_url': SOURCE_URL,
        'ephemeris': {'provider': 'JPL Horizons', 'type': 'topocentric apparent azimuth and elevation',
                      'start_utc': '2026-11-14 00:00', 'stop_utc': '2026-11-22 00:00',
                      'step': '1 hour', 'targets': {'sun': 10, 'earth': 399},
                      'moon_center': 'coord@301', 'quantities': '4'},
        'site': {'x_m': SITE_X, 'y_m': SITE_Y, 'lon_e_deg': lon % 360,
                 'lat_deg': lat, 'height_m': center_height},
        'bounds_m': [ds.bounds.left, ds.bounds.bottom, ds.bounds.right, ds.bounds.top],
        'display_sample_m': ds.width * ds.res[0] / SIZE,
        'source_sample_m': ds.res[0],
        'height_range_m': [float(np.min(dem)), float(np.max(dem))],
        'north_xy': north.tolist(), 'east_xy': east.tolist(),
        'horizon_elevation_deg': horizon,
        'horizon_distance_m': horizon_distance,
        'horizon_height_m': horizon_height,
        'horizon_profile_deg': horizon_profiles,
        'horizon_range_m': 8000,
        'horizons_url': 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
        'sun': horizons(10, lon, lat, center_height / 1000),
        'earth': horizons(399, lon, lat, center_height / 1000),
    }
    (OUT / f'luna_view_site{SITE_ID}_data.json').write_text(json.dumps(metadata, separators=(',', ':')), encoding='utf-8')
    normal_size = 2048
    detailed = ds.read(1, out_shape=(normal_size, normal_size), resampling=Resampling.bilinear)
    pitch = 16_000 / normal_size
    dz, dx = np.gradient(detailed, pitch)
    nx, ny, nz = -dx, dz, np.ones_like(detailed)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / length, ny / length, nz / length), axis=2)
    Image.fromarray(np.uint8(np.clip((normal * .5 + .5) * 255, 0, 255))).save(
        OUT / f'luna_view_site{SITE_ID}_normals.png', optimize=True)
    print('site:', lon % 360, lat, center_height)
    print('display range:', metadata['height_range_m'], 'sample:', metadata['display_sample_m'])
    print('north:', north, 'east:', east)
    for index in (0, 12, 24, 96):
        print(index, 'Sun', metadata['sun'][index], 'horizon', horizon[round(metadata['sun'][index][1]) % 360],
              'Earth', metadata['earth'][index])
