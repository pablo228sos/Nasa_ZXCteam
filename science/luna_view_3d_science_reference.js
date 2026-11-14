import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
let locale = new URLSearchParams(location.search).get('lang') === 'ru' ? 'ru' : 'en';
const copy = {
  en: {
    sunLit: 'SUN ABOVE LOCAL TERRAIN', sunBlocked: 'SUN BLOCKED BY LOCAL TERRAIN',
    earthClear: 'EARTH ABOVE LOCAL TERRAIN', earthBlocked: 'EARTH BLOCKED IN 8 KM MODEL',
    horizon: 'Terrain horizon at', azimuth: 'azimuth',
    surfaceCaption: 'MEASURED RELIEF · ILLUSTRATIVE COLOR', elevationCaption: 'HEIGHT ABOVE LUNAR REFERENCE RADIUS', slopeCaption: 'LOCAL SLOPE FROM DISPLAY MESH', month: 'NOV'
  },
  ru: {
    sunLit: 'СОЛНЦЕ ВЫШЕ МЕСТНОГО РЕЛЬЕФА', sunBlocked: 'СОЛНЦЕ ЗАКРЫТО РЕЛЬЕФОМ',
    earthClear: 'ЗЕМЛЯ ВЫШЕ МЕСТНОГО РЕЛЬЕФА', earthBlocked: 'ЗЕМЛЯ ЗАКРЫТА В МОДЕЛИ 8 КМ',
    horizon: 'Горизонт рельефа при', azimuth: 'азимуте',
    surfaceCaption: 'ИЗМЕРЕННЫЙ РЕЛЬЕФ · УСЛОВНЫЙ ЦВЕТ', elevationCaption: 'ВЫСОТА НАД ОПОРНЫМ РАДИУСОМ ЛУНЫ', slopeCaption: 'ЛОКАЛЬНЫЙ УКЛОН ЭКРАННОЙ СЕТКИ', month: 'НОЯ'
  }
};
function translateStatic() {
  document.documentElement.lang = locale;
  $('language').textContent = locale === 'ru' ? 'EN' : 'RU';
  if (locale !== 'ru') return;
  document.querySelector('.top-center span:first-child').textContent = 'НАУКА / 3D-СЦЕНА';
  document.querySelector('.top-center span:last-child').textContent = '01 — АНАЛИЗ ТОЧКИ';
  document.querySelector('.data-tag').textContent = 'РЕЛЬЕФ LOLA · ИСТОЧНИК 5 М';
  document.querySelector('.intro .eyebrow').textContent = 'ЮЖНЫЙ ПОЛЮС / УЧАСТОК 04';
  document.querySelector('h1').innerHTML = 'Кромка<span>Шеклтона.</span>';
  document.querySelector('.lede').textContent = 'Реальный лунный рельеф. Двигай камеру, меняй час и смотри, как свет встречает поверхность.';
  for (const [node, value] of [...document.querySelectorAll('.coordinate small')].map((x,i) => [x,['ШИРОТА','ДОЛГОТА','ВЫСОТА'][i]])) node.textContent = value;
  document.querySelector('.panel-head .eyebrow').textContent = 'УСЛОВИЯ В ЭТОЙ ТОЧКЕ';
  document.querySelector('.panel-title').textContent = 'Свет и видимость';
  $('mission-kicker').textContent = '01 / ОКНО МИССИИ';
  $('mission-title').textContent = 'Найди время, когда есть свет и путь к Земле.';
  $('find-window').innerHTML = 'НАЙТИ ОКНО МИССИИ <span>↗</span>';
  $('show-why').textContent = 'ПОКАЗАТЬ ПРИЧИНУ НА РЕЛЬЕФЕ ↗';
  $('mission-legend').innerHTML = 'СОЛНЦЕ <i></i> ЗЕМЛЯ <i></i> ОБА <i></i>';
  $('mission-limit').textContent = 'Часовые отсчёты · 14–22 ноя 2026 UTC · горизонт в пределах 8 км. Только геометрическая видимость.';
  document.querySelectorAll('.row small')[0].textContent = 'Высота Солнца';
  document.querySelectorAll('.row small')[1].textContent = 'Высота Земли';
  document.querySelectorAll('.row small')[2].textContent = 'Перепад высот';
  document.querySelectorAll('.row .sub')[2].textContent = 'Участок LOLA 16 × 16 км · вертикальный масштаб 1:1';
  document.querySelector('.panel-foot').textContent = 'Горизонт рассчитан в пределах 8 км. Около 90% пикселей источника LOLA с шагом 5 м интерполированы; шаг экранной сетки — 41,7 м. Цвет и дополнительный свет условны.';
  $('hint').textContent = 'ТЯНИ, ЧТОБЫ ВРАЩАТЬ · КОЛЕСО — ПРИБЛИЖЕНИЕ';
  $('orbit').textContent = 'ОРБИТА'; $('overhead').textContent = 'СВЕРХУ';
  document.querySelector('.timeline-label').textContent = 'ПОЛОЖЕНИЕ СОЛНЦА / УЧАСТОК 04';
  for (const node of document.querySelectorAll('.range-labels span')) node.textContent = node.textContent.replace('NOV','НОЯ');
  $('photometric').textContent = 'ПОВЕРХНОСТЬ'; $('topographic').textContent = 'ВЫСОТА'; $('slope').textContent = 'УКЛОН';
}
translateStatic();
$('language').addEventListener('click', () => { const next = locale === 'ru' ? 'en' : 'ru'; location.href = `${location.pathname}${next === 'ru' ? '?lang=ru' : ''}`; });
if (window.matchMedia('(max-width: 700px)').matches) document.querySelector('.science').classList.add('collapsed');
function updatePanelToggle() {
  const collapsed = document.querySelector('.science').classList.contains('collapsed');
  $('panel-toggle').setAttribute('aria-expanded', String(!collapsed));
  $('panel-toggle').textContent = locale === 'ru' ? (collapsed ? 'ПОКАЗАТЬ ДАННЫЕ ↓' : 'СКРЫТЬ ДАННЫЕ ↑') : (collapsed ? 'SHOW DATA ↓' : 'HIDE DATA ↑');
}
$('panel-toggle').addEventListener('click', () => { document.querySelector('.science').classList.toggle('collapsed'); updatePanelToggle(); });
updatePanelToggle();
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const preferredPixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(preferredPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040608);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 8, 90000);
const fill = new THREE.HemisphereLight(0x9aadb9, 0x0e1117, 1.2);
scene.add(fill);
const sunLight = new THREE.DirectionalLight(0xffdfab, 3.7);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -10500;
sunLight.shadow.camera.right = 10500;
sunLight.shadow.camera.top = 10500;
sunLight.shadow.camera.bottom = -10500;
sunLight.shadow.camera.near = 1000;
sunLight.shadow.camera.far = 85000;
sunLight.shadow.bias = -0.00025;
sunLight.shadow.normalBias = 1.5;
sunLight.target.position.set(0, -200, 0);
scene.add(sunLight, sunLight.target);

