import * as THREE from 'three';
import { polarProject, polarInverse, transferEphemeris, probeHorizon, decodeDeltaGrid } from './coordinate_probe.mjs';

const $ = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
if (query.get('embed') === '1') document.body.classList.add('embedded');
const siteId = ['01', '04', '07'].includes(query.get('site')) ? query.get('site') : '04';
const compareTarget = siteId === '04' ? '07' : '04';
let locale = query.get('lang') === 'ru' ? 'ru' : 'en';
let selectedDay = /^2026-11-(1[4-9]|2[01])$/.test(query.get('day') || '') ? query.get('day') : 'all';
let antennaHeight = [0, 2, 5].includes(Number(query.get('antenna'))) ? Number(query.get('antenna')) : 0;
const selectionBounds = () => selectedDay === 'all' ? [0, 192] : [(Number(selectedDay.slice(-2)) - 14) * 24, (Number(selectedDay.slice(-2)) - 14) * 24 + 23];
const siteChoice = document.createElement('label');
siteChoice.className = 'site-choice';
siteChoice.htmlFor = 'site-choice';
siteChoice.innerHTML = '<span>STUDY SITE</span><select id="site-choice"><option value="04">04 / Shackleton rim</option><option value="01">01 / Connecting ridge</option><option value="07">07 / Peak near Shackleton</option></select>';
document.querySelector('.panel-title').before(siteChoice);
$('site-choice').value = siteId;
const dayChoice = document.createElement('label');
dayChoice.className = 'site-choice day-choice';
dayChoice.htmlFor = 'day-choice';
dayChoice.innerHTML = `<span>SEARCH PERIOD · UTC</span><select id="day-choice"><option value="all">14–22 NOV · ALL SAMPLES</option>${Array.from({length:8}, (_, i) => `<option value="2026-11-${String(i+14).padStart(2,'0')}">${i+14} NOV 2026</option>`).join('')}</select>`;
siteChoice.after(dayChoice);
$('day-choice').value = selectedDay;
const probeTool = document.createElement('form');
probeTool.id = 'probe-tool';
probeTool.className = 'probe-tool';
probeTool.hidden = true;
probeTool.innerHTML = '<span class="probe-heading">02 / MOVE THE STUDY POINT</span><p id="probe-help">Choose a coordinate within 2 km of this site, or pick a point on the 3D terrain. The local horizon is recalculated from the 5 m LOLA grid.</p><button type="button" id="probe-example" class="probe-example">TRY A NEARBY POINT ↗</button><small class="probe-example-note" id="probe-example-note">PRESELECTED EXAMPLE · NOT A LANDING RECOMMENDATION</small><div class="probe-fields"><label>LATITUDE ° S<input id="probe-lat" inputmode="decimal" type="number" min="87" max="90" step="any" required></label><label>LONGITUDE ° E<input id="probe-lon" inputmode="decimal" type="number" min="0" max="360" step="any" required></label></div><div class="probe-actions"><button type="submit" id="probe-analyze">ANALYZE POINT ↗</button><button type="button" id="probe-pick">PICK IN 3D ◎</button></div><button type="button" class="probe-reset" id="probe-reset">RESET TO REFERENCE SITE</button><small class="probe-status" id="probe-status" role="status"></small>';
dayChoice.after(probeTool);
const probeOutcome = document.createElement('div');
probeOutcome.className = 'probe-outcome';
probeOutcome.hidden = true;
$('probe-open').after(probeOutcome);
const compareButton = document.createElement('button');
compareButton.id = 'compare-site';
compareButton.className = 'mission-secondary';
compareButton.type = 'button';
compareButton.textContent = compareTarget === '07' ? 'COMPARE WITH SHACKLETON PEAK ↗' : 'COMPARE WITH SHACKLETON RIM ↗';
$('mission-limit').before(compareButton);
const exportButton = document.createElement('button');
exportButton.id = 'export-hours';
exportButton.className = 'mission-export';
exportButton.type = 'button';
exportButton.textContent = 'DOWNLOAD HOURLY EVIDENCE CSV ↓';
$('mission-limit').after(exportButton);
$('mission-detail').after($('show-why'));
const antennaScenario = document.createElement('div');
antennaScenario.className = 'antenna-scenario';
antennaScenario.innerHTML = '<span id="antenna-label">WHAT IF THE ANTENNA WERE HIGHER?</span><div class="antenna-options" role="group" aria-label="Antenna height above the surface"><button type="button" data-antenna="0">0 M</button><button type="button" data-antenna="2">2 M</button><button type="button" data-antenna="5">5 M</button></div><p id="antenna-impact"></p><small id="antenna-method">Earth line of sight changes; ground sunlight does not. Local geometry only.</small>';
$('show-why').after(antennaScenario);
const probeDelta = document.createElement('p');
probeDelta.id = 'probe-delta';
probeDelta.className = 'probe-delta';
probeDelta.hidden = true;
$('show-why').after(probeDelta);
function updateAntennaButtons() {
  for (const button of antennaScenario.querySelectorAll('button')) {
    const active = Number(button.dataset.antenna) === antennaHeight;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
updateAntennaButtons();
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
  $('back-home').textContent = '← АТЛАС';
  document.querySelector('.top-center span:first-child').textContent = 'НАУКА / 3D-СЦЕНА';
  document.querySelector('.top-center span:last-child').textContent = '01 — АНАЛИЗ ТОЧКИ';
  document.querySelector('.data-tag').textContent = 'РЕЛЬЕФ LOLA · ИСТОЧНИК 5 М';
  document.querySelector('.intro .eyebrow').textContent = 'ЮЖНЫЙ ПОЛЮС / УЧАСТОК 04';
  document.querySelector('h1').innerHTML = 'Кромка<span>Шеклтона.</span>';
  document.querySelector('.lede').textContent = 'Реальный лунный рельеф. Двигай камеру, меняй час и смотри, как свет встречает поверхность.';
  for (const [node, value] of [...document.querySelectorAll('.coordinate small')].map((x,i) => [x,['ШИРОТА','ДОЛГОТА','ВЫСОТА'][i]])) node.textContent = value;
  document.querySelector('.panel-head .eyebrow').textContent = 'УСЛОВИЯ В ЭТОЙ ТОЧКЕ';
  siteChoice.querySelector('span').textContent = 'ИССЛЕДУЕМЫЙ УЧАСТОК';
  dayChoice.querySelector('span').textContent = 'ПЕРИОД ПОИСКА · UTC';
  $('probe-open').textContent = 'ПЕРЕМЕСТИТЬ ТОЧКУ ИССЛЕДОВАНИЯ ↗';
  probeTool.querySelector('.probe-heading').textContent = '02 / ВЫБРАТЬ СВОЮ ТОЧКУ';
  $('probe-help').textContent = 'Введи координаты в пределах 2 км от центра участка или выбери точку на 3D-рельефе. Горизонт пересчитается по сетке LOLA с шагом 5 м.';
  $('probe-example').textContent = 'ПОПРОБОВАТЬ СОСЕДНЮЮ ТОЧКУ ↗';
  $('probe-example-note').textContent = 'ЗАРАНЕЕ ВЫБРАННЫЙ ПРИМЕР · НЕ РЕКОМЕНДАЦИЯ ДЛЯ ПОСАДКИ';
  probeTool.querySelectorAll('.probe-fields label')[0].firstChild.textContent = 'ШИРОТА ° Ю.Ш.';
  probeTool.querySelectorAll('.probe-fields label')[1].firstChild.textContent = 'ДОЛГОТА ° В.Д.';
  $('probe-analyze').textContent = 'РАССЧИТАТЬ ТОЧКУ ↗';
  $('probe-pick').textContent = 'ВЫБРАТЬ В 3D ◎';
  $('probe-reset').textContent = 'ВЕРНУТЬ ОПОРНУЮ ТОЧКУ';
  $('day-choice').options[0].textContent = '14–22 НОЯ · ВСЕ ОТСЧЁТЫ';
  for (let i = 1; i < $('day-choice').options.length; i++) $('day-choice').options[i].textContent = `${i+13} НОЯ 2026`;
  $('site-choice').options[0].textContent = '04 / Кромка Шеклтона';
  $('site-choice').options[1].textContent = '01 / Соединяющий гребень';
  $('site-choice').options[2].textContent = '07 / Пик у Шеклтона';
  document.querySelector('.panel-title').textContent = 'Свет и видимость';
  $('mission-kicker').textContent = '01 / ОКНО МИССИИ';
  $('mission-title').textContent = 'Найди время, когда есть свет и путь к Земле.';
  $('antenna-label').textContent = 'А ЕСЛИ ПОДНЯТЬ АНТЕННУ?';
  antennaScenario.querySelector('.antenna-options').setAttribute('aria-label', 'Высота антенны над поверхностью');
  $('antenna-method').textContent = 'Меняется видимость Земли; освещение поверхности прежнее. Только местная геометрия.';
  $('back-to-result').textContent = 'К РЕЗУЛЬТАТУ ↓';
  $('find-window').innerHTML = 'НАЙТИ ОКНО МИССИИ <span>↗</span>';
  $('show-why').textContent = 'ПОКАЗАТЬ ПРИЧИНУ НА РЕЛЬЕФЕ ↗';
  $('mission-legend').innerHTML = 'СОЛНЦЕ <i></i> ЗЕМЛЯ <i></i> ОБА <i></i>';
  $('mission-limit').textContent = 'Часовые отсчёты · 14–22 ноя 2026 UTC · горизонт в пределах 8 км. Только геометрическая видимость.';
  compareButton.textContent = compareTarget === '07' ? 'СРАВНИТЬ С ПИКОМ У ШЕКЛТОНА ↗' : 'СРАВНИТЬ С КРОМКОЙ ШЕКЛТОНА ↗';
  exportButton.textContent = 'СКАЧАТЬ ЧАСОВЫЕ ДАННЫЕ CSV ↓';
  document.querySelectorAll('.row small')[0].textContent = 'Высота Солнца';
  document.querySelectorAll('.row small')[1].textContent = 'Высота Земли';
  document.querySelectorAll('.row small')[2].textContent = 'Перепад высот';
  document.querySelectorAll('.row .sub')[2].textContent = 'Участок LOLA 16 × 16 км · вертикальный масштаб 1:1';
  document.querySelector('.panel-foot').textContent = 'Горизонт рассчитан в пределах 8 км. Около 90% пикселей LOLA с шагом 5 м интерполированы. Широкая 3D-сетка имеет шаг 41,7 м; дополнительная деталь 2 км — 5 м. Цвет и дополнительный свет условны.';
  document.querySelector('.panel-sources a:last-child').textContent = 'ОШИБКА ВЫСОТЫ ↗';
  $('hint').textContent = 'ТЯНИ, ЧТОБЫ ВРАЩАТЬ · КОЛЕСО — ПРИБЛИЖЕНИЕ';
  $('orbit').textContent = 'ОРБИТА'; $('overhead').textContent = 'СВЕРХУ';
  document.querySelector('.timeline-label').textContent = 'ПОЛОЖЕНИЕ СОЛНЦА / УЧАСТОК 04';
  for (const node of document.querySelectorAll('.range-labels span')) node.textContent = node.textContent.replace('NOV','НОЯ');
  $('photometric').textContent = 'ПОВЕРХНОСТЬ'; $('topographic').textContent = 'ВЫСОТА'; $('slope').textContent = 'УКЛОН';
}
translateStatic();
function openSite(nextSite, nextLocale = locale, autoFind = false) {
  const params = new URLSearchParams();
  params.set('site', nextSite);
  if (nextLocale === 'ru') params.set('lang', 'ru');
  if (selectedDay !== 'all') params.set('day', selectedDay);
  if (antennaHeight) params.set('antenna', String(antennaHeight));
  if (autoFind) params.set('find', '1');
  if (nextSite === siteId && probeActive) {
    params.set('lat', data.site.lat_deg.toFixed(6));
    params.set('lon', data.site.lon_e_deg.toFixed(6));
  }
  location.href = `${location.pathname}${params.size ? `?${params}` : ''}`;
}
$('language').addEventListener('click', () => openSite(siteId, locale === 'ru' ? 'en' : 'ru', missionEvaluated));
$('site-choice').addEventListener('change', event => openSite(event.target.value, locale, missionEvaluated));
compareButton.addEventListener('click', () => openSite(compareTarget, locale, true));
$('day-choice').addEventListener('change', event => {
  selectedDay = event.target.value;
  const params = new URLSearchParams(location.search);
  if (selectedDay === 'all') params.delete('day'); else params.set('day', selectedDay);
  params.set('find', '1');
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  const [start] = selectionBounds();
  state.time = start + 12;
  explanationActive = false;
  $('show-why').classList.remove('active');
  $('show-why').setAttribute('aria-pressed', 'false');
  detailActive = false;
  if (terrain) terrain.visible = true;
  if (closeTerrain) closeTerrain.visible = false;
  setSiteMarkerScale(false);
  state.targetRadius = 9600;
  state.targetElevation = .35;
  document.body.classList.remove('explaining');
  document.querySelector('.science').classList.remove('explaining');
  $('mission-profile').hidden = true;
  if (detailButton) detailButton.style.display = 'none';
  $('evidence-callout').hidden = true;
  if (evidenceLine) { evidenceLine.visible = false; blockerMarker.visible = false; blockerHalo.visible = false; }
  updateSelectedRange();
  if (data) { updateTime(); findMissionWindow(); }
});
exportButton.addEventListener('click', () => {
  if (!data || !missionEvaluated) return;
  const rows = [['site_id','site_lat_deg','site_lon_e_deg','observer_height_m','antenna_height_m','horizon_range_m','dem_sample_m','ephemeris_method','utc','sun_azimuth_deg','sun_elevation_deg','sun_terrain_horizon_deg','sun_above','earth_azimuth_deg','earth_elevation_deg','earth_terrain_horizon_deg','earth_above','both','sun_horizon_lower_1rms_deg','sun_horizon_upper_1rms_deg','earth_horizon_lower_1rms_deg','earth_horizon_upper_1rms_deg','both_above_upper_1rms','dem_source','ephemeris_source','height_rms_source']];
  const [start, end] = selectionBounds();
  data.sun.slice(start, end + 1).forEach((sun, offset) => {
    const index = start + offset;
    const earth = data.earth[index];
    const [sunAbove, earthAbove] = statusAt(index);
    const sunDirection = Math.round(sun[1]) % 360, earthDirection = Math.round(earth[1]) % 360;
    const lower = antennaHeight === 0 ? data.horizon_lower_1rms_deg : null, upper = antennaHeight === 0 ? data.horizon_upper_1rms_deg : null;
    rows.push([siteId, data.site.lat_deg, data.site.lon_e_deg, data.site.height_m, antennaHeight, data.horizon_range_m, data.source_sample_m, probeActive ? 'rotated bundled JPL Horizons direction' : 'JPL Horizons topocentric direct', sun[0], sun[1], sun[2], data.horizon_elevation_deg[sunDirection], sunAbove, earth[1], earth[2], earthHorizonByAzimuth[earthDirection], earthAbove, sunAbove && earthAbove, lower?.[sunDirection] ?? '', upper?.[sunDirection] ?? '', lower?.[earthDirection] ?? '', upper?.[earthDirection] ?? '', upper ? sun[2] > upper[sunDirection] && earth[2] > upper[earthDirection] : '', data.source_download_url, data.horizons_url, data.height_rms_source_url ?? '']);
  });
  const blob = new Blob([rows.map(row => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `luna-view-site${siteId}${probeActive ? `-point-${Math.abs(data.site.lat_deg).toFixed(4)}S-${data.site.lon_e_deg.toFixed(4)}E` : ''}-hourly-${selectedDay === 'all' ? '2026-11-14-to-22' : selectedDay}-antenna-${antennaHeight}m.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});
if (window.matchMedia('(max-width: 700px)').matches) document.querySelector('.science').classList.add('collapsed');
function updatePanelToggle() {
  const collapsed = document.querySelector('.science').classList.contains('collapsed');
  $('panel-toggle').setAttribute('aria-expanded', String(!collapsed));
  $('panel-toggle').textContent = locale === 'ru' ? (collapsed ? 'ПОКАЗАТЬ ДАННЫЕ ↓' : 'СКРЫТЬ ДАННЫЕ ↑') : (collapsed ? 'SHOW DATA ↓' : 'HIDE DATA ↑');
}
$('panel-toggle').addEventListener('click', () => { document.querySelector('.science').classList.toggle('collapsed'); updatePanelToggle(); });
updatePanelToggle();
const canvas = $('scene');
for (const [id, active] of [['orbit', true], ['overhead', false], ['play', false], ['find-window', false], ['show-why', false]]) $(id).setAttribute('aria-pressed', String(active));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const preferredPixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(preferredPixelRatio());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040608);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 8, 90000);
const fill = new THREE.HemisphereLight(0x9aadb9, 0x0e1117, 1.2);
scene.add(fill);
scene.add(new THREE.AmbientLight(0x8598a0, 0.65));
const sunLight = new THREE.DirectionalLight(0xffdfab, 3.7);
sunLight.castShadow = false;
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

let probeActive = false;
const state = { theta: -0.8, elevation: 0.35, radius: 9600, targetTheta: -0.8, targetElevation: 0.35, targetRadius: 9600, overhead: false, interacting: false, mode: 'surface', time: 12, playing: false };
if (selectedDay !== 'all') state.time = selectionBounds()[0] + 12;
updateSelectedRange();
const target = new THREE.Vector3(0, -420, 0);
const eye = new THREE.Vector3();
let terrain, closeTerrain, closeColors, siteMarkerParts, data, baselineData, probeGrid, probeRms, referenceProbe6, placementActive = false, surfaceColors, elevationColors, slopeColors;
let earthProfiles, earthHorizonByAzimuth, earthBlockerByAzimuth;
let evidenceLine, blockerMarker, blockerHalo, detailButton, missionEvaluated = false, explanationActive = false;
let detailActive = false;
const focusTarget = new THREE.Vector3(0, -420, 0);
const pluralRu = (count, one, few, many) => count % 100 >= 11 && count % 100 <= 14 ? many : count % 10 === 1 ? one : count % 10 >= 2 && count % 10 <= 4 ? few : many;
const missionText = {
  en: { none: 'No shared window in this interval.', found: (start, end, count) => `Longest sampled overlap: ${start} → ${end} (${count} hourly points).`, detail: (sun, earth, shared, bestHour, margin, total) => shared ? `${shared}/${total} shared samples. Largest minimum angular clearance: +${margin.toFixed(2)}° at ${bestHour}.` : `${sun}/${total} sunlight samples · ${earth}/${total} Earth-visible samples.`, blocked: (gap, range) => `At the selected hour, Earth is ${gap.toFixed(1)}° below the local terrain horizon. The blocking ridge is ${range} away.`, clear: (earthGap, sunGap) => `At this hour: Earth +${earthGap.toFixed(2)}°, Sun +${sunGap.toFixed(2)}° above local terrain. The smaller margin limits the overlap; this is not a verified communication or power window.`, chart: (range) => `Hourly sunlight, Earth visibility and simultaneous visibility, ${range}` },
  ru: { none: 'В этом интервале общего окна нет.', found: (start, end, count) => `Самая длинная серия общих отсчётов: ${start} — ${end} (${count} ${pluralRu(count, 'точка', 'точки', 'точек')} с шагом 1 час).`, detail: (sun, earth, shared, bestHour, margin, total) => shared ? `${shared}/${total} общих отсчётов. Наибольший минимальный угловой запас: +${margin.toFixed(2)}° в ${bestHour}.` : `Солнце: ${sun}/${total} отсчётов · Земля: ${earth}/${total} отсчётов.`, blocked: (gap, range) => `В выбранный час Земля на ${gap.toFixed(1)}° ниже местного горизонта. Закрывающий гребень — в ${range}.`, clear: (earthGap, sunGap) => `В этот час Земля на +${earthGap.toFixed(2)}°, Солнце на +${sunGap.toFixed(2)}° выше местного рельефа. Меньший запас ограничивает общее окно; это не проверенное окно связи или энергии.`, chart: (range) => `Часовые отсчёты света, видимости Земли и общего окна, ${range}` }
};
const measuredNormalMap = new THREE.TextureLoader().load(`./luna_view_site${siteId}_normals.png`);
measuredNormalMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const terrainMaterial = (mode) => mode === 'surface'
  ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide, normalMap: measuredNormalMap, normalScale: new THREE.Vector2(1, 1) })
  : new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });

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
    const edgeDistance = Math.min(row, col, n - 1 - row, n - 1 - col) * pitch;
    const edgeFade = clamp(edgeDistance / 1800, 0, 1);
    const shade = clamp(0.44 + heightNorm * 0.15 - slope * 0.0014 + noise, 0.24, 0.67) * edgeFade * edgeFade;
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
  terrain.receiveShadow = false;
  terrain.castShadow = false;
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
  const referenceRing = new THREE.Mesh(new THREE.RingGeometry(89, 94, 72), new THREE.MeshBasicMaterial({ color: 0x9fc8c8, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  referenceRing.rotation.x = -Math.PI / 2;
  referenceRing.position.y = 12;
  referenceRing.visible = false;
  const comparisonLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa8d4d0, transparent: true, opacity: .7, depthWrite: false }));
  comparisonLine.visible = false;
  scene.add(referenceRing, comparisonLine);
  siteMarkerParts = { ring, pin, pinTop, referenceRing, comparisonLine };
}

function observerOffset() {
  if (!data || !baselineData) return { x: 0, y: 0, z: 0 };
  return { x: data.site.x_m - baselineData.site.x_m,
    y: data.site.height_m - baselineData.site.height_m,
    z: baselineData.site.y_m - data.site.y_m };
}

function setSiteMarkerScale(close) {
  if (!siteMarkerParts) return;
  const { ring, pin, pinTop, referenceRing, comparisonLine } = siteMarkerParts;
  const origin = observerOffset();
  ring.scale.setScalar(close ? .16 : 1);
  pin.scale.setScalar(close ? .15 : 1);
  pinTop.scale.setScalar(close ? .2 : 1);
  ring.position.set(origin.x, origin.y + (close ? 2 : 8), origin.z);
  pin.position.set(origin.x, origin.y + (close ? 10 : 60), origin.z);
  pinTop.position.set(origin.x, origin.y + (close ? 20 : 118), origin.z);
  referenceRing.visible = probeActive;
  comparisonLine.visible = probeActive;
  if (probeActive) comparisonLine.geometry.setFromPoints([new THREE.Vector3(0, 30, 0), new THREE.Vector3(origin.x, origin.y + 30, origin.z)]);
}

function makeCloseTerrain(raw) {
  const n = 401, pitch = 5;
  const heights = new Float32Array(raw);
  if (heights.length !== n * n) throw new Error('Close terrain tile size does not match 401²');
  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const indices = new Uint32Array((n - 1) * (n - 1) * 6);
  closeColors = { surface: colors, elevation: new Float32Array(colors.length), slope: new Float32Array(colors.length) };
  const min = data.height_range_m[0], max = data.height_range_m[1];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const index = row * n + col, h = heights[index];
    const x = col * pitch - 1000, z = row * pitch - 1000;
    positions.set([x, h - data.site.height_m, z], index * 3);
    uvs.set([(x + 8000) / 16000, 1 - (z + 8000) / 16000], index * 2);
    const left = heights[row * n + Math.max(0, col - 1)], right = heights[row * n + Math.min(n - 1, col + 1)];
    const top = heights[Math.max(0, row - 1) * n + col], bottom = heights[Math.min(n - 1, row + 1) * n + col];
    const slope = Math.atan(Math.hypot((right - left) / (2 * pitch), (bottom - top) / (2 * pitch))) * 180 / Math.PI;
    const heightNorm = clamp((h - min) / (max - min), 0, 1);
    const shade = clamp(.44 + heightNorm * .15 - slope * .0014, .24, .67);
    closeColors.surface.set([shade * 1.02, shade * 1.01, shade * .97], index * 3);
    closeColors.elevation.set(gradient(heightNorm, [[0, [.05,.18,.23]], [.4,[.18,.37,.42]], [.7,[.60,.63,.58]], [1,[.94,.75,.48]]]), index * 3);
    closeColors.slope.set(gradient(clamp(slope / 28, 0, 1), [[0,[.12,.22,.25]], [.35,[.46,.55,.52]], [.7,[.83,.56,.32]], [1,[.95,.30,.18]]]), index * 3);
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
  geometry.setAttribute('color', new THREE.BufferAttribute(closeColors.surface.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  closeTerrain = new THREE.Mesh(geometry, terrainMaterial('surface'));
  closeTerrain.visible = false;
  closeTerrain.castShadow = false;
  closeTerrain.receiveShadow = false;
  scene.add(closeTerrain);
}

function selectedRangeLabel() {
  return selectedDay === 'all' ? (locale === 'ru' ? '14–22 ноя 2026 UTC' : '14–22 Nov 2026 UTC') : `${Number(selectedDay.slice(-2))} ${locale === 'ru' ? 'ноя' : 'Nov'} 2026 UTC`;
}
function probeRangeLabel() { return probeActive ? '6' : '8'; }
function recalculateEarthHorizon() {
  if (!data) return;
  earthProfiles = antennaHeight === 0 ? data.horizon_profile_deg : data.horizon_profile_deg.map(profile => profile.map((angle, index) => {
    const distance = (index + 1) * 50;
    return Math.atan(Math.tan(angle * Math.PI / 180) - antennaHeight / distance) * 180 / Math.PI;
  }));
  earthHorizonByAzimuth = antennaHeight === 0 ? data.horizon_elevation_deg : [];
  earthBlockerByAzimuth = [];
  for (let azimuth = 0; azimuth < 360; azimuth++) {
    if (antennaHeight === 0) {
      earthBlockerByAzimuth.push(Math.round(data.horizon_distance_m[azimuth] / 50) - 1);
      continue;
    }
    let bestIndex = 0;
    for (let index = 1; index < earthProfiles[azimuth].length; index++) {
      if (earthProfiles[azimuth][index] > earthProfiles[azimuth][bestIndex]) bestIndex = index;
    }
    earthBlockerByAzimuth.push(bestIndex);
    earthHorizonByAzimuth.push(earthProfiles[azimuth][bestIndex]);
  }
}
function probeMessage(message, error = false) {
  $('probe-status').textContent = message;
  $('probe-status').classList.toggle('error', error);
}
function updateObserverUI() {
  $('lat').textContent = `${Math.abs(data.site.lat_deg).toFixed(4)}° S`;
  $('lon').textContent = `${data.site.lon_e_deg.toFixed(4)}° E`;
  $('alt').textContent = `${data.site.height_m >= 0 ? '+' : '−'}${Math.round(Math.abs(data.site.height_m))} m`;
  $('probe-lat').value = Math.abs(data.site.lat_deg).toFixed(6);
  $('probe-lon').value = data.site.lon_e_deg.toFixed(6);
  document.querySelector('.intro .eyebrow').textContent = locale === 'ru'
    ? `ЮЖНЫЙ ПОЛЮС / УЧАСТОК ${siteId}${probeActive ? ' · СВОЯ ТОЧКА' : ''}`
    : `SOUTH POLAR STUDY AREA / SITE ${siteId}${probeActive ? ' · YOUR POINT' : ''}`;
  document.querySelector('.panel-foot').textContent = probeActive
    ? (locale === 'ru' ? 'Точка: сетки NASA LOLA высоты и total-Z RMS с шагом 5 м; 360 направлений × 6 км, отсчёты каждые 50 м. Положения Солнца и Земли перенесены из JPL Horizons. RMS-полоса — проверка чувствительности, не вероятность связи; рельеф дальше 6 км не учтён.' : 'Point: 5 m NASA LOLA elevation and total-Z RMS grids; 360 directions × 6 km, sampled every 50 m. Sun and Earth directions are transformed from JPL Horizons. The RMS envelope tests input sensitivity, not link probability; terrain beyond 6 km is not included.')
    : (locale === 'ru' ? 'Горизонт рассчитан в пределах 8 км. Около 90% пикселей LOLA с шагом 5 м интерполированы. Широкая 3D-сетка имеет шаг 41,7 м; дополнительная деталь 2 км — 5 м. Цвет и дополнительный свет условны.' : 'Horizon is modeled within 8 km. The 5 m LOLA source has ~90% interpolated pixels. The wide 3D mesh samples at 41.7 m; optional 2 km detail uses the 5 m grid. Color and fill light aid reading, not measurement.');
  updateSelectedRange();
}
async function analyzeProbe(latSouth, lonEast) {
  if (!baselineData) return;
  if (!Number.isFinite(latSouth) || !Number.isFinite(lonEast) || latSouth < 87 || latSouth > 90 || lonEast < 0 || lonEast > 360) {
    probeMessage(locale === 'ru' ? 'Введи южную широту 87–90° и восточную долготу 0–360°.' : 'Enter south latitude 87–90° and east longitude 0–360°.', true);
    return;
  }
  const projected = polarProject(-latSouth, lonEast);
  const distance = Math.hypot(projected.x - baselineData.site.x_m, projected.y - baselineData.site.y_m);
  if (distance > 1980) {
    const otherSite = Object.entries({ '01': [-11000, -12000], '04': [-1000, -7000], '07': [30000, -20000] })
      .find(([id, [x, y]]) => id !== siteId && Math.hypot(projected.x - x, projected.y - y) <= 1980);
    if (otherSite) {
      const params = new URLSearchParams(location.search);
      params.set('site', otherSite[0]);
      params.set('lat', (-latSouth).toFixed(6));
      params.set('lon', lonEast.toFixed(6));
      params.set('find', '1');
      location.href = `${location.pathname}?${params}`;
      return;
    }
    probeMessage(locale === 'ru' ? 'Эта точка вне трёх исследованных районов NASA. Данных для честного расчёта здесь пока нет.' : 'Outside the three measured NASA regions. There is no reliable terrain calculation for this point yet.', true);
    return;
  }
  $('probe-analyze').disabled = true;
  probeMessage(locale === 'ru' ? 'ЗАГРУЖАЮ РЕЛЬЕФ И СЧИТАЮ 360 НАПРАВЛЕНИЙ…' : 'LOADING RELIEF AND CALCULATING 360 DIRECTIONS…');
  try {
    async function loadCompressedGrid(path) {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Probe grid unavailable');
      const packed = await response.arrayBuffer();
      const magic = new Uint8Array(packed, 0, 2);
      let raw = packed;
      if (magic[0] === 0x1f && magic[1] === 0x8b) {
        if (!('DecompressionStream' in window)) throw new Error('This browser cannot open the compressed LOLA grid');
        raw = await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      }
      return raw;
    }
    if (!probeGrid || !probeRms) {
      const [heightRaw, rmsRaw] = await Promise.all([
        loadCompressedGrid(`./luna_view_site${siteId}_probe_5m.bin.gz`),
        loadCompressedGrid(`./luna_view_site${siteId}_probe_rms_5m.bin.gz`),
      ]);
      probeGrid = decodeDeltaGrid(heightRaw);
      if (rmsRaw.byteLength !== 3200 * 3200) throw new Error('Probe RMS grid size mismatch');
      probeRms = new Uint8Array(rmsRaw);
    }
    if (!referenceProbe6) referenceProbe6 = probeHorizon(probeGrid, baselineData.bounds_m, baselineData.site.x_m, baselineData.site.y_m, probeRms);
    const probe = probeHorizon(probeGrid, baselineData.bounds_m, projected.x, projected.y, probeRms);
    const site = { x_m: projected.x, y_m: projected.y, lat_deg: probe.location.lat,
      lon_e_deg: probe.location.lon, height_m: probe.height };
    data = { ...baselineData, site,
      sun: transferEphemeris(baselineData.sun, baselineData.site, site),
      earth: transferEphemeris(baselineData.earth, baselineData.site, site),
      horizon_elevation_deg: probe.horizon, horizon_distance_m: probe.ranges,
      horizon_height_m: probe.heights, horizon_profile_deg: probe.profiles,
      horizon_lower_1rms_deg: probe.lower, horizon_upper_1rms_deg: probe.upper,
      observer_height_rms_m: probe.observerRms,
      north_xy: probe.north, east_xy: probe.east, horizon_range_m: 6000 };
    probeActive = true;
    placementActive = false;
    $('probe-pick').classList.remove('active');
    $('probe-pick').setAttribute('aria-pressed', 'false');
    canvas.style.cursor = '';
    explanationActive = false;
    detailActive = false;
    document.body.classList.remove('explaining');
    document.querySelector('.science').classList.remove('explaining');
    $('mission-profile').hidden = true;
    $('evidence-callout').hidden = true;
    if (evidenceLine) { evidenceLine.visible = false; blockerMarker.visible = false; blockerHalo.visible = false; }
    if (detailButton) detailButton.style.display = 'none';
    terrain.visible = true;
    if (closeTerrain) closeTerrain.visible = false;
    setSiteMarkerScale(false);
    const origin = observerOffset();
    focusTarget.set(origin.x, origin.y - 420, origin.z);
    state.interacting = true;
    state.targetRadius = 6200;
    state.targetElevation = .7;
    recalculateEarthHorizon();
    updateObserverUI();
    updateTime();
    findMissionWindow();
    probeTool.hidden = true;
    $('probe-open').textContent = locale === 'ru' ? 'ИЗМЕНИТЬ СВОЮ ТОЧКУ ↗' : 'EDIT YOUR STUDY POINT ↗';
    document.querySelector('.science').scrollTop = 0;
    const params = new URLSearchParams(location.search);
    params.set('lat', site.lat_deg.toFixed(6));
    params.set('lon', site.lon_e_deg.toFixed(6));
    params.set('find', '1');
    history.replaceState(null, '', `${location.pathname}?${params}`);
    probeMessage(locale === 'ru' ? `ГОТОВО · точка сдвинута на ${Math.round(distance)} м от центра. Горизонт: 6 км.` : `READY · point moved ${Math.round(distance)} m from site center. Horizon: 6 km.`);
  } catch (error) {
    console.error(error);
    probeMessage(locale === 'ru' ? `Не удалось рассчитать точку: ${error.message}` : `Could not analyze point: ${error.message}`, true);
  } finally {
    $('probe-analyze').disabled = false;
  }
}
$('probe-open').addEventListener('click', () => {
  probeTool.hidden = false;
  document.querySelector('.science').classList.remove('collapsed');
  updatePanelToggle();
  probeTool.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'nearest' });
  $('probe-lat').focus({ preventScroll: true });
});
$('probe-example').addEventListener('click', () => {
  if (!baselineData) return;
  const [dx, dy] = { '01': [250, 500], '04': [-1750, 500], '07': [750, 0] }[siteId];
  const coordinate = polarInverse(baselineData.site.x_m + dx, baselineData.site.y_m + dy);
  $('probe-lat').value = Math.abs(coordinate.lat).toFixed(6);
  $('probe-lon').value = coordinate.lon.toFixed(6);
  analyzeProbe(-coordinate.lat, coordinate.lon);
});
probeTool.addEventListener('submit', event => {
  event.preventDefault();
  analyzeProbe(Number($('probe-lat').value), Number($('probe-lon').value));
});
$('probe-pick').addEventListener('click', () => {
  placementActive = !placementActive;
  $('probe-pick').classList.toggle('active', placementActive);
  $('probe-pick').setAttribute('aria-pressed', String(placementActive));
  canvas.style.cursor = placementActive ? 'crosshair' : '';
  probeMessage(placementActive ? (locale === 'ru' ? 'КЛИКНИ НА РЕЛЬЕФЕ РЯДОМ С МЕТКОЙ.' : 'CLICK TERRAIN NEAR THE SITE MARKER.') : '');
});
$('probe-reset').addEventListener('click', () => {
  if (!baselineData) return;
  data = baselineData;
  probeActive = false;
  probeOutcome.hidden = true;
  $('probe-open').textContent = locale === 'ru' ? 'ПЕРЕМЕСТИТЬ ТОЧКУ ИССЛЕДОВАНИЯ ↗' : 'MOVE THE STUDY POINT ↗';
  explanationActive = false;
  detailActive = false;
  terrain.visible = true;
  if (closeTerrain) closeTerrain.visible = false;
  $('mission-profile').hidden = true;
  $('evidence-callout').hidden = true;
  document.body.classList.remove('explaining');
  document.querySelector('.science').classList.remove('explaining');
  if (evidenceLine) { evidenceLine.visible = false; blockerMarker.visible = false; blockerHalo.visible = false; }
  if (detailButton) detailButton.style.display = 'none';
  placementActive = false;
  $('probe-pick').classList.remove('active');
  $('probe-pick').setAttribute('aria-pressed', 'false');
  canvas.style.cursor = '';
  focusTarget.set(0, -420, 0);
  state.targetRadius = 9600;
  state.targetElevation = .35;
  recalculateEarthHorizon();
  setSiteMarkerScale(false);
  updateObserverUI();
  updateTime();
  findMissionWindow();
  const params = new URLSearchParams(location.search);
  params.delete('lat'); params.delete('lon');
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  probeMessage(locale === 'ru' ? 'ВОССТАНОВЛЕНА ОПОРНАЯ ТОЧКА NASA.' : 'NASA REFERENCE SITE RESTORED.');
});
antennaScenario.addEventListener('click', event => {
  const button = event.target.closest('button[data-antenna]');
  if (!button || !data) return;
  antennaHeight = Number(button.dataset.antenna);
  updateAntennaButtons();
  const params = new URLSearchParams(location.search);
  if (antennaHeight) params.set('antenna', String(antennaHeight)); else params.delete('antenna');
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  if (detailActive) {
    detailActive = false;
    terrain.visible = true;
    if (closeTerrain) closeTerrain.visible = false;
    setSiteMarkerScale(false);
    state.targetRadius = 7200;
    if (detailButton) detailButton.textContent = locale === 'ru' ? 'ПОКАЗАТЬ 3D-ДЕТАЛЬ 2 КМ ↗' : 'SHOW 2 KM 3D DETAIL ↗';
  }
  recalculateEarthHorizon();
  findMissionWindow();
  updateTime();
});
function updateSelectedRange() {
  const [start, end] = selectionBounds();
  $('time').min = start;
  $('time').max = end;
  const labels = selectedDay === 'all' ? ['14', '16', '18', '20', '22'].map(day => `${day} ${copy[locale].month}`) : ['00:00', '06:00', '12:00', '18:00', '23:00'];
  document.querySelectorAll('.range-labels span').forEach((node, index) => { node.textContent = labels[index]; });
  $('mission-limit').textContent = locale === 'ru' ? `Часовые отсчёты · ${selectedRangeLabel()} · горизонт в пределах ${probeRangeLabel()} км. Только геометрическая видимость.` : `Hourly samples · ${selectedRangeLabel()} · ${probeRangeLabel()} km terrain horizon. Geometric visibility only.`;
}
function updateTime() {
  if (!data) return;
  const index = Math.round(state.time);
  const sun = data.sun[index], earth = data.earth[index];
  const sunHorizon = data.horizon_elevation_deg[Math.round(sun[1]) % 360];
  const earthHorizon = earthHorizonByAzimuth[Math.round(earth[1]) % 360];
  const fmt = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}°`;
  $('sun-el').textContent = fmt(sun[2]);
  $('earth-el').textContent = fmt(earth[2]);
  $('sun-horizon').textContent = `${copy[locale].horizon} ${sun[1].toFixed(1)}° ${copy[locale].azimuth}: ${fmt(sunHorizon)}`;
  $('earth-horizon').textContent = `${copy[locale].horizon} ${earth[1].toFixed(1)}° ${copy[locale].azimuth}: ${fmt(earthHorizon)} · ${antennaHeight} ${locale === 'ru' ? 'м' : 'm'} ${locale === 'ru' ? 'антенна' : 'antenna'}`;
  $('sun-status').textContent = sun[2] > sunHorizon ? copy[locale].sunLit : copy[locale].sunBlocked;
  $('earth-status').textContent = earth[2] > earthHorizon ? copy[locale].earthClear : copy[locale].earthBlocked;
  const date = new Date(Date.UTC(2026, 10, 14, index));
  $('date').textContent = `${date.getUTCDate()} ${copy[locale].month} ${date.getUTCFullYear()} · ${String(date.getUTCHours()).padStart(2,'0')}:00 UTC`;
  $('time').value = index;
  const [rangeStart, rangeEnd] = selectionBounds();
  $('time').style.setProperty('--progress', `${(index - rangeStart) / (rangeEnd - rangeStart) * 100}%`);

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
  return [sun[2] > data.horizon_elevation_deg[Math.round(sun[1]) % 360], earth[2] > earthHorizonByAzimuth[Math.round(earth[1]) % 360]];
}

function hourLabel(index) {
  const date = new Date(Date.UTC(2026, 10, 14, index));
  const month = locale === 'ru' ? 'ноя' : 'Nov';
  return `${date.getUTCDate()} ${month} ${String(date.getUTCHours()).padStart(2, '0')}:00 UTC`;
}

function bestGeometricHour() {
  const [start, end] = selectionBounds();
  let best = start, bestMargin = -Infinity;
  for (let index = start; index <= end; index++) {
    const earth = data.earth[index];
    const sun = data.sun[index];
    const earthGap = earth[2] - earthHorizonByAzimuth[Math.round(earth[1]) % 360];
    const sunGap = sun[2] - data.horizon_elevation_deg[Math.round(sun[1]) % 360];
    const margin = Math.min(sunGap, earthGap);
    if (margin > bestMargin) { bestMargin = margin; best = index; }
  }
  return [best, bestMargin];
}

function renderEvidenceProfile(azimuth, earthElevation, blockerDistance) {
  const profile = earthProfiles[azimuth];
  const lowest = Math.min(earthElevation, ...profile) - 1.5;
  const highest = Math.max(earthElevation, ...profile) + 1.5;
  const width = 280, height = 100, left = 10, right = 270, top = 13, bottom = 75;
  const px = index => left + index / (profile.length - 1) * (right - left);
  const py = angle => bottom - (angle - lowest) / (highest - lowest) * (bottom - top);
  const ridge = Math.round(blockerDistance / 50) - 1;
  const points = profile.map((angle, index) => `${px(index).toFixed(1)},${py(angle).toFixed(1)}`).join(' ');
  const rayY = py(earthElevation).toFixed(1);
  const ridgeX = px(ridge).toFixed(1), ridgeY = py(profile[ridge]).toFixed(1);
  const label = `${locale === 'ru' ? 'ПРОФИЛЬ РЕЛЬЕФА / ЛИНИЯ НА ЗЕМЛЮ' : 'TERRAIN PROFILE / LINE TO EARTH'} · ${antennaHeight} ${locale === 'ru' ? 'М' : 'M'}`;
  const range = locale === 'ru' ? `${probeRangeLabel()} КМ` : `${probeRangeLabel()} KM`;
  const distanceText = blockerDistance < 1000 ? `${blockerDistance.toFixed(0)} ${locale === 'ru' ? 'М' : 'M'}` : `${(blockerDistance / 1000).toFixed(1)} ${locale === 'ru' ? 'КМ' : 'KM'}`;
  const container = $('mission-profile');
  container.setAttribute('aria-label', `${label}. ${locale === 'ru' ? 'Гребень' : 'Ridge'} ${distanceText}, ${profile[ridge].toFixed(2)}°, ${locale === 'ru' ? 'Земля' : 'Earth'} ${earthElevation.toFixed(2)}°.`);
  container.innerHTML = `<span>${label}</span><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="M ${left} ${bottom} L ${points.replaceAll(' ', ' L ')} L ${right} ${bottom} Z" fill="rgba(169,204,203,.13)"/><polyline points="${points}" fill="none" stroke="#adc8cf" stroke-width="1.5" vector-effect="non-scaling-stroke"/><line x1="${left}" y1="${rayY}" x2="${right}" y2="${rayY}" stroke="#f7d99e" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/><circle cx="${ridgeX}" cy="${ridgeY}" r="4" fill="#fff0bd"/><text x="${left}" y="95">0</text><text x="${right}" y="95" text-anchor="end">${range}</text></svg><small>${distanceText} · ${profile[ridge].toFixed(2)}° / ${earthElevation.toFixed(2)}°</small>${detailActive ? `<small>${locale === 'ru' ? '3D-ДЕТАЛЬ 2 КМ · СЕТКА 5 М, ~90% ИНТЕРПОЛЯЦИЯ' : '2 KM 3D DETAIL · 5 M GRID, ~90% INTERPOLATED'}</small>` : ''}`;
}

function updateEvidence(index) {
  const origin = observerOffset();
  const earth = data.earth[index];
  const azimuth = Math.round(earth[1]) % 360;
  const blockerIndex = earthBlockerByAzimuth[azimuth];
  const distance = (blockerIndex + 1) * 50;
  const height = antennaHeight === 0 ? data.horizon_height_m[azimuth] - data.site.height_m : distance * Math.tan(data.horizon_profile_deg[azimuth][blockerIndex] * Math.PI / 180) + distance * distance / (2 * 1_737_400);
  const az = earth[1] * Math.PI / 180;
  const x = distance * (data.east_xy[0] * Math.sin(az) + data.north_xy[0] * Math.cos(az));
  const z = -distance * (data.east_xy[1] * Math.sin(az) + data.north_xy[1] * Math.cos(az));
  const rayHeight = antennaHeight + distance * Math.tan(earth[2] * Math.PI / 180) + distance * distance / (2 * 1_737_400);
  evidenceLine.geometry.setFromPoints([new THREE.Vector3(origin.x, origin.y + antennaHeight + (detailActive ? 8 : 36), origin.z), new THREE.Vector3(origin.x + x, origin.y + rayHeight + (detailActive ? 8 : 0), origin.z + z)]);
  blockerMarker.position.set(origin.x + x, origin.y + height + (detailActive ? 8 : 44), origin.z + z);
  blockerHalo.position.copy(blockerMarker.position);
  const markerScale = detailActive ? 8 : clamp(distance * .06, window.innerWidth < 700 ? 110 : 36, 260);
  blockerHalo.scale.setScalar(markerScale / 80);
  blockerMarker.scale.setScalar(markerScale / 80);
  focusTarget.set(origin.x + x * .48, origin.y + height * .22, origin.z + z * .48);
  const gap = earthHorizonByAzimuth[azimuth] - earth[2];
  const sun = data.sun[index];
  const sunGap = sun[2] - data.horizon_elevation_deg[Math.round(sun[1]) % 360];
  const distanceText = distance < 1000 ? `${distance.toFixed(0)} ${locale === 'ru' ? 'М' : 'M'}` : `${(distance / 1000).toFixed(1)} ${locale === 'ru' ? 'КМ' : 'KM'}`;
  $('mission-detail').textContent = gap > 0 ? missionText[locale].blocked(gap, distanceText) : missionText[locale].clear(-gap, sunGap);
  $('evidence-callout').textContent = `${gap > 0 ? (locale === 'ru' ? 'ЗАКРЫВАЮЩИЙ ГРЕБЕНЬ' : 'BLOCKING RIDGE') : (locale === 'ru' ? 'ГРЕБЕНЬ ГОРИЗОНТА' : 'HORIZON RIDGE')} · ${distanceText}`;
  $('mobile-evidence-title').textContent = $('evidence-callout').textContent;
  $('mobile-evidence-label').textContent = `${locale === 'ru' ? 'РЕЛЬЕФ / УЧАСТОК' : 'TERRAIN EVIDENCE / SITE'} ${siteId} · ${antennaHeight} ${locale === 'ru' ? 'М АНТЕННА' : 'M ANTENNA'}`;
  $('mobile-evidence-detail').textContent = $('mission-detail').textContent;
  renderEvidenceProfile(azimuth, earth[2], distance);
}

function findMissionWindow() {
  if (!data) return;
  const [rangeStart, rangeEnd] = selectionBounds();
  const samples = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, offset) => statusAt(rangeStart + offset));
  const sunlight = samples.filter(x => x[0]).length;
  const earth = samples.filter(x => x[1]).length;
  const shared = samples.map(x => x[0] && x[1]);
  const result = $('mission-result');
  result.hidden = false;
  const runs = [];
  let start = -1;
  for (let index = 0; index <= shared.length; index++) {
    if (shared[index] && start < 0) start = index;
    if (!shared[index] && start >= 0) { runs.push([start, index - 1]); start = -1; }
  }
  const longest = runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  const [best, margin] = bestGeometricHour();
  $('mission-summary').textContent = longest ? missionText[locale].found(hourLabel(rangeStart + longest[0]), hourLabel(rangeStart + longest[1]), longest[1] - longest[0] + 1) : missionText[locale].none;
  const sharedCount = shared.filter(Boolean).length;
  $('mission-detail').textContent = missionText[locale].detail(sunlight, earth, sharedCount, hourLabel(best), margin, samples.length);
  probeDelta.hidden = !probeActive;
  probeOutcome.hidden = !probeActive;
  if (probeActive && baselineData && referenceProbe6) {
    const originalShared = baselineData.sun.slice(rangeStart, rangeEnd + 1).reduce((count, sun, offset) => {
      const earthSample = baselineData.earth[rangeStart + offset];
      const sunAz = Math.round(sun[1]) % 360, earthAz = Math.round(earthSample[1]) % 360;
      const earthHorizon = antennaHeight === 0 ? referenceProbe6.horizon[earthAz]
        : Math.max(...referenceProbe6.profiles[earthAz].map((angle, index) =>
          Math.atan(Math.tan(angle * Math.PI / 180) - antennaHeight / ((index + 1) * 50)) * 180 / Math.PI));
      return count + Number(sun[2] > referenceProbe6.horizon[sunAz] && earthSample[2] > earthHorizon);
    }, 0);
    const movement = Math.round(Math.hypot(data.site.x_m - baselineData.site.x_m, data.site.y_m - baselineData.site.y_m));
    const difference = sharedCount - originalShared;
    probeDelta.textContent = locale === 'ru'
      ? `СДВИГ ${movement} М · ОБЩИХ ОТСЧЁТОВ ${originalShared} → ${sharedCount} (${difference >= 0 ? '+' : ''}${difference}) · ОБА ГОРИЗОНТА 6 КМ · ТОЛЬКО ГЕОМЕТРИЯ`
      : `MOVED ${movement} M · SHARED SAMPLES ${originalShared} → ${sharedCount} (${difference >= 0 ? '+' : ''}${difference}) · BOTH HORIZONS 6 KM · GEOMETRY ONLY`;
    probeOutcome.textContent = probeDelta.textContent;
  }
  const baselineSharedCount = antennaHeight === 0 ? sharedCount : data.sun.slice(rangeStart, rangeEnd + 1).reduce((count, sun, offset) => {
    const earthSample = data.earth[rangeStart + offset];
    return count + Number(sun[2] > data.horizon_elevation_deg[Math.round(sun[1]) % 360] && earthSample[2] > data.horizon_elevation_deg[Math.round(earthSample[1]) % 360]);
  }, 0);
  const gained = sharedCount - baselineSharedCount;
  $('antenna-impact').textContent = locale === 'ru'
    ? `${antennaHeight} м: Земля видна ${earth}/${samples.length} отсчётов; общее окно ${sharedCount}/${samples.length} (${gained >= 0 ? '+' : ''}${gained} к уровню поверхности).`
    : `${antennaHeight} m: Earth visible ${earth}/${samples.length} samples; shared ${sharedCount}/${samples.length} (${gained >= 0 ? '+' : ''}${gained} vs surface).`;
  $('antenna-method').textContent = antennaHeight === 0
    ? (locale === 'ru' ? 'Высота антенны меняет видимость Земли; освещение поверхности прежнее.' : 'Antenna height changes Earth visibility; ground sunlight stays the same.')
    : (locale === 'ru' ? `Местная геометрия до ${probeRangeLabel()} км · профиль с шагом 50 м, округление углов 0,01°. Освещение поверхности прежнее.` : `Local ${probeRangeLabel()} km geometry · 50 m ray samples, angles rounded to 0.01°. Ground sunlight is unchanged.`);
  const sensitivity = $('mission-sensitivity');
  const upper = data.horizon_upper_1rms_deg;
  sensitivity.hidden = antennaHeight === 0 && (!sharedCount || !Array.isArray(upper));
  if (antennaHeight > 0) {
    sensitivity.textContent = locale === 'ru' ? 'Высотная неопределённость LOLA для нового положения антенны здесь не пересчитана. Сравнение остаётся исследовательским.' : 'LOLA height uncertainty has not been recomputed for the raised antenna. Treat this as an exploratory comparison.';
  } else if (!sensitivity.hidden) {
    const beyondBand = data.sun.slice(rangeStart, rangeEnd + 1).reduce((count, sun, offset) => {
      const earthSample = data.earth[rangeStart + offset];
      return count + Number(sun[2] > upper[Math.round(sun[1]) % 360] && earthSample[2] > upper[Math.round(earthSample[1]) % 360]);
    }, 0);
    sensitivity.textContent = locale === 'ru'
      ? `Проверка ошибки высоты: ${beyondBand} из ${sharedCount} общих отсчётов остаются выше верхней границы местного горизонта при неблагоприятном сдвиге высот на 1 RMS (NASA LOLA). Это не вероятность связи.`
      : `Height-error sensitivity: ${beyondBand} of ${sharedCount} shared samples remain above the upper local horizon after adverse 1 RMS height shifts (NASA LOLA). This is not a communication probability.`;
    if (probeActive) probeOutcome.textContent += locale === 'ru'
      ? ` · ВЫШЕ ВЕРХНЕЙ ГРАНИЦЫ 1 RMS: ${beyondBand}/${sharedCount}`
      : ` · ABOVE 1-RMS UPPER HORIZON: ${beyondBand}/${sharedCount}`;
  }
  $('show-why').textContent = longest ? (locale === 'ru' ? 'ПОКАЗАТЬ ЛУЧШИЙ ГЕОМЕТРИЧЕСКИЙ ЧАС ↗' : 'SHOW BEST GEOMETRIC HOUR IN 3D ↗') : (locale === 'ru' ? 'ПОКАЗАТЬ ПРИЧИНУ НА РЕЛЬЕФЕ ↗' : 'SHOW WHY ON THE TERRAIN ↗');
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
  $('mission-chart').setAttribute('aria-label', missionText[locale].chart(selectedRangeLabel()));
  $('find-window').classList.add('evaluated');
  $('find-window').setAttribute('aria-pressed', 'true');
  $('find-window').innerHTML = `${locale === 'ru' ? 'РЕЗУЛЬТАТ' : 'RESULT'} · ${sharedCount}/${samples.length} ${locale === 'ru' ? 'ОБЩИХ ОТСЧЁТОВ' : 'SHARED SAMPLES'} <span>✓</span>`;
  svg.addEventListener('pointerdown', event => {
    const bounds = svg.getBoundingClientRect();
    state.time = rangeStart + clamp(Math.round((event.clientX - bounds.left) / bounds.width * (samples.length - 1)), 0, samples.length - 1);
    updateTime();
  });
  missionEvaluated = true;
  if (window.matchMedia('(max-width: 700px)').matches) result.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'center' });
}

function showWhy() {
  if (!data || !missionEvaluated) return;
  $('show-why').classList.add('active');
  $('show-why').setAttribute('aria-pressed', 'true');
  detailActive = false;
  terrain.visible = true;
  if (closeTerrain) closeTerrain.visible = false;
  setSiteMarkerScale(false);
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
  evidenceLine.visible = true; blockerMarker.visible = true; blockerHalo.visible = true;
  state.time = bestGeometricHour()[0];
  const azimuth = Math.round(data.earth[Math.round(state.time)][1]) % 360;
  const distance = (earthBlockerByAzimuth[azimuth] + 1) * 50;
  updateTime();
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  state.targetRadius = mobile ? 9600 : clamp(distance * 8, 6200, 9600);
  state.targetElevation = mobile ? .9 : .55;
  state.targetTheta = Math.atan2(focusTarget.x - blockerMarker.position.x, focusTarget.z - blockerMarker.position.z);
  if (!detailButton) {
    detailButton = document.createElement('button');
    detailButton.id = 'detail-toggle';
    detailButton.type = 'button';
    detailButton.className = 'mission-secondary';
    $('mission-profile').after(detailButton);
    detailButton.addEventListener('click', toggleDetail);
  }
  detailButton.style.display = !probeActive && distance < 900 ? 'flex' : 'none';
  detailButton.textContent = locale === 'ru' ? 'ПОКАЗАТЬ 3D-ДЕТАЛЬ 2 КМ ↗' : 'SHOW 2 KM 3D DETAIL ↗';
  if (mobile) window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
}

async function toggleDetail() {
  if (!explanationActive || probeActive) return;
  if (!closeTerrain) {
    detailButton.disabled = true;
    detailButton.textContent = locale === 'ru' ? 'ЗАГРУЖАЮ ДЕТАЛЬ РЕЛЬЕФА ···' : 'LOADING TERRAIN DETAIL ···';
    try {
      const response = await fetch(`./luna_view_site${siteId}_close.bin`);
      if (!response.ok) throw new Error('Close terrain tile unavailable');
      makeCloseTerrain(await response.arrayBuffer());
      setMode(state.mode);
    } catch (error) {
      detailButton.textContent = locale === 'ru' ? 'ДЕТАЛЬ НЕДОСТУПНА' : 'DETAIL UNAVAILABLE';
      console.error(error);
      return;
    } finally {
      detailButton.disabled = false;
    }
  }
  if (!explanationActive) return;
  detailActive = !detailActive;
  terrain.visible = !detailActive;
  closeTerrain.visible = detailActive;
  setSiteMarkerScale(detailActive);
  updateEvidence(Math.round(state.time));
  state.targetRadius = detailActive ? (window.innerWidth < 700 ? 900 : 950) : 7200;
  state.targetElevation = detailActive ? .82 : .55;
  state.targetTheta = Math.atan2(-blockerMarker.position.x, -blockerMarker.position.z) - (detailActive ? .6 : 0);
  detailButton.textContent = detailActive ? (locale === 'ru' ? 'ВЕРНУТЬСЯ К ВИДУ 16 КМ ↗' : 'BACK TO 16 KM CONTEXT ↗') : (locale === 'ru' ? 'ПОКАЗАТЬ 3D-ДЕТАЛЬ 2 КМ ↗' : 'SHOW 2 KM 3D DETAIL ↗');
}

$('find-window').addEventListener('click', findMissionWindow);
$('show-why').addEventListener('click', showWhy);
$('back-to-result').addEventListener('click', () => {
  document.body.classList.remove('explaining');
  document.querySelector('.science').classList.remove('explaining');
  $('mission-result').scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
});

function setMode(mode) {
  if (!terrain) return;
  state.mode = mode;
  const color = mode === 'elevation' ? elevationColors : mode === 'slope' ? slopeColors : surfaceColors;
  terrain.geometry.attributes.color.array.set(color);
  terrain.geometry.attributes.color.needsUpdate = true;
  terrain.material.dispose();
  terrain.material = terrainMaterial(mode);
  if (closeTerrain) {
    closeTerrain.geometry.attributes.color.array.set(closeColors[mode]);
    closeTerrain.geometry.attributes.color.needsUpdate = true;
    closeTerrain.material.dispose();
    closeTerrain.material = terrainMaterial(mode);
  }
  for (const [id, value] of [['photometric','surface'],['topographic','elevation'],['slope','slope']]) {
    const active = mode === value;
    $(id).classList.toggle('active', active);
    $(id).setAttribute('aria-pressed', String(active));
  }
  $('legend').classList.toggle('visible', mode !== 'surface');
  $('legend').classList.toggle('slope', mode === 'slope');
  $('legend-min').textContent = mode === 'slope' ? '0°' : `${(data.height_range_m[0] / 1000).toFixed(2)} KM`;
  $('legend-max').textContent = mode === 'slope' ? '≥28°' : `+${(data.height_range_m[1] / 1000).toFixed(2)} KM`;
  $('mode-caption').textContent = mode === 'surface' ? copy[locale].surfaceCaption : mode === 'elevation' ? copy[locale].elevationCaption : copy[locale].slopeCaption;
  if (mode !== 'surface') {
    $('mode-caption').textContent += locale === 'ru' ? ' · УЧАСТОК 16 × 16 КМ' : ' · 16 × 16 KM DATA TILE';
    if (!explanationActive && !state.overhead) $('overhead').click();
  }
}

for (const [id, mode] of [['photometric','surface'],['topographic','elevation'],['slope','slope']]) $(id).addEventListener('click', () => setMode(mode));
$('time').addEventListener('input', (event) => { state.time = Number(event.target.value); updateTime(); });
$('play').addEventListener('click', () => { state.playing = !state.playing; $('play').textContent = state.playing ? 'Ⅱ' : '▶'; $('play').setAttribute('aria-pressed', String(state.playing)); $('play').setAttribute('aria-label', state.playing ? 'Pause timeline' : 'Play timeline'); });
$('overhead').addEventListener('click', () => { state.overhead = true; state.targetElevation = 1.55; state.targetRadius = 25000; $('overhead').classList.add('active'); $('orbit').classList.remove('active'); $('overhead').setAttribute('aria-pressed','true'); $('orbit').setAttribute('aria-pressed','false'); });
$('orbit').addEventListener('click', () => { state.overhead = false; state.targetElevation = 0.35; state.targetRadius = 9600; $('orbit').classList.add('active'); $('overhead').classList.remove('active'); $('orbit').setAttribute('aria-pressed','true'); $('overhead').setAttribute('aria-pressed','false'); });
let pointer = null;
const raycaster = new THREE.Raycaster();
canvas.addEventListener('pointerdown', event => { pointer = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false }; state.interacting = true; canvas.setPointerCapture(event.pointerId); $('hint').classList.add('hidden'); });
canvas.addEventListener('pointermove', event => {
  if (!pointer) return;
  if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) pointer.moved = true;
  if (!pointer.moved && placementActive) return;
  state.targetTheta -= (event.clientX - pointer.x) * .004;
  state.targetElevation = clamp(state.targetElevation + (event.clientY - pointer.y) * .003, .08, 1.5);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener('pointerup', event => {
  if (pointer && !pointer.moved && placementActive && terrain && baselineData) {
    raycaster.setFromCamera(new THREE.Vector2(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2), camera);
    const hit = raycaster.intersectObject(terrain)[0];
    if (hit) {
      const coordinate = polarInverse(baselineData.site.x_m + hit.point.x, baselineData.site.y_m - hit.point.z);
      analyzeProbe(-coordinate.lat, coordinate.lon);
    } else probeMessage(locale === 'ru' ? 'Нажми на видимую поверхность рядом с меткой.' : 'Click visible terrain near the marker.', true);
  }
  pointer = null;
});
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('wheel', event => { event.preventDefault(); state.interacting = true; state.targetRadius = clamp(state.targetRadius * Math.exp(event.deltaY * .0007), detailActive ? 450 : 2300, detailActive ? 3500 : 26000); $('hint').classList.add('hidden'); }, { passive: false });
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
    if (playAccumulator >= .34) { playAccumulator = 0; const [start, end] = selectionBounds(); state.time = state.time >= end ? start : state.time + 1; updateTime(); }
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
  if (blockerMarker && explanationActive) {
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
  const [metadataResponse, terrainResponse] = await Promise.all([fetch(`./luna_view_site${siteId}_data.json`), fetch(`./luna_view_site${siteId}_terrain.bin`)]);
  if (!metadataResponse.ok || !terrainResponse.ok) throw new Error('Could not load site data');
  data = await metadataResponse.json();
  baselineData = data;
  recalculateEarthHorizon();
  $('height-rms-source').href = data.height_rms_source_url || data.product_url;
  makeTerrain(await terrainResponse.arrayBuffer());
  setMode('surface');
  updateTime();
  const siteTitle = locale === 'ru' ? ({ '01': 'Соединяющий<span>гребень.</span>', '04': 'Кромка<span>Шеклтона.</span>', '07': 'Пик у<span>Шеклтона.</span>' })[siteId] : ({ '01': 'Connecting<span>Ridge.</span>', '04': 'Shackleton<span>Rim.</span>', '07': 'Peak near<span>Shackleton.</span>' })[siteId];
  document.querySelector('h1').innerHTML = siteTitle;
  document.querySelector('.intro .eyebrow').textContent = locale === 'ru' ? `ЮЖНЫЙ ПОЛЮС / УЧАСТОК ${siteId}` : `SOUTH POLAR STUDY AREA / SITE ${siteId}`;
  $('mobile-evidence-label').textContent = locale === 'ru' ? `РЕЛЬЕФ / УЧАСТОК ${siteId}` : `TERRAIN EVIDENCE / SITE ${siteId}`;
  document.querySelector('.timeline-label').textContent = locale === 'ru' ? `ПОЛОЖЕНИЕ СОЛНЦА / УЧАСТОК ${siteId}` : `SOLAR GEOMETRY / SITE ${siteId}`;
  document.querySelectorAll('.science .row strong')[2].textContent = `${((data.height_range_m[1] - data.height_range_m[0]) / 1000).toFixed(2)} km`;
  canvas.setAttribute('aria-label', `Interactive three-dimensional terrain model of lunar Site ${siteId}`);
  document.title = `LUNA—VIEW / ${data.site_name}`;
  updateObserverUI();
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 1000);
  if (query.get('find') === '1') {
    findMissionWindow();
  }
  if (query.has('lat') && query.has('lon')) {
    probeTool.hidden = false;
    await analyzeProbe(Math.abs(Number(query.get('lat'))), Number(query.get('lon')));
  }
} catch (error) {
  $('loading').textContent = `DATA LOAD FAILED · ${error.message}`;
  console.error(error);
}
