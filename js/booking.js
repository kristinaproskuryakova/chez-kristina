/* ==========================================================================
   Бронирование: окно с выбором гостей, даты и времени, имя и телефон
   ========================================================================== */
const BOOKING = {
  maxGuests: 6,
  defaultGuests: 2,
  daysAhead: 90,          // на сколько дней вперёд можно бронировать
  closedDays: [1],        // выходные: 0 — воскресенье, 1 — понедельник…
  // Время, на которое можно забронировать (последний заказ за час до закрытия)
  services: [
    { key: "booking.lunch", from: "12:00", to: "14:00" },
    { key: "booking.dinner", from: "17:00", to: "21:00" }
  ],
  stepMinutes: 30,
  minNoticeMinutes: 30    // на сегодня нельзя выбрать время раньше, чем через полчаса
};

// Коды стран и сколько цифр в номере после кода (без ведущего 0)
// example — как номер обычно пишут в этой стране: подсказка в поле и в сообщении об ошибке
const PHONE_CODES = [
  { code: "+33", country: "France", digits: [9], example: "06 12 34 56 78" },
  { code: "+32", country: "Belgique", digits: [8, 9], example: "0470 12 34 56" },
  { code: "+41", country: "Suisse", digits: [9], example: "079 123 45 67" },
  { code: "+44", country: "Royaume-Uni", digits: [10], example: "07700 900123" },
  { code: "+49", country: "Allemagne", digits: [10, 11], example: "01512 3456789" },
  { code: "+34", country: "Espagne", digits: [9], example: "612 34 56 78" },
  { code: "+39", country: "Italie", digits: [9, 10], example: "312 345 6789" },
  { code: "+31", country: "Pays-Bas", digits: [9], example: "06 12345678" },
  { code: "+1", country: "USA / Canada", digits: [10], example: "212 555 0123" },
  { code: "", country: "Autre", digits: null, example: "+380 00 000 0000" }
];

const bkDialog = document.getElementById("booking-dialog");
const bkForm = bkDialog.querySelector(".bk-form");
const bkDone = bkDialog.querySelector(".nl-done");
const bkName = bkForm.querySelector("#bk-name");
const bkCode = bkForm.querySelector("#bk-code");
const bkPhone = bkForm.querySelector("#bk-phone");
const bkSubmit = bkForm.querySelector('button[type="submit"]');
const bkErrors = {
  time: bkForm.querySelector("#bk-time-error"),
  name: bkForm.querySelector("#bk-name-error"),
  phone: bkForm.querySelector("#bk-phone-error"),
  send: bkForm.querySelector(".bk-send-error")
};
const bkChips = {
  guests: bkForm.querySelector('[data-chips="guests"]'),
  time: bkForm.querySelector('[data-chips="time"]')
};
const bkDate = bkForm.elements.date;                       // скрытое поле: выбранный день 2026-11-07
const bkDateToggle = bkForm.querySelector(".bk-date__toggle");
const bkDateValue = bkForm.querySelector("#bk-date-value");
const bkCal = bkForm.querySelector(".bk-cal");
const bkCalMonth = bkCal.querySelector(".bk-cal__month");
const bkCalGrid = bkCal.querySelector(".bk-cal__grid");
let calMonth = null;                                       // какой месяц показан: первое число месяца

function bkText(key) {
  const dict = translations[document.documentElement.lang] || translations.fr;
  return dict[key] || key;
}

function bkEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* --------------------------------------------------------------------------
   Кнопки-«чипы»: на самом деле радиокнопки, чтобы работала клавиатура
   -------------------------------------------------------------------------- */
