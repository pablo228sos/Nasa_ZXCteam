import * as THREE from './science/three.module.js';

const stage = document.getElementById('atlas-stage');
const canvas = document.getElementById('atlas-canvas');
const loading = document.getElementById('atlas-loading');
const cluster = document.getElementById('atlas-cluster');
const pins = document.getElementById('atlas-pins');
const pinLines = document.getElementById('atlas-pin-lines');
const pinLineElements = [...pinLines.querySelectorAll('line')];
const pinDots = [...pinLines.querySelectorAll('circle')];
const siteButtons = [...document.querySelectorAll('[data-atlas-site]')];
const pinButtons = [...document.querySelectorAll('[data-atlas-pin]')];
const hourInput = document.getElementById('atlas-hour');
const playButton = document.getElementById('atlas-play');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const copy = {
  en: {
    overview: 'South pole.', overviewBody: 'Three measured landscapes, one Moon. Focus the south pole to see where the local studies begin.',
    focus: 'SOUTH POLE', global: 'GLOBAL VIEW',
    '07': 'Peak near Shackleton', '01': 'Connecting ridge', '04': 'Shackleton rim',
    '07body': 'A high point where local sunlight and the Earth horizon can overlap. Open its measured terrain to examine when and why.',
    '01body': 'A connecting ridge with its own horizon. Compare its lighting and Earth visibility with the other two sites.',
    '04body': 'On the Shackleton rim, the local terrain blocks Earth throughout the sampled interval at the reference height.',
    pause: 'Ⅱ PAUSE LIGHT', play: '▶ PLAY LIGHT', unavailable: '3D globe unavailable. Choose a site below.'
  },
  ru: {
    overview: 'Южный полюс.', overviewBody: 'Три измеренных ландшафта на одной Луне. Приблизь южный полюс, чтобы увидеть участки.',
    focus: 'ЮЖНЫЙ ПОЛЮС', global: 'ВСЯ ЛУНА',
    '07': 'Пик у Шеклтона', '01': 'Соединяющий хребет', '04': 'Край Шеклтона',
    '07body': 'Высокая точка, где свет и видимость Земли могут совпадать. Открой рельеф, чтобы проверить когда и почему.',
    '01body': 'Хребет со своим горизонтом. Сравни освещённость и видимость Земли с другими участками.',
    '04body': 'На краю Шеклтона местный рельеф закрывает Землю в течение всего выбранного периода на опорной высоте.',
    pause: 'Ⅱ ПАУЗА', play: '▶ ПОКАЗАТЬ СВЕТ', unavailable: '3D-глобус недоступен. Выбери участок ниже.'
  }
};

let data, scene, renderer, camera, moon, sunLight;
let active = false, frame = 0, playing = false, lastAdvance = 0, loadingGlobe = false;
let focused = false, selected = '07', hour = Number(hourInput.value);
let theta = -1.06, phi = 2.36, distance = 3.15, focusBlend = 0;
let targetTheta = theta, targetPhi = phi, targetDistance = distance, targetBlend = 0;
let pointer = null;
const center = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const sunVector = new THREE.Vector3();
const siteVectors = new Map();

