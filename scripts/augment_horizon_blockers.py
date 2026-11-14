"""Add measured horizon blocker distance/height to an existing Site04 export.

This uses the original 5 m source tile, the same 50 m ray samples and lunar
curvature as build_site04_data.py. It makes no network requests.
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source_tif", type=Path)
    parser.add_argument("metadata_json", type=Path)
    args = parser.parse_args()
    metadata = json.loads(args.metadata_json.read_text(encoding="utf-8"))
    with Image.open(args.source_tif) as image:
        full = np.asarray(image).astype(np.float64)
    left, bottom, right, top = metadata["bounds_m"]
    pixel_x = (right - left) / full.shape[1]
    pixel_y = (top - bottom) / full.shape[0]
    site = metadata["site"]
    north = np.array(metadata["north_xy"], dtype=float)
    east = np.array(metadata["east_xy"], dtype=float)
    distances = np.arange(50.0, 8001.0, 50.0)
    blocker_ranges, blocker_heights, horizon_profiles = [], [], []
    for azimuth in range(360):
        angle = math.radians(azimuth)
        direction = north * math.cos(angle) + east * math.sin(angle)
        xs = site["x_m"] + distances * direction[0]
        ys = site["y_m"] + distances * direction[1]
        cols = (xs - left) / pixel_x - 0.5
        rows = (top - ys) / pixel_y - 0.5
        valid = (cols >= 0) & (cols < full.shape[1] - 1) & (rows >= 0) & (rows < full.shape[0] - 1)
        cols, rows, ranges = cols[valid], rows[valid], distances[valid]
        c0, r0 = np.floor(cols).astype(int), np.floor(rows).astype(int)
        dc, dr = cols - c0, rows - r0
        heights = (
            full[r0, c0] * (1 - dc) * (1 - dr)
            + full[r0, c0 + 1] * dc * (1 - dr)
            + full[r0 + 1, c0] * (1 - dc) * dr
            + full[r0 + 1, c0 + 1] * dc * dr
        )
        slope = np.arctan2(heights - site["height_m"] - ranges**2 / (2 * 1_737_400.0), ranges)
        blocker = int(np.argmax(slope))
        assert abs(math.degrees(slope[blocker]) - metadata["horizon_elevation_deg"][azimuth]) < 0.002
        blocker_ranges.append(float(ranges[blocker]))
        blocker_heights.append(round(float(heights[blocker]), 3))
        horizon_profiles.append(np.round(np.degrees(slope), 2).tolist())
    metadata["horizon_distance_m"] = blocker_ranges
    metadata["horizon_height_m"] = blocker_heights
    metadata["horizon_profile_deg"] = horizon_profiles
    args.metadata_json.write_text(json.dumps(metadata, separators=(",", ":")), encoding="utf-8")
    print(f"Added {len(blocker_ranges)} measured horizon blockers")


if __name__ == "__main__":
    main()
