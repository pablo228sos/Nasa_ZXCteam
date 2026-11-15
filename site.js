document.documentElement.classList.add('js');

const words = {
  en: {
    navWhy: 'THE QUESTION', navExplore: 'EXPLORE', navMethod: 'METHOD',
    heroKicker: 'ZXC / LUNAR EXPLORATION STUDY', heroLine1: 'The Moon is a place.', heroLine2: 'Choose precisely.',
    heroDeck: 'Explore terrain that exists, light that moves, and the horizon that defines what a landing site can do.',
    heroExplore: 'FIND A MISSION WINDOW', heroScience: 'SEE THE SCIENCE ↓', filmNotice: 'CINEMATIC ILLUSTRATION · NOT SURVEY DATA', scroll: 'SCROLL TO EXPLORE',
    question: 'THE QUESTION', premiseTitle: 'Coordinates are only<br>the beginning.', premiseBody: 'At the lunar south pole, a few kilometres can change sunlight and the path back to Earth. A useful site analysis has to connect terrain with time.',
    factorSun: 'Light meets the local horizon.', factorSunBody: 'Solar elevation alone is not enough. Nearby ridges decide when the surface actually receives light.',
    factorEarth: 'Earth has a horizon too.', factorEarthBody: 'Direct communication depends on whether Earth clears the terrain around a specific site.',
    factorTerrain: 'The terrain must be real.', factorTerrainBody: 'A visualisation only earns trust when its geometry, resolution and uncertainty can be traced to a source.',
    terrainLabel: 'THE TERRAIN', terrainEyebrow: 'ONE PLACE · EIGHT DAYS', terrainBody: 'Search for a shared Sun and Earth window, then see the terrain that shapes the answer across 16 × 16 km of measured topography.', terrainOpen: 'OPEN FULL 3D ANALYSIS',
    stageNote: 'MEASURED 3D TERRAIN · OPEN TO EXPLORE', stageOpen: 'OPEN FULL SCREEN', previewOpen: 'EXPLORE THE MEASURED TERRAIN',
    compareLabel: 'THREE SITES, ONE CLOCK', compareTitle: 'The horizon<br><em>changes everything.</em>', compareBody: 'The same UTC samples, tested against three measured landscapes. Each strip shows local geometric visibility. Choose a site to see the ridge behind the answer.', comparePeriod: 'PERIOD · UTC',
    site07Name: '07 / PEAK NEAR SHACKLETON', site01Name: '01 / CONNECTING RIDGE', site04Name: '04 / SHACKLETON RIM', sharedHours: '/ 193 HOURLY SAMPLES', inspect3d: 'INSPECT IN 3D ↗', sunLabel: 'SUN', earthLabel: 'EARTH', bothLabel: 'BOTH',
    compareLimit: 'Hourly geometry · 8 km local horizon · not a power or communication forecast.',
    methodLabel: 'METHOD & LIMITS', sourceNote: 'SOURCES ARE PART OF THE INTERFACE', methodTitle: 'Wonder needs<br>ground truth.',
    methodBody: "The 3D scenes use NASA LOLA elevation models for Sites 01, 04 and 07; the preview shows Site04. Sun and Earth positions come from JPL Horizons for each point and UTC hour. The screen computes a local terrain horizon within 8 km.",
    methodLimit: 'The 5 m source grid contains approximately 90% interpolated pixels. The wide 3D mesh samples it at 41.7 m; an optional 2 km detail uses the source grid. Surface tone and cinematic fill light help reveal shape. The hero film is generated imagery, not a map of this site.',
    footer: 'A working visual study by ZXC for NASA Space Apps Challenge 2026.'
  },
  ru: {
    navWhy: 'ВОПРОС', navExplore: 'ИССЛЕДОВАТЬ', navMethod: 'МЕТОД',
    heroKicker: 'ZXC / ИССЛЕДОВАНИЕ ЛУНЫ', heroLine1: 'Луна — это место.', heroLine2: 'Выбирай точно.',
    heroDeck: 'Изучай реальный рельеф, движение света и линию горизонта, от которой зависят возможности площадки.',
    heroExplore: 'НАЙТИ ОКНО МИССИИ', heroScience: 'КАК ЭТО РАБОТАЕТ ↓', filmNotice: 'КИНЕМАТОГРАФИЧНАЯ ИЛЛЮСТРАЦИЯ · НЕ КАРТА', scroll: 'ЛИСТАЙ ВНИЗ',
    question: 'ЗАДАЧА', premiseTitle: 'Координаты — только<br>начало.', premiseBody: 'У южного полюса Луны несколько километров могут изменить освещённость и связь с Землёй. Анализ площадки должен связывать рельеф со временем.',
    factorSun: 'Свет зависит от горизонта.', factorSunBody: 'Одной высоты Солнца недостаточно. Соседние хребты определяют, когда поверхность действительно освещена.',
    factorEarth: 'У Земли тоже есть горизонт.', factorEarthBody: 'Прямая связь зависит от того, видна ли Земля над рельефом вокруг конкретной точки.',
    factorTerrain: 'Рельеф должен быть настоящим.', factorTerrainBody: 'Визуализация заслуживает доверия, когда известны источник геометрии, разрешение и ограничения данных.',
    terrainLabel: 'РЕЛЬЕФ', terrainEyebrow: 'ОДНА ТОЧКА · ВОСЕМЬ ДНЕЙ', terrainBody: 'Ищи общее окно света и видимости Земли, затем смотри на измеренном рельефе 16 × 16 км, что определило результат.', terrainOpen: 'ОТКРЫТЬ 3D-АНАЛИЗ',
    stageNote: 'ИЗМЕРЕННЫЙ 3D-РЕЛЬЕФ · ОТКРОЙ ДЛЯ ИССЛЕДОВАНИЯ', stageOpen: 'НА ВЕСЬ ЭКРАН', previewOpen: 'ИССЛЕДОВАТЬ ИЗМЕРЕННЫЙ РЕЛЬЕФ',
    compareLabel: 'ТРИ УЧАСТКА · ОДНО ВРЕМЯ', compareTitle: 'Горизонт<br><em>меняет всё.</em>', compareBody: 'Одни и те же часы UTC на трёх измеренных рельефах. Полосы показывают геометрическую видимость. Выбери участок, чтобы увидеть гребень за результатом.', comparePeriod: 'ПЕРИОД · UTC',
    site07Name: '07 / ПИК У ШЕКЛТОНА', site01Name: '01 / СОЕДИНЯЮЩИЙ ГРЕБЕНЬ', site04Name: '04 / КРАЙ ШЕКЛТОНА', sharedHours: '/ 193 ЧАСОВЫХ ОТСЧЁТОВ', inspect3d: 'СМОТРЕТЬ В 3D ↗', sunLabel: 'СОЛНЦЕ', earthLabel: 'ЗЕМЛЯ', bothLabel: 'ОБА',
    compareLimit: 'Часовой шаг · горизонт до 8 км · не прогноз энергии или радиосвязи.',
    methodLabel: 'МЕТОД И ГРАНИЦЫ', sourceNote: 'ИСТОЧНИКИ — ЧАСТЬ ИНТЕРФЕЙСА', methodTitle: 'Впечатлению нужна<br>опора на данные.',
    methodBody: '3D-сцены построены из моделей высот NASA LOLA для участков 01, 04 и 07; здесь показан Site04. Положения Солнца и Земли рассчитаны JPL Horizons для каждой точки и часа UTC. Экран вычисляет местный горизонт в пределах 8 км.',
    methodLimit: 'Около 90% пикселей исходной сетки 5 м получены интерполяцией. Широкая 3D-сетка имеет шаг 41,7 м; дополнительная деталь 2 км использует сетку источника. Цвет и дополнительный свет помогают прочитать форму. Видео на первом экране сгенерировано и не является картой этой площадки.',
    footer: 'Рабочее визуальное исследование команды ZXC для NASA Space Apps Challenge 2026.'
  }
};

