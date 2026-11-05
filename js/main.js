/* ==========================================================================
   Переводы
   ========================================================================== */
const translations = {
  fr: {
    "nav.about": "À propos",
    "nav.menu": "Menu",
    "nav.photos": "Photos",
    "nav.contacts": "Contacts",
    "nav.book": "Réserver une table",
    "nav.open": "Ouvrir le menu",
    "nav.close": "Fermer le menu",
    "hero.viewMenu": "Voir le menu",
    "section.newsletter": "Newsletter",
    "about.1988": "Kristina naît en Normandie, dans une famille qui tient la boulangerie du village",
    "about.1991": "Kristina fait du pain avec sa grand-mère",
    "about.2008": "Premier emploi : commis de cuisine dans un restaurant vietnamien à Paris",
    "about.2012": "Kristina devient sous-chef dans un bistrot parisien",
    "about.2018": "Kristina revient à Veules-les-Tulipes et y ouvre son premier bistrot",
    "menu.appetizers": "Entrées",
    "menu.mains": "Plats",
    "menu.wines": "Carte des vins",
    "menu.open": "Ouvrir le menu",
    "menu.close": "Fermer",
    "menu.prev": "Page précédente",
    "menu.next": "Page suivante"
  },
  en: {
    "nav.about": "About us",
    "nav.menu": "Menu",
    "nav.photos": "Photos",
    "nav.contacts": "Contacts",
    "nav.book": "Book a table",
    "nav.open": "Open menu",
    "nav.close": "Close menu",
    "hero.viewMenu": "View Menu",
    "section.newsletter": "Newsletter",
    "about.1988": "Kristina was born in Normandie in the family owning a local bakery",
    "about.1991": "Kristina making bread with her grandma",
    "about.2008": "First job as a cook assistant in the Vietnamese restaurant in Paris",
    "about.2012": "Kristina became a sous chef in a Parisian bistrot",
    "about.2018": "Kristina comes back to Veules-les-Tulipes and opens her first bistrot there",
    "menu.appetizers": "Appetizers",
    "menu.mains": "Main course",
    "menu.wines": "Wine List",
    "menu.open": "Open the menu",
    "menu.close": "Close",
    "menu.prev": "Previous page",
    "menu.next": "Next page"
  }
};

const DEFAULT_LANG = "fr";
const LANG_KEY = "chez-kristina-lang";

function getSavedLang() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch (e) {
    return null;
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    // хранилище недоступно — язык просто не запомнится
  }
}

function setLanguage(lang) {
  const dict = translations[lang] || translations[DEFAULT_LANG];

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const text = dict[el.dataset.i18n];
    if (text) el.textContent = text;
  });

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });

  saveLang(lang);
  updateToggleLabel();
  // Меню (js/menu.js) перерисовывает описания блюд на новом языке
  document.dispatchEvent(new Event("sitelanguagechange"));
}

document.querySelectorAll(".lang-switch button").forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

/* ==========================================================================
   Мобильное меню
   ========================================================================== */
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.getElementById("mobile-nav");

function isMenuOpen() {
  return menuToggle.getAttribute("aria-expanded") === "true";
}

function updateToggleLabel() {
  const dict = translations[document.documentElement.lang] || translations[DEFAULT_LANG];
  const label = menuToggle.querySelector(".visually-hidden");
  label.textContent = isMenuOpen() ? dict["nav.close"] : dict["nav.open"];
}

function setMenuOpen(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  mobileNav.hidden = !open;
  document.body.classList.toggle("no-scroll", open);
  updateToggleLabel();
}

menuToggle.addEventListener("click", () => setMenuOpen(!isMenuOpen()));

// После выбора раздела меню закрывается
mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isMenuOpen()) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

/* ==========================================================================
   Шапка: прозрачная над фото, сплошная после прокрутки
   ========================================================================== */
const header = document.querySelector(".site-header");

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", updateHeader, { passive: true });

/* ==========================================================================
   Таймлайн About us: подсвечено фото по центру, лента листается сама
   ========================================================================== */
