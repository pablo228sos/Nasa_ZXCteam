// Inspect the 6 km local model for demonstration candidates; not a site ranking.
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { decodeDeltaGrid, polarInverse, probeHorizon, transferEphemeris } from '../science/coordinate_probe.mjs';

const site = process.argv[2] || '07';
if (!['01', '04', '07'].includes(site)) throw new Error('Choose 01, 04 or 07');
const base = JSON.parse(await readFile(new URL(`../science/luna_view_site${site}_data.json`, import.meta.url), 'utf8'));
const packed = gunzipSync(await readFile(new URL(`../science/luna_view_site${site}_probe_5m.bin.gz`, import.meta.url)));
const grid = decodeDeltaGrid(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength));
const candidates = [];
for (let dx = -1750; dx <= 1750; dx += 250) for (let dy = -1750; dy <= 1750; dy += 250) {
  if (Math.hypot(dx, dy) > 1850) continue;
  const x = base.site.x_m + dx, y = base.site.y_m + dy;
  const probe = probeHorizon(grid, base.bounds_m, x, y);
  const geo = polarInverse(x, y);
  const to = { lat_deg: geo.lat, lon_e_deg: geo.lon };
  const sun = transferEphemeris(base.sun, base.site, to);
  const earth = transferEphemeris(base.earth, base.site, to);
  const shared = sun.reduce((count, sample, index) =>
    count + Number(sample[2] > probe.horizon[Math.round(sample[1]) % 360] &&
      earth[index][2] > probe.horizon[Math.round(earth[index][1]) % 360]), 0);
  candidates.push({ dx, dy, distance: Math.round(Math.hypot(dx, dy)), height: Math.round(probe.height), shared });
}
candidates.sort((a, b) => b.shared - a.shared);
console.log(`Site${site} strongest`, candidates.slice(0, 10));
console.log(`Site${site} weakest`, candidates.slice(-10));