const starCount = 440;
const starPositions = new Float32Array(starCount * 3);
let seed = 812131;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < starCount; i++) {
  const a = random() * Math.PI * 2;
  const y = random() * 0.96 - 0.07;
  const r = Math.sqrt(1 - y * y) * 47000;
  starPositions[i * 3] = Math.cos(a) * r;
  starPositions[i * 3 + 1] = y * 47000;
  starPositions[i * 3 + 2] = Math.sin(a) * r;
}
const stars = new THREE.BufferGeometry();
stars.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xb7c5c8, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.56, depthWrite: false })));

const state = { theta: -0.8, elevation: 0.35, radius: 9600, targetTheta: -0.8, targetElevation: 0.35, targetRadius: 9600, overhead: false, interacting: false, mode: 'surface', time: 12, playing: false };
const target = new THREE.Vector3(0, -420, 0);
const eye = new THREE.Vector3();
let terrain, data, surfaceColors, elevationColors, slopeColors;
let evidenceLine, blockerMarker, blockerHalo, missionEvaluated = false, explanationActive = false;
const focusTarget = new THREE.Vector3(0, -420, 0);
const missionText = {
  en: { none: 'No shared window in this interval.', found: 'A shared window is present.', detail: (sun, earth) => `${sun}/193 sunlight samples · ${earth}/193 Earth-visible samples.`, blocked: (gap, range) => `At the selected hour, Earth is ${gap.toFixed(1)}° below the local terrain horizon. The blocking ridge is ${range} away.`, clear: 'Earth clears the local terrain at this hour. Move the time slider to inspect the boundary.', chart: 'Hourly sunlight, Earth visibility and simultaneous visibility from 14 to 22 November 2026' },
  ru: { none: 'В этом интервале общего окна нет.', found: 'В этом интервале есть общее окно.', detail: (sun, earth) => `Солнце: ${sun}/193 отсчётов · Земля: ${earth}/193 отсчётов.`, blocked: (gap, range) => `В выбранный час Земля на ${gap.toFixed(1)}° ниже местного горизонта. Закрывающий гребень — в ${range}.`, clear: 'Земля выше местного горизонта в этот час. Двигай ползунок, чтобы увидеть границу.', chart: 'Часовые отсчёты света, видимости Земли и общего окна 14–22 ноября 2026' }
};
const measuredNormalMap = new THREE.TextureLoader().load('./luna_view_site04_normals.png');
measuredNormalMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const terrainMaterial = (mode) => new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
  normalMap: measuredNormalMap, normalScale: new THREE.Vector2(1, 1),
  emissive: mode === 'surface' ? 0x000000 : 0x111111,
  emissiveIntensity: mode === 'surface' ? 0 : .42,
});

