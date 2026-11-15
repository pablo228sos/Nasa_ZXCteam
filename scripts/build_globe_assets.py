"""Build static NASA-sourced lunar atlas textures and coordinate metadata.

The global maps provide visual/geographic context. Local site analysis continues
to use the separate 5 m PGDA LOLA grids in science/.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "nasa-globe"
OUTPUT = ROOT / "media" / "globe"
MOON_KIT = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/"
STAR_KIT = "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/"
SOURCES = {
    "lroc_color_2k.jpg": MOON_KIT + "lroc_color_2k.jpg",
    "lroc_color_16bit_srgb_4k.tif": MOON_KIT + "lroc_color_16bit_srgb_4k.tif",
    "ldem_4_uint.tif": MOON_KIT + "ldem_4_uint.tif",
    "starmap_2020_4k_print.jpg": STAR_KIT + "starmap_2020_4k_print.jpg",
}
RADIUS_M = 1_737_400
HEIGHT_MIN_M = -9_000
HEIGHT_MAX_M = 11_000
LANDMARKS = [
    {"id": "tycho", "name": "Tycho", "lat_deg": -43.30, "lon_e_deg": -11.22,
     "diameter_km": 85.29, "kind": "crater", "source": "https://planetarynames.wr.usgs.gov/Feature/6163"},
    {"id": "copernicus", "name": "Copernicus", "lat_deg": 9.62, "lon_e_deg": -20.08,
     "diameter_km": 96.07, "kind": "crater", "source": "https://planetarynames.wr.usgs.gov/Feature/1296"},
    {"id": "orientale", "name": "Mare Orientale", "lat_deg": -19.87, "lon_e_deg": -94.67,
     "diameter_km": 294.16, "kind": "mare", "source": "https://planetarynames.wr.usgs.gov/Feature/3685"},
    {"id": "tsiolkovskiy", "name": "Tsiolkovskiy", "lat_deg": -20.38, "lon_e_deg": 128.97,
     "diameter_km": 184.39, "kind": "crater", "source": "https://planetarynames.wr.usgs.gov/Feature/6108"},
]


def source_file(name: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        request = Request(SOURCES[name], headers={"User-Agent": "LUNA-VIEW research prototype (ZXC)"})
        with urlopen(request, timeout=120) as response, path.open("wb") as target:
            shutil.copyfileobj(response, target)
    return path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sky_vector(site: dict, sample: list) -> list[float]:
    lat = math.radians(site["lat_deg"])
    lon = math.radians(site["lon_e_deg"])
    az = math.radians(sample[1])
    elevation = math.radians(sample[2])
    up = (math.cos(lat) * math.cos(lon), math.sin(lat), -math.cos(lat) * math.sin(lon))
    north = (-math.sin(lat) * math.cos(lon), math.cos(lat), math.sin(lat) * math.sin(lon))
    east = (-math.sin(lon), 0, -math.cos(lon))
    return [round(up[i] * math.sin(elevation) + north[i] * math.cos(elevation) * math.cos(az)
                  + east[i] * math.cos(elevation) * math.sin(az), 9) for i in range(3)]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sources = {name: source_file(name) for name in SOURCES}

    with Image.open(sources["lroc_color_16bit_srgb_4k.tif"]) as image:
        color = image.convert("RGB")
        color.save(OUTPUT / "moon-color-4k.webp", "WEBP", quality=88, method=6)
        color.resize((2048, 1024), Image.Resampling.LANCZOS).save(
            OUTPUT / "moon-color-2k.webp", "WEBP", quality=82, method=6)
    shutil.copyfile(sources["starmap_2020_4k_print.jpg"], OUTPUT / "stars-2020.jpg")

    with Image.open(sources["ldem_4_uint.tif"]) as image:
        raw = np.asarray(image, dtype=np.int32)
    height_m = (raw - 20_000) / 2
    encoded = np.rint(np.clip((height_m - HEIGHT_MIN_M) / (HEIGHT_MAX_M - HEIGHT_MIN_M), 0, 1) * 255).astype(np.uint8)
    Image.fromarray(encoded, mode="L").save(OUTPUT / "moon-height-4ppd.png", optimize=True)

    source_sites = {
        site_id: json.loads((ROOT / "science" / f"luna_view_site{site_id}_data.json").read_text(encoding="utf-8"))
        for site_id in ("01", "04", "07")
    }
    reference = source_sites["07"]
    data = {
        "globe_visual_source": "https://svs.gsfc.nasa.gov/4720/",
        "star_visual_source": "https://svs.gsfc.nasa.gov/4851/",
        "local_analysis_source": "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/",
        "radius_m": RADIUS_M,
        "height_encoding_m": [HEIGHT_MIN_M, HEIGHT_MAX_M],
        "source_sha256": {name: sha256(path) for name, path in sources.items()},
        "sites": [
            {"id": site_id, "name": item["site_name"], "lat_deg": item["site"]["lat_deg"],
             "lon_e_deg": item["site"]["lon_e_deg"], "height_m": item["site"]["height_m"]}
            for site_id, item in source_sites.items()
        ],
        "landmarks": LANDMARKS,
        "sun": [[sample[0], *sky_vector(reference["site"], sample)] for sample in reference["sun"]],
        "earth": [[sample[0], *sky_vector(reference["site"], sample)] for sample in reference["earth"]],
    }
    (OUTPUT / "atlas-data.json").write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    for path in sorted(OUTPUT.iterdir()):
        print(f"{path.name}: {path.stat().st_size / 1_000_000:.2f} MB")


if __name__ == "__main__":
    main()