function lang() { return document.documentElement.lang === 'ru' ? 'ru' : 'en'; }
function position(lat, lon, radius = 1) {
  const a = THREE.MathUtils.degToRad(lat), b = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)).multiplyScalar(radius);
}
function setSite(id, zoom = true) {
  if (!['01', '04', '07'].includes(id)) return;
  selected = id;
  if (zoom) setFocus(true);
  for (const button of siteButtons) button.setAttribute('aria-pressed', String(button.dataset.atlasSite === id));
  for (const button of pinButtons) button.classList.toggle('active', button.dataset.atlasPin === id);
  updateCopy();
}
function setFocus(on) {
  active = true;
  focused = on;
  targetBlend = on ? .13 : 0;
  targetPhi = on ? Math.PI - .20 : 2.36;
  targetTheta = on ? -1.06 : targetTheta;
  targetDistance = on ? 2.48 : 3.15;
  stage.dataset.mode = on ? 'pole' : 'global';
  if (!on) { pins.hidden = true; pinLines.setAttribute('hidden', ''); }
  else cluster.hidden = true;
  updateCopy();
  requestFrame();
}
function updateCopy() {
  const t = copy[lang()];
  canvas.setAttribute('aria-label', lang() === 'ru' ? 'Интерактивная 3D-Луна. Стрелки поворачивают, плюс и минус меняют масштаб.' : 'Interactive 3D Moon. Use arrow keys to rotate and plus or minus to zoom.');
  hourInput.setAttribute('aria-label', lang() === 'ru' ? 'Предпросмотр направления Солнца по часам UTC' : 'Preview Sun direction by UTC hour');
  document.querySelector('.atlas-panel').setAttribute('aria-label', lang() === 'ru' ? 'Выбор участка Луны' : 'Choose a lunar study site');
  for (const button of pinButtons) button.setAttribute('aria-label', lang() === 'ru' ? `Выбрать участок ${button.dataset.atlasPin}: ${t[button.dataset.atlasPin]}` : `Select Site ${button.dataset.atlasPin}: ${t[button.dataset.atlasPin]}`);
  document.getElementById('atlas-mode-label').textContent = focused ? t.focus : t.global;
  document.getElementById('atlas-site-title').textContent = focused ? t[selected] + '.' : t.overview;
  document.getElementById('atlas-site-description').textContent = focused ? t[`${selected}body`] : t.overviewBody;
  const site = data?.sites.find(item => item.id === selected);
  if (site) document.getElementById('atlas-coordinate').textContent = `${Math.abs(site.lat_deg).toFixed(4)}° S · ${site.lon_e_deg.toFixed(4)}° E`;
  const date = data?.sun[hour]?.[0]?.slice(0, 11);
  const day = date ? `2026-11-${date.slice(-2)}` : '2026-11-19';
  document.getElementById('atlas-enter').href = `./science/?site=${selected}&find=1&day=${day}${lang() === 'ru' ? '&lang=ru' : ''}`;
  playButton.textContent = playing ? t.pause : t.play;
}
function setHour(value) {
  hour = Math.max(0, Math.min(192, Math.round(Number(value) || 0)));
  hourInput.value = String(hour);
  const sample = data?.sun[hour];
  if (sample) {
    sunVector.set(sample[1], sample[2], sample[3]).normalize();
    sunLight?.position.copy(sunVector).multiplyScalar(5);
    const [, month, day, time] = sample[0].match(/^\d{4}-(\w+)-(\d+) (\d\d:\d\d)$/) || [];
    document.getElementById('atlas-time-label').textContent = `${day} ${month?.toUpperCase()} 2026 · ${time}`;
  }
  updateCopy();
  requestFrame();
}
function frameCamera() {
  cameraDirection.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
  center.set(0, -focusBlend, 0);
  camera.position.copy(center).addScaledVector(cameraDirection, distance);
  camera.lookAt(center);
  camera.updateMatrixWorld();
}
function project(point) {
  const projected = point.clone().project(camera);
  const rect = stage.getBoundingClientRect();
  return { x: (projected.x + 1) * rect.width / 2, y: (1 - projected.y) * rect.height / 2, inside: projected.z < 1 && projected.z > -1 && projected.x > -1.13 && projected.x < 1.13 && projected.y > -1.13 && projected.y < 1.13 };
}
function updateOverlays() {
  if (!camera || !data) return;
  const polar = focusBlend > .10;
  const p = project(new THREE.Vector3(0, -1.003, 0));
  const clusterVisible = !polar && p.inside && cameraDirection.y < -.12;
  cluster.hidden = !clusterVisible;
  if (clusterVisible) { cluster.style.left = `${p.x}px`; cluster.style.top = `${p.y}px`; }
  pins.hidden = !polar;
  pinLines.toggleAttribute('hidden', !polar);
  if (polar) for (const [index, button] of pinButtons.entries()) {
    const point = siteVectors.get(button.dataset.atlasPin);
    const v = project(point);
    const visible = v.inside && point.clone().normalize().dot(camera.position.clone().sub(point).normalize()) > .02;
    button.hidden = !visible;
    const width = stage.clientWidth, height = stage.clientHeight;
    const endX = width * (index + .5) / 3;
    const endY = height - 72;
    button.style.left = `${endX}px`;
    button.style.top = `${endY + 24}px`;
    const line = pinLineElements[index], dot = pinDots[index];
    line.setAttribute('x1', v.x); line.setAttribute('y1', v.y);
    line.setAttribute('x2', endX); line.setAttribute('y2', endY);
    dot.setAttribute('cx', v.x); dot.setAttribute('cy', v.y);
    line.style.display = dot.style.display = visible ? '' : 'none';
  }
}
function requestFrame() {
  if (!frame && active && !document.hidden) frame = requestAnimationFrame(render);
}
function render(time) {
  frame = 0;
  if (!active || document.hidden || !renderer) return;
  const smooth = reducedMotion.matches ? 1 : .10;
  theta += (targetTheta - theta) * smooth;
  phi += (targetPhi - phi) * smooth;
  distance += (targetDistance - distance) * smooth;
  focusBlend += (targetBlend - focusBlend) * smooth;
  frameCamera();
  renderer.render(scene, camera);
  updateOverlays();
  if (playing && time - lastAdvance > 180) {
    lastAdvance = time;
    setHour((hour + 1) % 193);
  }
  if (playing || pointer || Math.abs(theta - targetTheta) > .0003 || Math.abs(phi - targetPhi) > .0003 || Math.abs(distance - targetDistance) > .0003 || Math.abs(focusBlend - targetBlend) > .0003) requestFrame();
}
function resize() {
  if (!renderer) return;
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  requestFrame();
}
function texture(url, color = false) {
  return new Promise((resolve, reject) => new THREE.TextureLoader().load(url, map => {
    if (color) map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    resolve(map);
  }, undefined, reject));
}
async function load() {
  if (loadingGlobe) return;
  loadingGlobe = true;
  try {
    const response = await fetch('./media/globe/atlas-data.json');
    if (!response.ok) throw new Error(`atlas-data HTTP ${response.status}`);
    data = await response.json();
    if (data.sites.length !== 3 || data.sun.length !== 193) throw new Error('Unexpected atlas data');
    for (const site of data.sites) siteVectors.set(site.id, position(site.lat_deg, site.lon_e_deg, 1 + site.height_m / data.radius_m + .004));
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.13;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, .01, 20);
    const geometry = new THREE.SphereGeometry(1, innerWidth < 760 ? 192 : 320, innerWidth < 760 ? 96 : 160);
    const quality = innerWidth < 760 ? '2k' : '4k';
    const [map, heights] = await Promise.all([
      texture(`./media/globe/moon-color-${quality}.jpg`, true),
      texture('./media/globe/moon-height-4ppd.png')
    ]);
    moon = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map, displacementMap: heights, displacementScale: 20000 / data.radius_m, displacementBias: -9000 / data.radius_m, roughness: 1, metalness: 0 }));
    scene.add(moon);
    sunLight = new THREE.DirectionalLight(0xffedd4, 2.6);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xb6cad4, .27));
    setHour(hour);
    resize();
    stage.classList.add('is-ready');
    loading.setAttribute('aria-hidden', 'true');
    requestFrame();
  } catch (error) {
    console.warn('Lunar atlas:', error);
    stage.classList.add('is-fallback');
    loading.textContent = copy[lang()].unavailable;
    loading.setAttribute('aria-hidden', 'true');
  }
}

