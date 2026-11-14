"""Check the bundled Site04 ephemeris and measured horizon export."""

import json
import math
from datetime import datetime, timedelta
from pathlib import Path


DATA = Path(__file__).resolve().parents[1] / "science" / "luna_view_site04_data.json"
data = json.loads(DATA.read_text(encoding="utf-8"))

sun, earth = data["sun"], data["earth"]
horizon = data["horizon_elevation_deg"]
profiles = data["horizon_profile_deg"]
distances = data["horizon_distance_m"]
heights = data["horizon_height_m"]
assert len(sun) == len(earth) == 193
assert len(horizon) == len(profiles) == len(distances) == len(heights) == 360

for direction, profile in enumerate(profiles):
    assert 159 <= len(profile) <= 160  # A few rays meet the edge before 8 km.
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
sunlit = sum(map(visible, sun))
earth_clear = sum(map(visible, earth))
shared = sum(visible(s) and visible(e) for s, e in zip(sun, earth))
assert (sunlit, earth_clear, shared) == (193, 0, 0)
print(f"Site04 verified: {sunlit} sunlight, {earth_clear} Earth, {shared} shared / 193 hours")
