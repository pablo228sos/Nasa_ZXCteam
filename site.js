document.documentElement.classList.add('js');

const words = {
  en: {
    navWhy: 'THE QUESTION', navExplore: 'EXPLORE', navMethod: 'METHOD',
    heroKicker: 'ZXC / LUNAR EXPLORATION STUDY', heroLine1: 'The Moon is a place.', heroLine2: 'Choose precisely.',
    heroDeck: 'Explore terrain that exists, light that moves, and the horizon that defines what a landing site can do.',
    heroExplore: 'EXPLORE THE TERRAIN', heroScience: 'SEE THE SCIENCE ↓', filmNotice: 'CINEMATIC ILLUSTRATION · NOT SURVEY DATA', scroll: 'SCROLL TO EXPLORE',
    question: 'THE QUESTION', premiseTitle: 'Coordinates are only<br>the beginning.', premiseBody: 'At the lunar south pole, a few kilometres can change sunlight and the path back to Earth. A useful site analysis has to connect terrain with time.',
    factorSun: 'Light meets the local horizon.', factorSunBody: 'Solar elevation alone is not enough. Nearby ridges decide when the surface actually receives light.',
    factorEarth: 'Earth has a horizon too.', factorEarthBody: 'Direct communication depends on whether Earth clears the terrain around a specific site.',
    factorTerrain: 'The terrain must be real.', factorTerrainBody: 'A visualisation only earns trust when its geometry, resolution and uncertainty can be traced to a source.',
    terrainLabel: 'THE TERRAIN', terrainEyebrow: 'ONE PLACE · EIGHT DAYS', terrainBody: 'Move through 16 × 16 km of measured topography. Change the hour to see where the Sun and Earth stand against the local terrain.', terrainOpen: 'OPEN FULL 3D ANALYSIS',
    stageNote: 'INTERACTIVE 3D MODEL · DRAG TO ORBIT', stageOpen: 'OPEN FULL SCREEN',
    methodLabel: 'METHOD & LIMITS', sourceNote: 'SOURCES ARE PART OF THE INTERFACE', methodTitle: 'Wonder needs<br>ground truth.',
    methodBody: "The 3D shape is built from NASA's LOLA Site04 elevation model. Sun and Earth positions come from JPL Horizons for the selected point and UTC hour. The screen computes a local terrain horizon within 8 km.",
    methodLimit: 'The 5 m source grid contains approximately 90% interpolated pixels; the live display samples it at 41.7 m. Surface tone and cinematic fill light help reveal shape. The hero film is generated imagery, not a map of this site.',
    footer: 'A working visual study by ZXC for NASA Space Apps Challenge 2026.'
  },
  ru: {
    navWhy: 'ВОПРОС', navExplore: 'ИССЛЕДОВАТЬ', navMethod: 'МЕТОД',
    heroKicker: 'ZXC / ИССЛЕДОВАНИЕ ЛУНЫ', heroLine1: 'Луна — это место.', heroLine2: 'Выбирай точно.',
    heroDeck: 'Изучай реальный рельеф, движение света и линию горизонта, от которой зависят возможности площадки.',
    heroExplore: 'ИССЛЕДОВАТЬ РЕЛЬЕФ', heroScience: 'КАК ЭТО РАБОТАЕТ ↓', filmNotice: 'КИНЕМАТОГРАФИЧНАЯ ИЛЛЮСТРАЦИЯ · НЕ КАРТА', scroll: 'ЛИСТАЙ ВНИЗ',
    question: 'ЗАДАЧА', premiseTitle: 'Координаты — только<br>начало.', premiseBody: 'У южного полюса Луны несколько километров могут изменить освещённость и связь с Землёй. Анализ площадки должен связывать рельеф со временем.',
    factorSun: 'Свет зависит от горизонта.', factorSunBody: 'Одной высоты Солнца недостаточно. Соседние хребты определяют, когда поверхность действительно освещена.',
    factorEarth: 'У Земли тоже есть горизонт.', factorEarthBody: 'Прямая связь зависит от того, видна ли Земля над рельефом вокруг конкретной точки.',
    factorTerrain: 'Рельеф должен быть настоящим.', factorTerrainBody: 'Визуализация заслуживает доверия, когда известны источник геометрии, разрешение и ограничения данных.',
    terrainLabel: 'РЕЛЬЕФ', terrainEyebrow: 'ОДНА ТОЧКА · ВОСЕМЬ ДНЕЙ', terrainBody: 'Пройди по 16 × 16 км рельефа, построенного из измерений. Изменяй час и смотри, где находятся Солнце и Земля относительно местного горизонта.', terrainOpen: 'ОТКРЫТЬ 3D-АНАЛИЗ',
    stageNote: 'ИНТЕРАКТИВНАЯ 3D-МОДЕЛЬ · ВРАЩАЙ МЫШЬЮ', stageOpen: 'НА ВЕСЬ ЭКРАН',
    methodLabel: 'МЕТОД И ГРАНИЦЫ', sourceNote: 'ИСТОЧНИКИ — ЧАСТЬ ИНТЕРФЕЙСА', methodTitle: 'Впечатлению нужна<br>опора на данные.',
    methodBody: 'Форма поверхности построена из модели высот NASA LOLA Site04. Положения Солнца и Земли рассчитаны JPL Horizons для выбранной точки и часа UTC. Экран вычисляет местный горизонт в радиусе 8 км.',
    methodLimit: 'Около 90% пикселей исходной сетки 5 м получены интерполяцией; экранная сетка имеет шаг 41,7 м. Цвет и дополнительный свет помогают прочитать форму. Видео на первом экране сгенерировано и не является картой этой площадки.',
    footer: 'Рабочее визуальное исследование команды ZXC для NASA Space Apps Challenge 2026.'
  }
};