function mix(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function colorMix(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
function gradient(t, stops) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const f = clamp((t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]), 0, 1);
      return colorMix(stops[i - 1][1], stops[i][1], f);
    }
  }
  return stops.at(-1)[1];
}

function makeTerrain(raw) {
  const n = data.width;
  const heights = new Int16Array(raw);
  const count = n * n;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices = new Uint32Array((n - 1) * (n - 1) * 6);
  surfaceColors = new Float32Array(count * 3);
  elevationColors = new Float32Array(count * 3);
  slopeColors = new Float32Array(count * 3);
  const pitch = data.display_sample_m;
  const min = data.height_range_m[0], max = data.height_range_m[1];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const index = row * n + col;
    const h = heights[index];
    positions[index * 3] = (col + 0.5) * pitch - 8000;
    positions[index * 3 + 1] = h - data.site.height_m;
    positions[index * 3 + 2] = (row + 0.5) * pitch - 8000;
    uvs[index * 2] = col / (n - 1);
    uvs[index * 2 + 1] = 1 - row / (n - 1);
    const left = heights[row * n + Math.max(0, col - 1)];
    const right = heights[row * n + Math.min(n - 1, col + 1)];
    const top = heights[Math.max(0, row - 1) * n + col];
    const bottom = heights[Math.min(n - 1, row + 1) * n + col];
    const slope = Math.atan(Math.hypot((right - left) / (2 * pitch), (bottom - top) / (2 * pitch))) * 180 / Math.PI;
    const heightNorm = clamp((h - min) / (max - min), 0, 1);
    const noise = (Math.sin(row * 17.33 + col * 49.71) * Math.cos(row * 87.19 - col * 12.17)) * 0.027;
    const shade = clamp(0.44 + heightNorm * 0.15 - slope * 0.0014 + noise, 0.24, 0.67);
    surfaceColors.set([shade * 1.02, shade * 1.01, shade * 0.97], index * 3);
    elevationColors.set(gradient(heightNorm, [[0, [0.05, 0.18, 0.23]], [0.4, [0.18, 0.37, 0.42]], [0.7, [0.60, 0.63, 0.58]], [1, [0.94, 0.75, 0.48]]]), index * 3);
    slopeColors.set(gradient(clamp(slope / 28, 0, 1), [[0, [0.12, 0.22, 0.25]], [0.35, [0.46, 0.55, 0.52]], [0.7, [0.83, 0.56, 0.32]], [1, [0.95, 0.30, 0.18]]]), index * 3);
  }
  let k = 0;
  for (let row = 0; row < n - 1; row++) for (let col = 0; col < n - 1; col++) {
    const a = row * n + col, b = a + 1, c = a + n, d = c + 1;
    indices[k++] = a; indices[k++] = c; indices[k++] = b;
    indices[k++] = b; indices[k++] = c; indices[k++] = d;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(surfaceColors.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const material = terrainMaterial('surface');
  terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  const ring = new THREE.Mesh(new THREE.RingGeometry(108, 112, 72), new THREE.MeshBasicMaterial({ color: 0xf0d3a1, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 8;
  scene.add(ring);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 110, 8), new THREE.MeshBasicMaterial({ color: 0xe0d0ad }));
  pin.position.y = 60;
  scene.add(pin);
  const pinTop = new THREE.Mesh(new THREE.SphereGeometry(15, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe3a9 }));
  pinTop.position.y = 118;
  scene.add(pinTop);
}

function updateTime() {
  if (!data) return;
  const index = Math.round(state.time);
  const sun = data.sun[index], earth = data.earth[index];
  const sunHorizon = data.horizon_elevation_deg[Math.round(sun[1]) % 360];
  const earthHorizon = data.horizon_elevation_deg[Math.round(earth[1]) % 360];
  const fmt = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}°`;
  $('sun-el').textContent = fmt(sun[2]);
  $('earth-el').textContent = fmt(earth[2]);
  $('sun-horizon').textContent = `${copy[locale].horizon} ${sun[1].toFixed(1)}° ${copy[locale].azimuth}: ${fmt(sunHorizon)}`;
  $('earth-horizon').textContent = `${copy[locale].horizon} ${earth[1].toFixed(1)}° ${copy[locale].azimuth}: ${fmt(earthHorizon)}`;
  $('sun-status').textContent = sun[2] > sunHorizon ? copy[locale].sunLit : copy[locale].sunBlocked;
  $('earth-status').textContent = earth[2] > earthHorizon ? copy[locale].earthClear : copy[locale].earthBlocked;
  const date = new Date(Date.UTC(2026, 10, 14, index));
  $('date').textContent = `${date.getUTCDate()} ${copy[locale].month} ${date.getUTCFullYear()} · ${String(date.getUTCHours()).padStart(2,'0')}:00 UTC`;
  $('time').value = index;
  $('time').style.setProperty('--progress', `${index / 192 * 100}%`);

  const az = sun[1] * Math.PI / 180, el = sun[2] * Math.PI / 180;
  const north = data.north_xy, east = data.east_xy;
  const eastComponent = east[0] * Math.sin(az) + north[0] * Math.cos(az);
  const northComponent = east[1] * Math.sin(az) + north[1] * Math.cos(az);
  const distance = 40000;
  sunLight.position.set(eastComponent * Math.cos(el) * distance, Math.sin(el) * distance, -northComponent * Math.cos(el) * distance);
  sunLight.intensity = sun[2] > sunHorizon ? 3.7 : 0.35;
  sunLight.color.set(sun[2] < 4 ? 0xffca88 : 0xffe2b7);
  if (explanationActive) updateEvidence(index);
}

function statusAt(index) {
  const sun = data.sun[index], earth = data.earth[index];
  return [sun[2] > data.horizon_elevation_deg[Math.round(sun[1]) % 360], earth[2] > data.horizon_elevation_deg[Math.round(earth[1]) % 360]];
}

function renderEvidenceProfile(azimuth, earthElevation, blockerDistance) {
  const profile = data.horizon_profile_deg[azimuth];
  const lowest = Math.min(earthElevation, ...profile) - 1.5;
  const highest = Math.max(earthElevation, ...profile) + 1.5;
  const width = 280, height = 100, left = 10, right = 270, top = 13, bottom = 75;
  const px = index => left + index / 159 * (right - left);
  const py = angle => bottom - (angle - lowest) / (highest - lowest) * (bottom - top);
  const ridge = Math.round(blockerDistance / 50) - 1;
  const points = profile.map((angle, index) => `${px(index).toFixed(1)},${py(angle).toFixed(1)}`).join(' ');
  const rayY = py(earthElevation).toFixed(1);
  const ridgeX = px(ridge).toFixed(1), ridgeY = py(profile[ridge]).toFixed(1);
  const label = locale === 'ru' ? 'ПРОФИЛЬ РЕЛЬЕФА / ЛИНИЯ НА ЗЕМЛЮ' : 'TERRAIN PROFILE / LINE TO EARTH';
  const range = locale === 'ru' ? '8 КМ' : '8 KM';
  const distanceText = blockerDistance < 1000 ? `${blockerDistance.toFixed(0)} ${locale === 'ru' ? 'М' : 'M'}` : `${(blockerDistance / 1000).toFixed(1)} ${locale === 'ru' ? 'КМ' : 'KM'}`;
  const container = $('mission-profile');
  container.setAttribute('aria-label', `${label}. ${locale === 'ru' ? 'Препятствие' : 'Blocker'} ${distanceText}, ${profile[ridge].toFixed(1)}°, ${locale === 'ru' ? 'Земля' : 'Earth'} ${earthElevation.toFixed(1)}°.`);
  container.innerHTML = `<span>${label}</span><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="M ${left} ${bottom} L ${points.replaceAll(' ', ' L ')} L ${right} ${bottom} Z" fill="rgba(169,204,203,.13)"/><polyline points="${points}" fill="none" stroke="#adc8cf" stroke-width="1.5" vector-effect="non-scaling-stroke"/><line x1="${left}" y1="${rayY}" x2="${right}" y2="${rayY}" stroke="#f7d99e" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/><circle cx="${ridgeX}" cy="${ridgeY}" r="4" fill="#fff0bd"/><text x="${left}" y="95">0</text><text x="${right}" y="95" text-anchor="end">${range}</text></svg><small>${distanceText} · ${profile[ridge].toFixed(1)}° / ${earthElevation.toFixed(1)}°</small>`;
}

function updateEvidence(index) {
  const earth = data.earth[index];
  const azimuth = Math.round(earth[1]) % 360;
  const distance = data.horizon_distance_m[azimuth];
  const height = data.horizon_height_m[azimuth] - data.site.height_m;
  const az = earth[1] * Math.PI / 180;
  const x = distance * (data.east_xy[0] * Math.sin(az) + data.north_xy[0] * Math.cos(az));
  const z = -distance * (data.east_xy[1] * Math.sin(az) + data.north_xy[1] * Math.cos(az));
  const rayHeight = distance * Math.tan(earth[2] * Math.PI / 180) + distance * distance / (2 * 1_737_400);
  evidenceLine.geometry.setFromPoints([new THREE.Vector3(0, 36, 0), new THREE.Vector3(x, rayHeight, z)]);
  blockerMarker.position.set(x, height + 44, z);
  blockerHalo.position.copy(blockerMarker.position);
  const markerScale = clamp(distance * .06, window.innerWidth < 700 ? 110 : 36, 260);
  blockerHalo.scale.setScalar(markerScale / 80);
  blockerMarker.scale.setScalar(markerScale / 80);
  focusTarget.set(x * .48, height * .22, z * .48);
  const gap = data.horizon_elevation_deg[azimuth] - earth[2];
  const distanceText = distance < 1000 ? `${distance.toFixed(0)} ${locale === 'ru' ? 'М' : 'M'}` : `${(distance / 1000).toFixed(1)} ${locale === 'ru' ? 'КМ' : 'KM'}`;
  $('mission-detail').textContent = gap > 0 ? missionText[locale].blocked(gap, distanceText) : missionText[locale].clear;
  $('evidence-callout').textContent = `${locale === 'ru' ? 'ГРЕБЕНЬ' : 'BLOCKING RIDGE'} · ${distanceText}`;
  renderEvidenceProfile(azimuth, earth[2], distance);
}

function findMissionWindow() {
  if (!data) return;
  const samples = data.sun.map((_, index) => statusAt(index));
  const sunlight = samples.filter(x => x[0]).length;
  const earth = samples.filter(x => x[1]).length;
  const shared = samples.map(x => x[0] && x[1]);
  const result = $('mission-result');
  result.hidden = false;
  $('mission-summary').textContent = shared.some(Boolean) ? missionText[locale].found : missionText[locale].none;
  $('mission-detail').textContent = missionText[locale].detail(sunlight, earth);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${samples.length} 48`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  for (let row = 0; row < 3; row++) {
    const background = document.createElementNS(ns, 'rect');
    for (const [key, value] of Object.entries({ x: 0, y: row * 16, width: samples.length, height: 9, fill: '#283337' })) background.setAttribute(key, value);
    svg.append(background);
  }
  for (let i = 0; i < samples.length; i++) {
    for (let row = 0; row < 3; row++) {
      if (![samples[i][0], samples[i][1], shared[i]][row]) continue;
      const bar = document.createElementNS(ns, 'rect');
      for (const [key, value] of Object.entries({ x: i, y: row * 16, width: 1, height: 9, fill: ['#d8b97e', '#9dc6ce', '#edf4ec'][row] })) bar.setAttribute(key, value);
      svg.append(bar);
    }
  }
  $('mission-chart').replaceChildren(svg);
  $('mission-chart').setAttribute('aria-label', missionText[locale].chart);
  svg.addEventListener('pointerdown', event => {
    const bounds = svg.getBoundingClientRect();
    state.time = clamp(Math.round((event.clientX - bounds.left) / bounds.width * (samples.length - 1)), 0, samples.length - 1);
    updateTime();
  });
  missionEvaluated = true;
  if (window.matchMedia('(max-width: 700px)').matches) result.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'center' });
}

