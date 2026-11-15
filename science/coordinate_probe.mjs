// Lunar south-polar stereographic projection of the supplied NASA PGDA grids.
const RADIUS_M = 1_737_400;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function polarProject(latDeg, lonDeg) {
  const range = 2 * RADIUS_M * Math.tan(Math.PI / 4 + latDeg * DEG / 2);
  return { x: range * Math.sin(lonDeg * DEG), y: range * Math.cos(lonDeg * DEG) };
}

export function polarInverse(x, y) {
  return {
    lat: -90 + 2 * Math.atan(Math.hypot(x, y) / (2 * RADIUS_M)) * RAD,
    lon: (Math.atan2(x, y) * RAD + 360) % 360,
  };
}

function basis(latDeg, lonDeg) {
  const lat = latDeg * DEG, lon = lonDeg * DEG;
  const cl = Math.cos(lat), sl = Math.sin(lat), co = Math.cos(lon), so = Math.sin(lon);
  return {
    up: [cl * co, cl * so, sl],
    north: [-sl * co, -sl * so, cl],
    east: [-so, co, 0],
  };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function transferEphemeris(samples, from, to) {
  const source = basis(from.lat_deg, from.lon_e_deg);
  const target = basis(to.lat_deg, to.lon_e_deg);
  return samples.map(([utc, azimuth, elevation]) => {
    const az = azimuth * DEG, el = elevation * DEG;
    const north = Math.cos(el) * Math.cos(az), east = Math.cos(el) * Math.sin(az), up = Math.sin(el);
    const vector = source.up.map((value, index) =>
      value * up + source.north[index] * north + source.east[index] * east);
    return [utc, (Math.atan2(dot(vector, target.east), dot(vector, target.north)) * RAD + 360) % 360,
      Math.asin(Math.max(-1, Math.min(1, dot(vector, target.up)))) * RAD];
  });
}

function sampleArray(grid, x, y, bounds, divisor) {
  const pitch = 5;
  const col = (x - bounds[0]) / pitch - 0.5;
  const row = (bounds[3] - y) / pitch - 0.5;
  if (col < 0 || row < 0 || col >= 3199 || row >= 3199) return NaN;
  const c = Math.floor(col), r = Math.floor(row), dc = col - c, dr = row - r;
  const a = grid[r * 3200 + c], b = grid[r * 3200 + c + 1];
  const d = grid[(r + 1) * 3200 + c], e = grid[(r + 1) * 3200 + c + 1];
  return (a * (1 - dc) * (1 - dr) + b * dc * (1 - dr) + d * (1 - dc) * dr + e * dc * dr) / divisor;
}

export const sampleGrid = (grid, x, y, bounds) => sampleArray(grid, x, y, bounds, 10);
export const sampleRms = (grid, x, y, bounds) => sampleArray(grid, x, y, bounds, 20);

export function decodeDeltaGrid(raw) {
  if (raw.byteLength !== 3200 * 3200 * 2) throw new Error('Probe grid size mismatch');
  const delta = new Int16Array(raw);
  const grid = new Int16Array(delta.length);
  let first = 0;
  for (let row = 0; row < 3200; row++) {
    const start = row * 3200;
    first += delta[start];
    grid[start] = first;
    let height = first;
    for (let col = 1; col < 3200; col++) {
      height += delta[start + col];
      grid[start + col] = height;
    }
  }
  return grid;
}

export function probeHorizon(grid, bounds, x, y, rmsGrid = null) {
  const height = sampleGrid(grid, x, y, bounds);
  if (!Number.isFinite(height)) throw new RangeError('Probe is outside the measured grid');
  const observerRms = rmsGrid ? sampleRms(rmsGrid, x, y, bounds) : null;
  const location = polarInverse(x, y);
  const lon = location.lon * DEG;
  const north = [Math.sin(lon), Math.cos(lon)];
  const east = [Math.cos(lon), -Math.sin(lon)];
  const horizon = [], ranges = [], heights = [], profiles = [], lower = [], upper = [];
  // A 2 km movement envelope leaves a complete 6 km horizon inside the 16 km grid.
  for (let azimuth = 0; azimuth < 360; azimuth++) {
    const az = azimuth * DEG;
    const dx = north[0] * Math.cos(az) + east[0] * Math.sin(az);
    const dy = north[1] * Math.cos(az) + east[1] * Math.sin(az);
    let best = -Infinity, bestRange = 0, bestHeight = 0, bestLower = -Infinity, bestUpper = -Infinity;
    const profile = [];
    for (let distance = 50; distance <= 6000; distance += 50) {
      const terrain = sampleGrid(grid, x + dx * distance, y + dy * distance, bounds);
      if (!Number.isFinite(terrain)) throw new RangeError('Horizon ray leaves the measured grid');
      const angle = Math.atan2(terrain - height - distance * distance / (2 * RADIUS_M), distance) * RAD;
      profile.push(Number(angle.toFixed(2)));
      if (angle > best) { best = angle; bestRange = distance; bestHeight = terrain; }
      if (rmsGrid) {
        const ridgeRms = sampleRms(rmsGrid, x + dx * distance, y + dy * distance, bounds);
        bestLower = Math.max(bestLower, Math.atan2(terrain - height - distance * distance / (2 * RADIUS_M) - ridgeRms - observerRms, distance) * RAD);
        bestUpper = Math.max(bestUpper, Math.atan2(terrain - height - distance * distance / (2 * RADIUS_M) + ridgeRms + observerRms, distance) * RAD);
      }
    }
    horizon.push(Number(best.toFixed(3)));
    ranges.push(bestRange);
    heights.push(Number(bestHeight.toFixed(2)));
    profiles.push(profile);
    if (rmsGrid) { lower.push(Number(bestLower.toFixed(3))); upper.push(Number(bestUpper.toFixed(3))); }
  }
  return { height, location, north, east, horizon, ranges, heights, profiles, lower, upper, observerRms };
}
