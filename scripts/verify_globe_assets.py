"""Offline checks for the bundled NASA-sourced atlas metadata."""

import json
import math
from pathlib import Path


root = Path(__file__).resolve().parents[1]
atlas = json.loads((root / "media/globe/atlas-data.json").read_text(encoding="utf-8"))
assert atlas["radius_m"] == 1_737_400
assert atlas["globe_visual_source"] == "https://svs.gsfc.nasa.gov/4720/"
assert len(atlas["sun"]) == len(atlas["earth"]) == 193
assert [site["id"] for site in atlas["sites"]] == ["01", "04", "07"]

for site in atlas["sites"]:
    original = json.loads((root / "science" / f"luna_view_site{site['id']}_data.json").read_text(encoding="utf-8"))["site"]
    assert math.isclose(site["lat_deg"], original["lat_deg"], abs_tol=1e-10)
    assert math.isclose(site["lon_e_deg"], original["lon_e_deg"], abs_tol=1e-10)
    assert -90 <= site["lat_deg"] <= -88

for sun, earth in zip(atlas["sun"], atlas["earth"]):
    assert sun[0] == earth[0]
    assert math.isclose(math.sqrt(sum(component ** 2 for component in sun[1:])), 1, abs_tol=1e-6)
    assert math.isclose(math.sqrt(sum(component ** 2 for component in earth[1:])), 1, abs_tol=1e-6)

for name in ("moon-color-2k.jpg", "moon-color-4k.jpg", "moon-height-4ppd.png", "stars-2020.jpg"):
    assert (root / "media/globe" / name).stat().st_size > 10_000

print("Atlas: three source-matched sites, 193 normalized Sun/Earth vectors, four maps OK")