function showWhy() {
  if (!data || !missionEvaluated) return;
  explanationActive = true;
  $('evidence-callout').hidden = false;
  $('mission-profile').hidden = false;
  state.interacting = true;
  document.body.classList.add('explaining');
  document.querySelector('.science').classList.add('explaining');
  if (!evidenceLine) {
    evidenceLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa6dce4, transparent: true, opacity: .95, depthTest: false }));
    evidenceLine.renderOrder = 9;
    blockerMarker = new THREE.Mesh(new THREE.SphereGeometry(65, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffc684, depthTest: false }));
    blockerMarker.renderOrder = 10;
    blockerHalo = new THREE.Mesh(new THREE.RingGeometry(82, 92, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: .95, depthTest: false }));
    blockerHalo.renderOrder = 11;
    scene.add(evidenceLine, blockerMarker, blockerHalo);
  }
  // The best Earth-clearance hour gives a reproducible explanation when no window exists.
  if (!data.earth.some((_, index) => statusAt(index)[1])) {
    let best = 0, bestGap = -Infinity;
    data.earth.forEach((earth, index) => {
      const gap = earth[2] - data.horizon_elevation_deg[Math.round(earth[1]) % 360];
      if (gap > bestGap) { bestGap = gap; best = index; }
    });
    state.time = best;
  }
  updateTime();
  const azimuth = Math.round(data.earth[Math.round(state.time)][1]) % 360;
  const distance = data.horizon_distance_m[azimuth];
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  state.targetRadius = mobile ? 9600 : clamp(distance * 8, 6200, 9600);
  state.targetElevation = mobile ? .9 : .55;
  state.targetTheta = Math.atan2(-blockerMarker.position.x, -blockerMarker.position.z);
  if (mobile) window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
}