const timeline = document.querySelector(".timeline");
const moments = [...timeline.querySelectorAll(".moment")];
let scrollTimer = null;

function setActive(active) {
  moments.forEach((moment) => {
    moment.classList.toggle("is-active", moment === active);
  });
}

// Активное фото — то, что ближе всего к центру ленты
function findCentered() {
  const box = timeline.getBoundingClientRect();
  const center = box.left + box.width / 2;
  let closest = moments[0];
  let best = Infinity;

  moments.forEach((moment) => {
    const r = moment.getBoundingClientRect();
    const distance = Math.abs(r.left + r.width / 2 - center);
    if (distance < best) {
      best = distance;
      closest = moment;
    }
  });
  return closest;
}

// Подсветку меняем, когда лента остановилась
timeline.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => setActive(findCentered()), 120);
}, { passive: true });

/* Плавная прокрутка ленты с заданной длительностью */
let scrollAnimation = null;

function stopScrollAnimation() {
  if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
  scrollAnimation = null;
  timeline.classList.remove("is-animating");
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function scrollToMoment(moment, duration) {
  const box = timeline.getBoundingClientRect();
  const r = moment.getBoundingClientRect();
  const from = timeline.scrollLeft;
  const to = from + (r.left + r.width / 2) - (box.left + box.width / 2);
  const start = performance.now();

  stopScrollAnimation();
  timeline.classList.add("is-animating");

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    timeline.scrollLeft = from + (to - from) * easeInOut(t);
    if (t < 1) {
      scrollAnimation = requestAnimationFrame(frame);
    } else {
      stopScrollAnimation();
    }
  }
  scrollAnimation = requestAnimationFrame(frame);
}

/* --------------------------------------------------------------------------
   Автопрокрутка: каждое фото стоит STEP_DELAY, потом следующее.
   После последнего фото — быстрая перемотка к первому.
   -------------------------------------------------------------------------- */
const STEP_DELAY = 3500;      // сколько стоит одно фото
const STEP_DURATION = 700;    // переход к следующему фото
const REWIND_DURATION = 1000; // быстрая перемотка с последнего фото на первое
const RESUME_DELAY = 6000;    // пауза после того, как гость сам полистал или нажал

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let autoTimer = null;
let hovered = false;
let visible = false;
let pausedUntil = 0;

function schedule(ms) {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(tick, ms);
}

function canPlay() {
  return visible && !hovered && !document.hidden && Date.now() > pausedUntil;
}

function tick() {
  if (!canPlay()) {
    schedule(500);
    return;
  }

  const current = moments.findIndex((m) => m.classList.contains("is-active"));
  const isLast = current === moments.length - 1;
  const next = moments[isLast ? 0 : current + 1];

  setActive(next);
  scrollToMoment(next, isLast ? REWIND_DURATION : STEP_DURATION);
  schedule(STEP_DELAY + (isLast ? REWIND_DURATION : STEP_DURATION));
}

function pauseByGuest() {
  stopScrollAnimation();
  pausedUntil = Date.now() + RESUME_DELAY;
}

["pointerdown", "wheel", "touchstart", "keydown"].forEach((type) => {
  timeline.addEventListener(type, pauseByGuest, { passive: true });
});

// Нажали на затемнённое фото — подвинуть его в центр
moments.forEach((moment) => {
  moment.addEventListener("click", () => {
    setActive(moment);
    scrollToMoment(moment, STEP_DURATION);
  });
});

// Пауза под курсором — только для настоящей мыши, не для касаний
timeline.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovered = true; });
timeline.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovered = false; });

// Листаем, только когда лента видна на экране
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
}, { threshold: 0.5 }).observe(timeline);

setActive(findCentered());

if (!reducedMotion) {
  schedule(STEP_DELAY);
}

/* ==========================================================================
   Запуск
   ========================================================================== */
setLanguage(getSavedLang() || DEFAULT_LANG);
updateHeader();
