/* ==========================================================================
   Окно cookies: при первом заходе спрашивает согласие, выбор хранится
   в браузере. Без согласия карта Google не загружается.
   ========================================================================== */
const CONSENT_KEY = "chez-kristina-cookies";
const CONSENT_MONTHS = 6; // через полгода спросим снова (рекомендация CNIL)

const cookieBanner = document.getElementById("cookie-banner");
const cookieSettings = cookieBanner.querySelector(".cookie-banner__settings");
const cookieMapsBox = cookieSettings.querySelector('input[name="maps"]');
const cookieButtons = {
  refuse: cookieBanner.querySelector('[data-cookies="refuse"]'),
  customize: cookieBanner.querySelector('[data-cookies="customize"]'),
  save: cookieBanner.querySelector('[data-cookies="save"]'),
  accept: cookieBanner.querySelector('[data-cookies="accept"]')
};

// Сохранённый выбор: { maps: true/false, date: "2026-11-05T…" } или null
function getConsent() {
  try {
    const consent = JSON.parse(localStorage.getItem(CONSENT_KEY));
    if (!consent || !consent.date) return null;
    const expires = new Date(consent.date);
    expires.setMonth(expires.getMonth() + CONSENT_MONTHS);
    return expires > new Date() ? consent : null;
  } catch (e) {
    return null;
  }
}

function saveConsent(choice) {
  const consent = { maps: Boolean(choice.maps), date: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch (e) {
    // хранилище недоступно — выбор действует до перезагрузки страницы
  }
  applyConsent(consent);
  hideCookieBanner();
}

/* --------------------------------------------------------------------------
   Карта Google: адрес подставляется в iframe только с согласия
   -------------------------------------------------------------------------- */
function applyConsent(consent) {
  const allowed = Boolean(consent && consent.maps);
  document.querySelectorAll("iframe[data-consent-src]").forEach((frame) => {
    if (allowed && !frame.getAttribute("src")) frame.src = frame.dataset.consentSrc;
    if (!allowed && frame.getAttribute("src")) frame.removeAttribute("src");
    frame.hidden = !allowed;
  });
  document.querySelectorAll(".footer-map__blocked").forEach((note) => { note.hidden = allowed; });
}

document.querySelectorAll(".footer-map__allow").forEach((button) => {
  button.addEventListener("click", () => {
    const consent = getConsent() || {};
    saveConsent({ ...consent, maps: true });
  });
});

/* --------------------------------------------------------------------------
   Окно
   -------------------------------------------------------------------------- */
function setCustomizeOpen(open) {
  cookieSettings.hidden = !open;
  cookieButtons.customize.hidden = open;
  cookieButtons.save.hidden = !open;
}

function showCookieBanner() {
  const consent = getConsent();
  cookieMapsBox.checked = Boolean(consent && consent.maps);
  setCustomizeOpen(false);
  cookieBanner.hidden = false;
  cookieButtons.accept.focus({ preventScroll: true });
}

function hideCookieBanner() {
  cookieBanner.hidden = true;
}

cookieButtons.refuse.addEventListener("click", () => saveConsent({ maps: false }));
cookieButtons.accept.addEventListener("click", () => saveConsent({ maps: true }));
cookieButtons.save.addEventListener("click", () => saveConsent({ maps: cookieMapsBox.checked }));
cookieButtons.customize.addEventListener("click", () => {
  setCustomizeOpen(true);
  cookieMapsBox.focus();
});

// Ссылка «Gérer les cookies» в футере — открыть окно снова и поменять выбор
document.querySelectorAll("[data-open-cookies]").forEach((trigger) => {
  trigger.addEventListener("click", showCookieBanner);
});

// При заходе: выбор уже сделан — применяем, иначе показываем окно
const savedConsent = getConsent();
applyConsent(savedConsent);
if (!savedConsent) showCookieBanner();