function chip(name, value, label, { checked = false, disabled = false } = {}) {
  const wrap = bkEl("label", "bk-chip");
  const input = bkEl("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.disabled = disabled;
  wrap.append(input, bkEl("span", "", label));
  return wrap;
}

function selected(name) {
  if (name === "date") return bkDate.value || null;
  const input = bkForm.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
}

function toISODate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function renderGuests() {
  const current = Number(selected("guests")) || BOOKING.defaultGuests;
  bkChips.guests.replaceChildren(
    ...Array.from({ length: BOOKING.maxGuests }, (_, i) =>
      chip("guests", String(i + 1), String(i + 1), { checked: i + 1 === current }))
  );
}

/* --------------------------------------------------------------------------
   Календарик для даты
   -------------------------------------------------------------------------- */
function bkLocale() {
  return document.documentElement.lang === "en" ? "en-GB" : "fr-FR";
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function fromISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Первый и последний день, которые можно выбрать
function dateRange() {
  const now = new Date();
  const first = startOfDay(now);
  // Сегодня уже нет свободного времени (вечер) — начинаем с завтра
  const lastSlot = toMinutes(BOOKING.services[BOOKING.services.length - 1].to);
  if (now.getHours() * 60 + now.getMinutes() + BOOKING.minNoticeMinutes > lastSlot) first.setDate(first.getDate() + 1);
  const last = startOfDay(now);
  last.setDate(last.getDate() + BOOKING.daysAhead);
  return { first, last };
}

function isOpenDay(day) {
  const { first, last } = dateRange();
  return day >= first && day <= last && !BOOKING.closedDays.includes(day.getDay());
}

// «Aujourd'hui», «Demain» или «sam. 7 novembre»
function dateLabel(iso) {
  const day = fromISODate(iso);
  const diff = Math.round((day - startOfDay(new Date())) / 86400000);
  if (diff === 0) return bkText("booking.today");
  if (diff === 1) return bkText("booking.tomorrow");
  return new Intl.DateTimeFormat(bkLocale(), { weekday: "long", day: "numeric", month: "long" }).format(day);
}

function renderCalendar() {
  const locale = bkLocale();
  const { first, last } = dateRange();
  const today = toISODate(new Date());
  const month = calMonth.getMonth();

  bkCalMonth.textContent = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(calMonth);
  bkCal.querySelector('[data-cal="prev"]').disabled = calMonth <= new Date(first.getFullYear(), first.getMonth(), 1);
  bkCal.querySelector('[data-cal="next"]').disabled = calMonth >= new Date(last.getFullYear(), last.getMonth(), 1);

  // Заголовки дней недели, неделя с понедельника: lun. mar. mer.…
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const cells = Array.from({ length: 7 }, (_, i) =>
    bkEl("span", "bk-cal__weekday", weekday.format(new Date(2024, 0, 1 + i)).replace(".", "")));

  // Пустые клетки до первого числа
  const offset = (calMonth.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) cells.push(bkEl("span"));

  const daysInMonth = new Date(calMonth.getFullYear(), month + 1, 0).getDate();
  const full = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(calMonth.getFullYear(), month, d);
    const iso = toISODate(day);
    const button = bkEl("button", "bk-cal__day", String(d));
    button.type = "button";
    button.dataset.date = iso;
    button.setAttribute("aria-label", full.format(day));
    button.disabled = !isOpenDay(day);
    if (BOOKING.closedDays.includes(day.getDay())) button.title = bkText("booking.closed");
    if (iso === today) button.classList.add("is-today");
    if (iso === bkDate.value) button.setAttribute("aria-pressed", "true");
    cells.push(button);
  }
  bkCalGrid.replaceChildren(...cells);
}

function setCalendarOpen(open) {
  bkCal.hidden = !open;
  bkDateToggle.setAttribute("aria-expanded", String(open));
  if (open) {
    const current = fromISODate(bkDate.value);
    calMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    renderCalendar();
    (bkCalGrid.querySelector('[aria-pressed="true"]') || bkCalGrid.querySelector(".bk-cal__day:not(:disabled)"))?.focus();
  }
}

function setDate(iso) {
  bkDate.value = iso;
  bkDateValue.textContent = dateLabel(iso);
}

// День по умолчанию — первый открытый
function renderDates() {
  const current = bkDate.value ? fromISODate(bkDate.value) : null;
  if (current && isOpenDay(current)) {
    setDate(bkDate.value);
  } else {
    const day = new Date(dateRange().first);
    while (!isOpenDay(day)) day.setDate(day.getDate() + 1);
    setDate(toISODate(day));
  }
  if (!bkCal.hidden) renderCalendar();
}

bkDateToggle.addEventListener("click", () => setCalendarOpen(bkCal.hidden));

bkCal.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-cal]");
  if (nav) {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + (nav.dataset.cal === "next" ? 1 : -1), 1);
    renderCalendar();
    return;
  }
  const day = e.target.closest(".bk-cal__day");
  if (!day || day.disabled) return;
  setDate(day.dataset.date);
  setCalendarOpen(false);
  bkDateToggle.focus();
  renderTimes();
  bkErrors.time.textContent = "";
});

// Esc закрывает только календарик, а не всё окно
bkCal.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  e.preventDefault();
  setCalendarOpen(false);
  bkDateToggle.focus();
});

function renderTimes() {
  const date = selected("date");
  const current = selected("time");
  const now = new Date();
  const isToday = date === toISODate(now);
  const earliest = now.getHours() * 60 + now.getMinutes() + BOOKING.minNoticeMinutes;

  const groups = BOOKING.services.map((service) => {
    const group = bkEl("div", "bk-times__group");
    group.append(bkEl("span", "bk-times__label", bkText(service.key)));
    const row = bkEl("div", "bk-chips");
    for (let t = toMinutes(service.from); t <= toMinutes(service.to); t += BOOKING.stepMinutes) {
      const value = fromMinutes(t);
      row.append(chip("time", value, value, {
        checked: value === current,
        disabled: isToday && t < earliest
      }));
    }
    group.append(row);
    return group;
  });

  bkChips.time.replaceChildren(...groups);
  // Если выбранное время стало недоступно — выбор сбрасывается
  const checked = bkForm.querySelector('input[name="time"]:checked');
  if (checked && checked.disabled) checked.checked = false;
}

