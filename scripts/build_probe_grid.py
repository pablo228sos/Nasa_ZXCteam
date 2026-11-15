"""Prepare compact, on-demand 5 m LOLA grids for movable site probes."""

import gzip
from pathlib import Path

import numpy as np
import rasterio


ROOT = Path(__file__).resolve().parents[1]
for site in ('01', '04', '07'):
    source = ROOT / f'.cache/Site{site}_final_adj_5mpp_surf.tif'
    if not source.exists():
        raise FileNotFoundError(source)
    with rasterio.open(source) as dataset:
        if dataset.width != 3200 or dataset.height != 3200 or dataset.res != (5.0, 5.0):
            raise ValueError(f'Unexpected source geometry: {source}')
        source_transform = dataset.transform
        grid = np.rint(dataset.read(1) * 10).astype('<i2')
    # Height is stored at 0.1 m precision. Delta encoding makes the 3200²
    # grid small enough to load only when the visitor moves the study point.
    delta = np.diff(grid.astype('<i4'), axis=1,
                    prepend=np.zeros((grid.shape[0], 1), dtype='<i4'))
    delta[:, 0] = np.diff(grid[:, 0].astype('<i4'), prepend=0)
    if delta.min() < -32768 or delta.max() > 32767:
        raise ValueError(f'Delta exceeds signed 16-bit range for Site{site}')
    output = ROOT / f'science/luna_view_site{site}_probe_5m.bin.gz'
    output.write_bytes(gzip.compress(delta.astype('<i2').tobytes(), compresslevel=1))
    print(f'{site}: {output.name} ({output.stat().st_size:,} bytes)')
    error_source = ROOT / f'.cache/Site{site}_final_adj_5mpp_toterr.tif'
    if not error_source.exists():
        raise FileNotFoundError(error_source)
    with rasterio.open(error_source) as error_dataset:
        if error_dataset.width != 3200 or error_dataset.height != 3200 or not error_dataset.transform.almost_equals(source_transform):
            raise ValueError(f'RMS map does not align with Site{site} elevation grid')
        rms = error_dataset.read(1)
    if not np.isfinite(rms).all() or rms.min() < 0 or rms.max() >= 12.75:
        raise ValueError(f'Unexpected RMS range for Site{site}')
    rms_output = ROOT / f'science/luna_view_site{site}_probe_rms_5m.bin.gz'
    rms_output.write_bytes(gzip.compress(np.rint(rms * 20).astype('u1').tobytes(), compresslevel=1))
    print(f'{site}: {rms_output.name} ({rms_output.stat().st_size:,} bytes)')
