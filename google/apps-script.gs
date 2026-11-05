/**
 * Chez Kristina — приём заявок с сайта в Google Таблицы.
 *
 * Сайт (js/config.js) отправляет сюда POST с JSON:
 *   { type: "booking", date, time, guests, name, phone, lang, website }
 *   { type: "newsletter", email, marketing, contact, lang }
 * Скрипт проверяет поля и добавляет строку в нужную таблицу.
 *
 * Развёртывание: Развернуть → Новое развёртывание → Веб-приложение,
 * «Выполнять от имени: я», «Доступ: все». Подробно — GOOGLE-SHEETS-SETUP.md
 */

const BOOKINGS_SHEET_ID = "1k7KGuXQE4_oEBClVYuh97H8oz3NAKkXWkkqPAuDy_Ao";   // Chez Kristina — Réservations
const NEWSLETTER_SHEET_ID = "1D0XoDCeZUQ_prhw16Kw0ZeYH5iX4Sy1g7BzDXox9Djs"; // Chez Kristina — Newsletter

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse(e.postData.contents);

    // Ловушка для ботов: настоящий гость это поле не видит и не заполняет
    if (data.website) return reply({ ok: true });

    if (data.type === "booking") {
      saveBooking(data);
    } else if (data.type === "newsletter") {
      saveSubscriber(data);
    } else {
      throw new Error("unknown type");
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Открыть адрес веб-приложения в браузере — проверка, что оно работает
function doGet() {
  return reply({ ok: true, service: "Chez Kristina forms" });
}

function saveBooking(d) {
  check(/^\d{4}-\d{2}-\d{2}$/.test(d.date), "date");
  check(/^\d{2}:\d{2}$/.test(d.time), "time");
  check(Number(d.guests) >= 1 && Number(d.guests) <= 6, "guests");
  check(typeof d.name === "string" && d.name.trim().length >= 2 && d.name.length <= 100, "name");
  check(/^\+\d{7,15}$/.test(d.phone), "phone");

  SpreadsheetApp.openById(BOOKINGS_SHEET_ID).getSheets()[0].appendRow([
    parisNow(), d.date, d.time, Number(d.guests), safe(d.name), "'" + d.phone, safe(d.lang)
  ]);
}

function saveSubscriber(d) {
  check(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email) && d.email.length <= 254, "email");
  check(d.marketing === true && d.contact === true, "consent");

  SpreadsheetApp.openById(NEWSLETTER_SHEET_ID).getSheets()[0].appendRow([
    parisNow(), safe(d.email), "oui", "oui", safe(d.lang)
  ]);
}

function check(condition, field) {
  if (!condition) throw new Error("invalid " + field);
}

// Текст, начинающийся с = + - @, таблица приняла бы за формулу — экранируем
function safe(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// Время получения заявки — по Парижу, независимо от настроек таблицы и аккаунта
function parisNow() {
  return Utilities.formatDate(new Date(), "Europe/Paris", "dd.MM.yyyy HH:mm");
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