$('find-window').addEventListener('click', findMissionWindow);
$('show-why').addEventListener('click', showWhy);

function setMode(mode) {
  if (!terrain) return;
  state.mode = mode;
  const color = mode === 'elevation' ? elevationColors : mode === 'slope' ? slopeColors : surfaceColors;
  terrain.geometry.attributes.color.array.set(color);
  terrain.geometry.attributes.color.needsUpdate = true;
  terrain.material.dispose();
  terrain.material = terrainMaterial(mode);
  for (const [id, value] of [['photometric','surface'],['topographic','elevation'],['slope','slope']]) $(id).classList.toggle('active', mode === value);
  $('legend').classList.toggle('visible', mode !== 'surface');
  $('legend').classList.toggle('slope', mode === 'slope');
  $('legend-min').textContent = mode === 'slope' ? '0°' : '−2.85 KM';
  $('legend-max').textContent = mode === 'slope' ? '≥28°' : '+1.80 KM';
  $('mode-caption').textContent = mode === 'surface' ? copy[locale].surfaceCaption : mode === 'elevation' ? copy[locale].elevationCaption : copy[locale].slopeCaption;
}

for (const [id, mode] of [['photometric','surface'],['topographic','elevation'],['slope','slope']]) $(id).addEventListener('click', () => setMode(mode));
$('time').addEventListener('input', (event) => { state.time = Number(event.target.value); updateTime(); });
$('play').addEventListener('click', () => { state.playing = !state.playing; $('play').textContent = state.playing ? 'Ⅱ' : '▶'; });
$('overhead').addEventListener('click', () => { state.overhead = true; state.targetElevation = 1.45; state.targetRadius = 17000; $('overhead').classList.add('active'); $('orbit').classList.remove('active'); });
$('orbit').addEventListener('click', () => { state.overhead = false; state.targetElevation = 0.35; state.targetRadius = 9600; $('orbit').classList.add('active'); $('overhead').classList.remove('active'); });
let pointer = null;
canvas.addEventListener('pointerdown', event => { pointer = { x: event.clientX, y: event.clientY }; state.interacting = true; canvas.setPointerCapture(event.pointerId); $('hint').classList.add('hidden'); });
canvas.addEventListener('pointermove', event => {
  if (!pointer) return;
  state.targetTheta -= (event.clientX - pointer.x) * .004;
  state.targetElevation = clamp(state.targetElevation + (event.clientY - pointer.y) * .003, .08, 1.5);
  pointer = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', () => { pointer = null; });
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('wheel', event => { event.preventDefault(); state.interacting = true; state.targetRadius = clamp(state.targetRadius * Math.exp(event.deltaY * .0007), 2300, 26000); $('hint').classList.add('hidden'); }, { passive: false });
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(preferredPixelRatio()); renderer.setSize(window.innerWidth, window.innerHeight); });