const header = document.getElementById('site-header');
const heroVideo = document.getElementById('hero-video');
const scienceLink = document.getElementById('science-link');
const scienceLinkBottom = document.getElementById('science-link-bottom');
const scienceMobilePreview = document.getElementById('science-mobile-preview');
const heroMissionLink = document.getElementById('hero-mission-link');
const sciencePreview = document.getElementById('science-preview');
const comparisonDaySelect = document.getElementById('comparison-day');
const comparisonData = new Map();
const validComparisonDays = Array.from({ length: 8 }, (_, index) => `2026-11-${String(14 + index).padStart(2, '0')}`);
const requestedComparisonDay = new URLSearchParams(location.search).get('day');
let comparisonDay = validComparisonDays.includes(requestedComparisonDay) ? requestedComparisonDay : 'all';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setLanguage(lang) {
  if (!words[lang]) return;
  document.documentElement.lang = lang;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key === 'premiseTitle' || key === 'methodTitle' || key === 'compareTitle') element.innerHTML = words[lang][key];
    else element.textContent = words[lang][key];
  }
  for (const button of document.querySelectorAll('[data-lang]')) {
    const active = button.dataset.lang === lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  const scienceParams = new URLSearchParams();
  if (lang === 'ru') scienceParams.set('lang', 'ru');
  if (comparisonDay !== 'all') scienceParams.set('day', comparisonDay);
  const scienceUrl = `./science/${scienceParams.size ? `?${scienceParams}` : ''}`;
  scienceLink.href = scienceUrl;
  scienceLinkBottom.href = scienceUrl;
  scienceMobilePreview.href = scienceUrl;
  heroMissionLink.href = `./science/?site=07&find=1${comparisonDay === 'all' ? '' : `&day=${comparisonDay}`}${lang === 'ru' ? '&lang=ru' : ''}`;
  for (const card of document.querySelectorAll('.site-card')) {
    card.href = `./science/?site=${card.dataset.site}&find=1${comparisonDay === 'all' ? '' : `&day=${comparisonDay}`}${lang === 'ru' ? '&lang=ru' : ''}`;
  }
  updateComparisonOptions(lang);
  renderComparison();
  if (sciencePreview.dataset.currentLang !== lang) {
    sciencePreview.dataset.currentLang = lang;
    const embeddedUrl = `${scienceUrl}${scienceUrl.includes('?') ? '&' : '?'}embed=1`;
    sciencePreview.dataset.pendingSrc = embeddedUrl;
    if (sciencePreview.dataset.loaded === 'true') sciencePreview.src = embeddedUrl;
  }
  try { localStorage.setItem('luna-view-lang', lang); } catch { /* private mode */ }
}