document.getElementById('atlas-focus').addEventListener('click', () => setFocus(true));
document.getElementById('atlas-overview').addEventListener('click', () => setFocus(false));
cluster.addEventListener('click', () => setFocus(true));
for (const button of siteButtons) button.addEventListener('click', () => setSite(button.dataset.atlasSite));
for (const button of pinButtons) button.addEventListener('click', () => setSite(button.dataset.atlasPin));
hourInput.addEventListener('input', () => setHour(hourInput.value));
playButton.addEventListener('click', () => {
  playing = !playing;
  playButton.setAttribute('aria-pressed', String(playing));
  updateCopy();
  requestFrame();
});
window.addEventListener('luna:language', updateCopy);
canvas.addEventListener('pointerdown', event => {
  pointer = { x: event.clientX, y: event.clientY, theta: targetTheta, phi: targetPhi };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!pointer) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
  targetTheta = pointer.theta - dx * .006;
  targetPhi = Math.max(.13, Math.min(Math.PI - .05, pointer.phi - dy * .006));
  requestFrame();
});
canvas.addEventListener('pointerup', () => { pointer = null; });
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  targetDistance = Math.max(focused ? .26 : 1.3, Math.min(5.6, targetDistance * (event.deltaY > 0 ? 1.11 : .9)));
  requestFrame();
}, { passive: false });
canvas.addEventListener('keydown', event => {
  const keys = { ArrowLeft: [-.12, 0, 1], ArrowRight: [.12, 0, 1], ArrowUp: [0, -.12, 1], ArrowDown: [0, .12, 1], '+': [0, 0, .9], '=': [0, 0, .9], '-': [0, 0, 1.1] };
  if (!keys[event.key]) return;
  event.preventDefault();
  const [x, y, zoom] = keys[event.key];
  targetTheta += x;
  targetPhi = Math.max(.13, Math.min(Math.PI - .05, targetPhi + y));
  targetDistance = Math.max(.26, Math.min(5.6, targetDistance * zoom));
  requestFrame();
});
document.addEventListener('visibilitychange', requestFrame);
new ResizeObserver(resize).observe(stage);
const observer = new IntersectionObserver(entries => {
  active = entries[0].isIntersecting;
  if (active && !data) load();
  else if (active) requestFrame();
}, { rootMargin: '300px 0px', threshold: .01 });
observer.observe(stage);
updateCopy();
