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
    "section.newsletter": "Newsletter"
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
    "section.newsletter": "Newsletter"
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
   Запуск
   ========================================================================== */
setLanguage(getSavedLang() || DEFAULT_LANG);
updateHeader();
