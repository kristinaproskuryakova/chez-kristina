/* ==========================================================================
   Куда сайт отправляет заявки на бронь и подписки на рассылку.
   Это адрес веб-приложения Google Apps Script (google/apps-script.gs),
   которое записывает строки в Google Таблицы. Как получить адрес —
   см. GOOGLE-SHEETS-SETUP.md
   ========================================================================== */
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbz5L3bvi9lWY4-zW2ly74irPBU2i_aVlY_YEdKh1vL2Y3DLtwjB68acp5VXXf63ko8j/exec";

// Отправить данные в таблицу. Возвращает true, если строка записана
async function sendToSheet(payload) {
  if (!SHEETS_URL) {
    // Адрес ещё не настроен: ничего не отправляем, но форма ведёт себя как при успехе
    console.warn("SHEETS_URL не задан в js/config.js — данные никуда не отправлены", payload);
    return true;
  }

  try {
    // Тело как обычный текст — так браузер не делает лишний предварительный запрос
    const response = await fetch(SHEETS_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result.ok === true;
  } catch (e) {
    return false;
  }
}