for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => setLanguage(button.dataset.lang));
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let savedLanguage;
try { savedLanguage = localStorage.getItem('luna-view-lang'); } catch { savedLanguage = null; }
setLanguage(requestedLanguage === 'ru' || requestedLanguage === 'en' ? requestedLanguage : savedLanguage === 'ru' ? 'ru' : 'en');

const comparison = document.getElementById('compare');
const chartColors = ['#d9b47a', '#adc8cf', '#e8f2ec'];
function visibleAt(sample, horizon) {
  const bearing = Math.round(sample[1]) % 360;
  return sample[2] > horizon[bearing];
}
function runsForRow(flags, y, color) {
  let result = '';
  for (let start = 0; start < flags.length;) {
    if (!flags[start]) { start++; continue; }
    let end = start + 1;
    while (end < flags.length && flags[end]) end++;
    result += `<rect x="${start}" y="${y}" width="${end-start}" height="6" fill="${color}"/>`;
    start = end;
  }
  return result;
}
function updateComparisonOptions(lang) {
  const labels = [lang === 'ru' ? '14–22 НОЯ · ВСЕ ОТСЧЁТЫ' : '14–22 NOV · ALL SAMPLES', ...validComparisonDays.map(day => `${Number(day.slice(-2))} ${lang === 'ru' ? 'НОЯ' : 'NOV'} 2026`)];
  comparisonDaySelect.replaceChildren(...['all', ...validComparisonDays].map((value, index) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[index];
    return option;
  }));
  comparisonDaySelect.value = comparisonDay;
  comparisonDaySelect.setAttribute('aria-label', lang === 'ru' ? 'Период сравнения UTC' : 'UTC comparison period');
}
function russianSampleWord(count) {
  if (count % 100 >= 11 && count % 100 <= 14) return 'отсчётов';
  if (count % 10 === 1) return 'отсчёт';
  if (count % 10 >= 2 && count % 10 <= 4) return 'отсчёта';
  return 'отсчётов';
}
function renderComparison() {
  if (!comparisonData.size) return;
  const lang = document.documentElement.lang;
  const start = comparisonDay === 'all' ? 0 : (Number(comparisonDay.slice(-2)) - 14) * 24;
  const end = comparisonDay === 'all' ? 193 : start + 24;
  const total = end - start;
  for (const card of document.querySelectorAll('.site-card')) {
    const flags = comparisonData.get(card.dataset.site);
    if (!flags) continue;
    const sun = flags.sun.slice(start, end), earth = flags.earth.slice(start, end), both = flags.both.slice(start, end);
    const count = both.filter(Boolean).length;
    const chart = card.querySelector('.site-card-chart');
    card.querySelector('[data-count]').textContent = String(count);
    card.querySelector('.site-card-count small').textContent = lang === 'ru' ? `/ ${total} ${total === 193 ? 'ЧАСОВЫХ ОТСЧЁТОВ' : 'ЧАСОВЫХ ОТСЧЁТА'}` : `/ ${total} HOURLY SAMPLES`;
    const russianCount = russianSampleWord(count) === 'отсчёт' ? 'общий часовой отсчёт' : `общих часовых ${russianSampleWord(count)}`;
    chart.setAttribute('aria-label', `${words[lang][`site${card.dataset.site}Name`]}: ${count} ${lang === 'ru' ? `${russianCount} из ${total}` : `shared hourly samples out of ${total}`}`);
    chart.innerHTML = `<svg viewBox="0 0 ${total} 30" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 3.5H${total}M0 13.5H${total}M0 23.5H${total}" stroke="#4d5758" stroke-width="7"/>${runsForRow(sun, 0, chartColors[0])}${runsForRow(earth, 10, chartColors[1])}${runsForRow(both, 20, chartColors[2])}</svg>`;
  }
}
comparisonDaySelect.addEventListener('change', () => {
  comparisonDay = comparisonDaySelect.value;
  const params = new URLSearchParams(location.search);
  if (comparisonDay === 'all') params.delete('day'); else params.set('day', comparisonDay);
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
  setLanguage(document.documentElement.lang);
});
async function loadComparison() {
  const cards = [...document.querySelectorAll('.site-card')];
  await Promise.all(cards.map(async card => {
    const site = card.dataset.site;
    const chart = card.querySelector('.site-card-chart');
    try {
      const response = await fetch(`./science/luna_view_site${site}_data.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.site_id !== site || data.sun.length !== 193 || data.earth.length !== 193 || data.horizon_elevation_deg.length !== 360) throw new Error('Unexpected data shape');
      const sun = data.sun.map((sample, i) => {
        if (sample[0] !== data.earth[i][0]) throw new Error('Mismatched timestamps');
        return visibleAt(sample, data.horizon_elevation_deg);
      });
      const earth = data.earth.map(sample => visibleAt(sample, data.horizon_elevation_deg));
      const both = sun.map((lit, i) => lit && earth[i]);
      comparisonData.set(site, { sun, earth, both });
    } catch (error) {
      chart.textContent = document.documentElement.lang === 'ru' ? 'Данные пока недоступны' : 'Data unavailable';
      chart.setAttribute('aria-label', chart.textContent);
      console.warn(`Site ${site} comparison data:`, error);
    }
  }));
  renderComparison();
}
if (comparison && 'IntersectionObserver' in window) {
  const comparisonLoad = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) { observer.disconnect(); loadComparison(); }
  }, { rootMargin: '500px 0px' });
  comparisonLoad.observe(comparison);
} else if (comparison) loadComparison();

const scienceStage = document.querySelector('.science-stage');
let scienceVisible = false;
let previewNear = false;
const compactPreview = window.matchMedia('(max-width: 1100px)');
function loadPreviewIfNeeded() {
  if (!previewNear || compactPreview.matches || sciencePreview.dataset.loaded === 'true') return;
  sciencePreview.dataset.loaded = 'true';
  sciencePreview.src = sciencePreview.dataset.pendingSrc;
}
compactPreview.addEventListener('change', loadPreviewIfNeeded);
const sendScienceVisibility = () => {
  if (sciencePreview.dataset.loaded === 'true') sciencePreview.contentWindow?.postMessage({ type: 'luna-visibility', active: scienceVisible }, location.origin);
};
sciencePreview.addEventListener('load', sendScienceVisibility);
if ('IntersectionObserver' in window) {
  const loadScene = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      previewNear = true;
      loadPreviewIfNeeded();
      observer.disconnect();
    }
  }, { rootMargin: '800px 0px' });
  loadScene.observe(scienceStage);
  const sceneVisibility = new IntersectionObserver((entries) => { scienceVisible = entries[0].isIntersecting; sendScienceVisibility(); }, { threshold: .01 });
  sceneVisibility.observe(scienceStage);
} else { scienceVisible = true; previewNear = true; loadPreviewIfNeeded(); }

function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 32); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const reveals = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }, { threshold: .13, rootMargin: '0px 0px -25px 0px' });
  document.querySelectorAll('.reveal').forEach(element => reveals.observe(element));
} else document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));

if (reducedMotion.matches) heroVideo.pause();
else if ('IntersectionObserver' in window) {
  const videoVisibility = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !document.hidden) heroVideo.play().catch(() => {});
    else heroVideo.pause();
  }, { threshold: .1 });
  videoVisibility.observe(heroVideo);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) heroVideo.pause(); else if (!reducedMotion.matches && window.scrollY < window.innerHeight) heroVideo.play().catch(() => {}); });
