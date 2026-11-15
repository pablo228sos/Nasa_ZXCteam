"""Independently evaluate the one-click examples on original float NASA TIFFs."""

import json
import math
from pathlib import Path

import numpy as np
import rasterio


ROOT = Path(__file__).resolve().parents[1]
RADIUS = 1_737_400.0
EXAMPLES = {'01': (250, 500), '04': (-1750, 500), '07': (750, 0)}


def bilinear(grid, bounds, x, y):
    col = (x - bounds.left) / 5 - .5
    row = (bounds.top - y) / 5 - .5
    c, r = np.floor(col).astype(int), np.floor(row).astype(int)
    dc, dr = col - c, row - r
    return (grid[r, c] * (1 - dc) * (1 - dr) + grid[r, c + 1] * dc * (1 - dr)
            + grid[r + 1, c] * (1 - dc) * dr + grid[r + 1, c + 1] * dc * dr)


def horizon(grid, rms_grid, bounds, x, y):
    longitude = math.atan2(x, y)
    azimuth = np.deg2rad(np.arange(360))[:, None]
    distance = np.arange(50, 6001, 50)[None, :]
    east = np.array([math.cos(longitude), -math.sin(longitude)])
    north = np.array([math.sin(longitude), math.cos(longitude)])
    dx = north[0] * np.cos(azimuth) + east[0] * np.sin(azimuth)
    dy = north[1] * np.cos(azimuth) + east[1] * np.sin(azimuth)
    height = bilinear(grid, bounds, x, y)
    rays = bilinear(grid, bounds, x + dx * distance, y + dy * distance)
    ridge_rms = bilinear(rms_grid, bounds, x + dx * distance, y + dy * distance)
    observer_rms = bilinear(rms_grid, bounds, x, y)
    nominal = rays - height - distance * distance / (2 * RADIUS)
    return (np.degrees(np.arctan2(nominal, distance)).max(axis=1),
            np.degrees(np.arctan2(nominal + ridge_rms + observer_rms, distance)).max(axis=1))


def basis(lat, lon):
    lat, lon = np.deg2rad([lat, lon])
    return np.array([
        [math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)],
        [-math.sin(lat) * math.cos(lon), -math.sin(lat) * math.sin(lon), math.cos(lat)],
        [-math.sin(lon), math.cos(lon), 0],
    ])


def rotate(samples, from_site, lat, lon):
    values = np.asarray(samples)
    azimuth, elevation = np.deg2rad(values[:, 1].astype(float)), np.deg2rad(values[:, 2].astype(float))
    components = np.stack([np.sin(elevation), np.cos(elevation) * np.cos(azimuth), np.cos(elevation) * np.sin(azimuth)], axis=1)
    direction = components @ basis(from_site['lat_deg'], from_site['lon_e_deg'])
    local = direction @ basis(lat, lon).T
    return np.stack([np.mod(np.degrees(np.arctan2(local[:, 2], local[:, 1])), 360),
                     np.degrees(np.arcsin(local[:, 0]))], axis=1)


def count(data, terrain, rms_grid, bounds, x, y):
    latitude = -90 + 2 * math.degrees(math.atan(math.hypot(x, y) / (2 * RADIUS)))
    longitude = math.degrees(math.atan2(x, y)) % 360
    contour, upper = horizon(terrain, rms_grid, bounds, x, y)
    sun = rotate(data['sun'], data['site'], latitude, longitude)
    earth = rotate(data['earth'], data['site'], latitude, longitude)
    sun_clear = sun[:, 1] > contour[np.floor(sun[:, 0] + .5).astype(int) % 360]
    earth_clear = earth[:, 1] > contour[np.floor(earth[:, 0] + .5).astype(int) % 360]
    sun_robust = sun[:, 1] > upper[np.floor(sun[:, 0] + .5).astype(int) % 360]
    earth_robust = earth[:, 1] > upper[np.floor(earth[:, 0] + .5).astype(int) % 360]
    return int(np.count_nonzero(sun_clear & earth_clear)), int(np.count_nonzero(sun_robust & earth_robust))


for site, (dx, dy) in EXAMPLES.items():
    data = json.loads((ROOT / f'science/luna_view_site{site}_data.json').read_text())
    with rasterio.open(ROOT / f'.cache/Site{site}_final_adj_5mpp_surf.tif') as source, rasterio.open(ROOT / f'.cache/Site{site}_final_adj_5mpp_toterr.tif') as rms_source:
        terrain = source.read(1)
        rms_grid = rms_source.read(1)
        x, y = data['site']['x_m'], data['site']['y_m']
        original = count(data, terrain, rms_grid, source.bounds, x, y)
        moved = count(data, terrain, rms_grid, source.bounds, x + dx, y + dy)
        print(f'Site{site}: original float TIFF 6 km nominal/above-1RMS '
              f'{original[0]}/{original[1]} -> {moved[0]}/{moved[1]} of 193, '
              f'displacement {math.hypot(dx, dy):.0f} m')