function renderCodes() {
  const current = bkCode.value || "+33";
  bkCode.replaceChildren(...PHONE_CODES.map(({ code, country }) => {
    const option = bkEl("option", "", code ? `${code} ${country}` : bkText("booking.otherCode"));
    option.value = code;
    return option;
  }));
  bkCode.value = current;
}

bkChips.time.addEventListener("change", () => { bkErrors.time.textContent = ""; });

/* --------------------------------------------------------------------------
   Проверка полей
   -------------------------------------------------------------------------- */
function setError(field, input, message) {
  bkErrors[field].textContent = message || "";
  if (input) input.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

// Номер полностью: код страны + цифры. null — номер неверный
function fullPhone() {
  const code = bkCode.value;
  let digits = bkPhone.value.replace(/[\s.\-()]/g, "");

  if (!code) {
    // «Другой код»: номер целиком в международном виде
    return /^\+\d{7,15}$/.test(digits) ? digits : null;
  }

  if (digits.startsWith(code)) digits = digits.slice(code.length);
  if (code !== "+39") digits = digits.replace(/^0/, ""); // 06 12… → 6 12…
  // После кода страны номер не может начинаться с 0 (кроме Италии)
  if (!/^\d+$/.test(digits) || (code !== "+39" && digits.startsWith("0"))) return null;

  const rule = phoneRule();
  return rule.digits.includes(digits.length) ? code + digits : null;
}

function phoneRule() {
  return PHONE_CODES.find((p) => p.code === bkCode.value) || PHONE_CODES[0];
}

function validateBooking() {
  const timeOk = setError("time", null, selected("time") ? "" : bkText("booking.errTime"));
  const nameOk = setError("name", bkName, bkName.value.trim().length >= 2 ? "" : bkText("booking.errName"));

  let phoneMessage = "";
  if (!bkPhone.value.trim()) phoneMessage = bkText("booking.errPhoneEmpty");
  else if (!fullPhone()) phoneMessage = bkCode.value
    ? `${bkText("booking.errPhoneDigits")} ${phoneRule().example}`
    : bkText("booking.errPhoneIntl");
  const phoneOk = setError("phone", bkPhone, phoneMessage);

  return timeOk && nameOk && phoneOk;
}

bkName.addEventListener("input", () => { if (bkErrors.name.textContent) setError("name", bkName, ""); });
bkPhone.addEventListener("input", () => { if (bkErrors.phone.textContent) setError("phone", bkPhone, ""); });
bkCode.addEventListener("change", () => {
  bkPhone.placeholder = phoneRule().example;
  if (bkErrors.phone.textContent) setError("phone", bkPhone, "");
});

/* --------------------------------------------------------------------------
   Отправка
   -------------------------------------------------------------------------- */
bkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bkErrors.send.textContent = "";
  if (!validateBooking()) {
    const firstError = bkForm.querySelector('[aria-invalid="true"]');
    if (firstError) firstError.focus();
    return;
  }

  const payload = {
    type: "booking",
    date: selected("date"),
    time: selected("time"),
    guests: Number(selected("guests")),
    name: bkName.value.trim(),
    phone: fullPhone(),
    lang: document.documentElement.lang,
    website: bkForm.elements.website.value // ловушка для ботов
  };

  bkSubmit.disabled = true;
  bkSubmit.textContent = bkText("booking.sending");
  const ok = await sendToSheet(payload);
  bkSubmit.disabled = false;
  bkSubmit.textContent = bkText("booking.submit");

  if (!ok) {
    bkErrors.send.textContent = bkText("booking.errSend");
    return;
  }

  bkDialog.querySelector(".bk-summary").textContent =
    `${dateLabel(payload.date)} · ${payload.time} · ${payload.guests} ${bkText(payload.guests > 1 ? "booking.people" : "booking.person")}`;
  bkForm.hidden = true;
  bkDone.hidden = false;
});

/* --------------------------------------------------------------------------
   Открыть / закрыть окно — со всех кнопок «Réserver une table»
   -------------------------------------------------------------------------- */
function openBooking() {
  bkForm.reset();
  bkDate.value = "";
  setCalendarOpen(false);
  bkForm.hidden = false;
  bkDone.hidden = true;
  Object.keys(bkErrors).forEach((k) => { bkErrors[k].textContent = ""; });
  bkForm.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute("aria-invalid"));
  renderGuests();
  renderDates();
  renderTimes();
  renderCodes();
  bkDialog.showModal();
  document.body.classList.add("no-scroll");
}

document.querySelectorAll("[data-open-booking]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof setMenuOpen === "function" && isMenuOpen()) setMenuOpen(false); // мобильное меню
    openBooking();
  });
});

bkDialog.querySelector("[data-close-booking]").addEventListener("click", () => bkDialog.close());
bkDialog.addEventListener("click", (e) => { if (e.target === bkDialog) bkDialog.close(); });
bkDialog.addEventListener("close", () => document.body.classList.remove("no-scroll"));

// Смена языка: подписи дат и времени на новом языке, выбор сохраняется
document.addEventListener("sitelanguagechange", () => {
  if (!bkDialog.open) return;
  renderDates();
  renderTimes();
  renderCodes();
});