let last = performance.now(), playAccumulator = 0;
let renderActive = true;
window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data?.type === 'luna-visibility') renderActive = Boolean(event.data.active);
});
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (state.playing) {
    playAccumulator += dt;
    if (playAccumulator >= .34) { playAccumulator = 0; state.time = state.time >= 192 ? 0 : state.time + 1; updateTime(); }
  }
  if (!reduceMotion && !state.interacting && !state.overhead) state.targetTheta -= dt * .018;
  const smooth = 1 - Math.exp(-dt * 3.6);
  state.theta = mix(state.theta, state.targetTheta, smooth);
  state.elevation = mix(state.elevation, state.targetElevation, smooth);
  state.radius = mix(state.radius, state.targetRadius, smooth);
  target.lerp(focusTarget, smooth);
  const planar = Math.cos(state.elevation) * state.radius;
  eye.set(target.x + Math.sin(state.theta) * planar, target.y + Math.sin(state.elevation) * state.radius, target.z + Math.cos(state.theta) * planar);
  camera.position.copy(eye);
  camera.lookAt(target);
  if (blockerHalo) blockerHalo.quaternion.copy(camera.quaternion);
  if (blockerMarker) {
    const onScreen = blockerMarker.position.clone().project(camera);
    const callout = $('evidence-callout');
    callout.hidden = onScreen.z < -1 || onScreen.z > 1 || Math.abs(onScreen.x) > .95 || Math.abs(onScreen.y) > .9;
    callout.style.left = `${clamp((onScreen.x + 1) * .5 * window.innerWidth, 12, window.innerWidth - 240)}px`;
    callout.style.top = `${clamp((1 - onScreen.y) * .5 * window.innerHeight, 70, window.innerHeight - 110)}px`;
  }
  if (renderActive) renderer.render(scene, camera);
}
requestAnimationFrame(animate);

try {
  const [metadataResponse, terrainResponse] = await Promise.all([fetch('./luna_view_site04_data.json'), fetch('./luna_view_site04_terrain.bin')]);
  if (!metadataResponse.ok || !terrainResponse.ok) throw new Error('Could not load site data');
  data = await metadataResponse.json();
  makeTerrain(await terrainResponse.arrayBuffer());
  setMode('surface');
  updateTime();
  $('lat').textContent = `${Math.abs(data.site.lat_deg).toFixed(4)}° S`;
  $('lon').textContent = `${data.site.lon_e_deg.toFixed(4)}° E`;
  $('alt').textContent = `+${Math.round(data.site.height_m)} m`;
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 1000);
} catch (error) {
  $('loading').textContent = `DATA LOAD FAILED · ${error.message}`;
  console.error(error);
}
