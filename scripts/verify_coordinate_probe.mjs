import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { polarProject, polarInverse, transferEphemeris, probeHorizon, decodeDeltaGrid } from '../science/coordinate_probe.mjs';

const sites = Object.fromEntries(await Promise.all(['01', '04', '07'].map(async id =>
  [id, JSON.parse(await readFile(new URL(`../science/luna_view_site${id}_data.json`, import.meta.url), 'utf8'))])));

for (const id of ['01', '04', '07']) {
  const reference = sites[id];
  const projected = polarProject(reference.site.lat_deg, reference.site.lon_e_deg);
  assert.ok(Math.hypot(projected.x - reference.site.x_m, projected.y - reference.site.y_m) < 0.001);
  const inverse = polarInverse(reference.site.x_m, reference.site.y_m);
  assert.ok(Math.abs(inverse.lat - reference.site.lat_deg) < 1e-8);
  const raw = gunzipSync(await readFile(new URL(`../science/luna_view_site${id}_probe_5m.bin.gz`, import.meta.url)));
  const grid = decodeDeltaGrid(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const rmsRaw = gunzipSync(await readFile(new URL(`../science/luna_view_site${id}_probe_rms_5m.bin.gz`, import.meta.url)));
  assert.equal(rmsRaw.byteLength, 3200 * 3200);
  const rmsGrid = new Uint8Array(rmsRaw.buffer, rmsRaw.byteOffset, rmsRaw.byteLength);
  const centerProbe = probeHorizon(grid, reference.bounds_m, reference.site.x_m, reference.site.y_m, rmsGrid);
  const probe = probeHorizon(grid, reference.bounds_m, reference.site.x_m + 400, reference.site.y_m - 650, rmsGrid);
  assert.equal(probe.horizon.length, 360);
  assert.ok(probe.horizon.every(Number.isFinite));
  assert.ok(probe.profiles.every(profile => profile.length === 120));
  assert.ok(probe.ranges.every(range => range >= 50 && range <= 6000));
  assert.equal(probe.upper.length, 360);
  assert.ok(probe.upper.every((angle, index) => angle >= probe.horizon[index] - .001));
  assert.ok(probe.lower.every((angle, index) => angle <= probe.horizon[index] + .001));
  const offsetSite = { lat_deg: probe.location.lat, lon_e_deg: probe.location.lon };
  const shiftedSun = transferEphemeris(reference.sun, reference.site, offsetSite);
  const shiftedEarth = transferEphemeris(reference.earth, reference.site, offsetSite);
  const countShared = (sun, earth, horizon) => sun.reduce((total, sample, index) => {
    const earthSample = earth[index];
    return total + Number(sample[2] > horizon[Math.round(sample[1]) % 360] &&
      earthSample[2] > horizon[Math.round(earthSample[1]) % 360]);
  }, 0);
  console.log(`Site ${id}: 5 m probe, 360 complete 6 km directions; 6 km center ${countShared(reference.sun, reference.earth, centerProbe.horizon)}/193 → shifted ${countShared(shiftedSun, shiftedEarth, probe.horizon)}/193; shifted above 1-RMS upper ${countShared(shiftedSun, shiftedEarth, probe.upper)}/193`);
  const [dx, dy, expectedNominal, expectedUpper] = {
    '01': [250, 500, 173, 165], '04': [-1750, 500, 45, 37], '07': [750, 0, 193, 193],
  }[id];
  const example = probeHorizon(grid, reference.bounds_m, reference.site.x_m + dx, reference.site.y_m + dy, rmsGrid);
  const exampleSite = { lat_deg: example.location.lat, lon_e_deg: example.location.lon };
  const exampleSun = transferEphemeris(reference.sun, reference.site, exampleSite);
  const exampleEarth = transferEphemeris(reference.earth, reference.site, exampleSite);
  const nominal = countShared(exampleSun, exampleEarth, example.horizon);
  const aboveUpper = countShared(exampleSun, exampleEarth, example.upper);
  assert.ok(Math.abs(nominal - expectedNominal) <= 1, `Site${id} example nominal ${nominal}, source ${expectedNominal}`);
  assert.ok(Math.abs(aboveUpper - expectedUpper) <= 1, `Site${id} example 1-RMS upper ${aboveUpper}, source ${expectedUpper}`);
  console.log(`Site ${id} preselected example: ${nominal}/193 geometric, ${aboveUpper}/193 above adverse 1-RMS local horizon`);
}

for (const body of ['sun', 'earth']) for (const id of ['01', '07']) {
  const predicted = transferEphemeris(sites['04'][body], sites['04'].site, sites[id].site);
  let maximumElevationError = 0, maximumAzimuthError = 0;
  predicted.forEach((sample, index) => {
    const reference = sites[id][body][index];
    maximumElevationError = Math.max(maximumElevationError, Math.abs(sample[2] - reference[2]));
    maximumAzimuthError = Math.max(maximumAzimuthError, Math.abs((sample[1] - reference[1] + 540) % 360 - 180));
  });
  assert.ok(maximumElevationError < 0.001, `${body} ${id}: ${maximumElevationError}° elevation error`);
  assert.ok(maximumAzimuthError < 0.005, `${body} ${id}: ${maximumAzimuthError}° azimuth error`);
  console.log(`${body} → Site ${id}: maximum elevation ${maximumElevationError.toFixed(6)}°, azimuth ${maximumAzimuthError.toFixed(6)}°`);
}