const header = document.getElementById('site-header');
const heroVideo = document.getElementById('hero-video');
const scienceLink = document.getElementById('science-link');
const scienceLinkBottom = document.getElementById('science-link-bottom');
const sciencePreview = document.getElementById('science-preview');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setLanguage(lang) {
  if (!words[lang]) return;
  document.documentElement.lang = lang;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key === 'premiseTitle' || key === 'methodTitle') element.innerHTML = words[lang][key];
    else element.textContent = words[lang][key];
  }
  for (const button of document.querySelectorAll('[data-lang]')) {
    const active = button.dataset.lang === lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  const scienceUrl = `./science/${lang === 'ru' ? '?lang=ru' : ''}`;
  scienceLink.href = scienceUrl;
  scienceLinkBottom.href = scienceUrl;
  if (sciencePreview.dataset.currentLang !== lang) {
    sciencePreview.dataset.currentLang = lang;
    sciencePreview.dataset.pendingSrc = scienceUrl;
    if (sciencePreview.dataset.loaded === 'true') sciencePreview.src = scienceUrl;
  }
  try { localStorage.setItem('luna-view-lang', lang); } catch { /* private mode */ }
}

for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => setLanguage(button.dataset.lang));
const requestedLanguage = new URLSearchParams(location.search).get('lang');
let savedLanguage;
try { savedLanguage = localStorage.getItem('luna-view-lang'); } catch { savedLanguage = null; }
setLanguage(requestedLanguage === 'ru' || requestedLanguage === 'en' ? requestedLanguage : savedLanguage === 'ru' ? 'ru' : 'en');

const scienceStage = document.querySelector('.science-stage');
let scienceVisible = false;
const sendScienceVisibility = () => {
  if (sciencePreview.dataset.loaded === 'true') sciencePreview.contentWindow?.postMessage({ type: 'luna-visibility', active: scienceVisible }, location.origin);
};
sciencePreview.addEventListener('load', sendScienceVisibility);
if ('IntersectionObserver' in window) {
  const loadScene = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      sciencePreview.dataset.loaded = 'true';
      sciencePreview.src = sciencePreview.dataset.pendingSrc;
      observer.disconnect();
    }
  }, { rootMargin: '800px 0px' });
  loadScene.observe(scienceStage);
  const sceneVisibility = new IntersectionObserver((entries) => { scienceVisible = entries[0].isIntersecting; sendScienceVisibility(); }, { threshold: .01 });
  sceneVisibility.observe(scienceStage);
} else { scienceVisible = true; sciencePreview.dataset.loaded = 'true'; sciencePreview.src = sciencePreview.dataset.pendingSrc; }

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
