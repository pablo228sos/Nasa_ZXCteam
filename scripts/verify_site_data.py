"""Check the bundled ephemerides and measured horizon exports for all sites."""

import json
import math
import struct
from datetime import datetime, timedelta
from pathlib import Path


SCIENCE = Path(__file__).resolve().parents[1] / "science"
EXPECTED = {"01": (193, 42, 42), "04": (193, 0, 0), "07": (192, 95, 95)}


def verify(site_id, expected):
    path = SCIENCE / f"luna_view_site{site_id}_data.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    sun, earth = data["sun"], data["earth"]
    horizon = data["horizon_elevation_deg"]
    profiles = data["horizon_profile_deg"]
    distances = data["horizon_distance_m"]
    heights = data["horizon_height_m"]
    assert data["site_id"] == site_id
    assert len(sun) == len(earth) == 193
    assert len(horizon) == len(profiles) == len(distances) == len(heights) == 360
    terrain = (SCIENCE / f"luna_view_site{site_id}_terrain.bin").read_bytes()
    assert len(terrain) == data["width"] * data["height"] * 2
    sample_heights = [item[0] for item in struct.iter_unpack("<h", terrain)]
    low, high = min(sample_heights), max(sample_heights)
    assert abs(low - data["height_range_m"][0]) <= 0.5
    assert abs(high - data["height_range_m"][1]) <= 0.5

    for direction, profile in enumerate(profiles):
        assert 159 <= len(profile) <= 160  # Some rays meet the tile edge before 8 km.
        assert all(math.isfinite(value) and -90 < value < 90 for value in profile)
        assert abs(max(profile) - horizon[direction]) < 0.01
        blocker_index = round(distances[direction] / 50) - 1
        assert 0 <= blocker_index < len(profile)
        assert abs(profile[blocker_index] - max(profile)) < 0.01
        assert math.isfinite(heights[direction])

    def visible(record):
        _, azimuth, elevation = record
        assert 0 <= azimuth < 360 and -90 <= elevation <= 90
        return elevation > horizon[round(azimuth) % 360]

    hours = [datetime.strptime(record[0], "%Y-%b-%d %H:%M") for record in sun]
    assert all(next_hour - hour == timedelta(hours=1) for hour, next_hour in zip(hours, hours[1:]))
    assert [record[0] for record in sun] == [record[0] for record in earth]
    result = (
        sum(map(visible, sun)),
        sum(map(visible, earth)),
        sum(visible(s) and visible(e) for s, e in zip(sun, earth)),
    )
    assert result == expected, (site_id, result, expected)
    print(f"Site{site_id}: sunlight {result[0]}, Earth {result[1]}, both {result[2]} / 193 hours")
    return [record[0] for record in sun]


time_grids = [verify(site_id, expected) for site_id, expected in EXPECTED.items()]
assert all(grid == time_grids[0] for grid in time_grids[1:])
