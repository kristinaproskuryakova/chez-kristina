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
    "about.quote": "« J'ai toujours rêvé d'ouvrir mon propre lieu, où je pourrais faire découvrir à mes hôtes les recettes de ma famille »"
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
    "about.quote": "“I always dreamed about opening my own place where I could show to my guests recipes of my family”"
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
   Таймлайн About us: подсвечено фото по центру, по нажатию оно переворачивается
   ========================================================================== */
const timeline = document.querySelector(".timeline");
const moments = [...timeline.querySelectorAll(".moment")];
let scrollTimer = null;

function setFlipped(moment, flipped) {
  moment.querySelector(".moment__card").setAttribute("aria-pressed", String(flipped));
}

function setActive(active) {
  moments.forEach((moment) => {
    const isActive = moment === active;
    moment.classList.toggle("is-active", isActive);
    if (!isActive) setFlipped(moment, false);
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

function isFlipped(moment) {
  return moment.querySelector(".moment__card").getAttribute("aria-pressed") === "true";
}

// Плавно поставить фото в центр ленты (страница при этом не прыгает)
function scrollToMoment(moment) {
  const box = timeline.getBoundingClientRect();
  const r = moment.getBoundingClientRect();
  const left = timeline.scrollLeft + (r.left + r.width / 2) - (box.left + box.width / 2);
  timeline.scrollTo({ left, behavior: "smooth" });
}

// Подсветку меняем, когда лента остановилась
timeline.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => setActive(findCentered()), 120);
}, { passive: true });

const tapHint = document.querySelector(".tap-hint");

moments.forEach((moment) => {
  moment.querySelector(".moment__card").addEventListener("click", () => {
    tapHint.classList.add("is-hidden"); // гость понял, что фото переворачиваются
    if (moment.classList.contains("is-active")) {
      setFlipped(moment, !isFlipped(moment));
    } else {
      // Нажали на затемнённое фото: подвинуть его в центр и сразу перевернуть
      setActive(moment);
      setFlipped(moment, true);
      scrollToMoment(moment);
    }
  });
});

setActive(findCentered());

/* --------------------------------------------------------------------------
   Автопрокрутка.
   Компьютер: каждые несколько секунд следующее фото, пауза под курсором.
   Телефон: фото само переворачивается, показывает надпись и возвращается.
   -------------------------------------------------------------------------- */
const STEP_DELAY = 4500;    // компьютер: сколько стоит одно фото
const FLIP_DELAY = 1500;    // телефон: пауза перед переворотом
const READ_DELAY = 4500;    // телефон: сколько показывается надпись
const RETURN_DELAY = 900;   // телефон: пауза после обратного переворота
const RESUME_DELAY = 6000;  // пауза после того, как гость сам полистал или нажал

const autoFlipQuery = window.matchMedia("(hover: none), (max-width: 860px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let autoTimer = null;
let phase = "arrived";      // arrived → shown → back → (следующее фото)
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

function goNext() {
  const current = moments.findIndex((m) => m.classList.contains("is-active"));
  const next = moments[(current + 1) % moments.length];
  setActive(next);
  scrollToMoment(next);
}

function tick() {
  if (!canPlay()) {
    schedule(500);
    return;
  }

  const active = moments.find((m) => m.classList.contains("is-active"));

  if (autoFlipQuery.matches) {
    if (phase === "arrived" && !isFlipped(active)) {
      setFlipped(active, true);
      phase = "shown";
      schedule(READ_DELAY);
      return;
    }
    if (phase === "shown") {
      setFlipped(active, false);
      phase = "back";
      schedule(RETURN_DELAY);
      return;
    }
  } else if (isFlipped(active)) {
    // На компьютере гость перевернул фото — ждём, пока он вернёт его обратно
    schedule(1000);
    return;
  }

  goNext();
  phase = "arrived";
  schedule(autoFlipQuery.matches ? FLIP_DELAY : STEP_DELAY);
}

function pauseByGuest() {
  pausedUntil = Date.now() + RESUME_DELAY;
  phase = "arrived";
}

["pointerdown", "wheel", "keydown"].forEach((type) => {
  timeline.addEventListener(type, pauseByGuest, { passive: true });
});

// Пауза под курсором — только для настоящей мыши, не для касаний
timeline.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovered = true; });
timeline.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovered = false; });

// Листаем, только когда лента видна на экране
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
}, { threshold: 0.5 }).observe(timeline);

if (!reducedMotion) {
  schedule(autoFlipQuery.matches ? FLIP_DELAY : STEP_DELAY);
}

/* ==========================================================================
   Запуск
   ========================================================================== */
setLanguage(getSavedLang() || DEFAULT_LANG);
updateHeader();
