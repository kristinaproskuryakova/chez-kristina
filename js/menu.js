/* ==========================================================================
   Меню: блюда и цены берутся из Google Таблицы.
   Как поменять цену или блюдо — см. MENU-HOW-TO.md
   ========================================================================== */

// Опубликованная Google Таблица (Файл → Поделиться → Опубликовать в интернете → CSV)
const MENU_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTYMbfWronUjoU1SWJuEaHWY3_iqw5bRwALHSxwym3FCIjOQveAi825UOQaBUzyfHH8oaCSM7GzdCre/pub?output=csv";

// Разделы меню в том порядке, в каком идут страницы.
// key — как раздел записан в столбце section таблицы.
const MENU_SECTIONS = [
  { key: "appetizers", title: "menu.appetizers" },
  { key: "mains", title: "menu.mains" },
  { key: "wines", title: "menu.wines" }
];

// Запасная копия: показывается, если таблица не загрузилась
const MENU_FALLBACK = [
  { section: "appetizers", name: "Soupe à l'oignon", desc_fr: "Gratinée au comté, croûtons maison", desc_en: "Gratinated with Comté, homemade croutons", price: "9 €" },
  { section: "appetizers", name: "Escargots de Bourgogne", desc_fr: "Beurre persillé, ail", desc_en: "Parsley and garlic butter", price: "12 €" },
  { section: "appetizers", name: "Terrine de campagne", desc_fr: "Cornichons, pain de campagne grillé", desc_en: "Pickles, toasted country bread", price: "10 €" },
  { section: "appetizers", name: "Huîtres de Normandie (6)", desc_fr: "Citron, vinaigre à l'échalote", desc_en: "Lemon, shallot vinegar", price: "16 €" },
  { section: "appetizers", name: "Salade de chèvre chaud", desc_fr: "Miel, noix, jeunes pousses", desc_en: "Honey, walnuts, baby greens", price: "11 €" },
  { section: "mains", name: "Moules marinières", desc_fr: "Vin blanc, échalotes, frites", desc_en: "White wine, shallots, fries", price: "19 €" },
  { section: "mains", name: "Bœuf bourguignon", desc_fr: "Mijoté au vin rouge, purée maison", desc_en: "Slow-cooked in red wine, homemade mash", price: "24 €" },
  { section: "mains", name: "Sole meunière", desc_fr: "Beurre noisette, câpres, pommes vapeur", desc_en: "Brown butter, capers, steamed potatoes", price: "28 €" },
  { section: "mains", name: "Poulet à la normande", desc_fr: "Crème, cidre et pommes", desc_en: "Cream, cider and apples", price: "21 €" },
  { section: "mains", name: "Ratatouille et polenta", desc_fr: "Légumes du soleil, basilic", desc_en: "Summer vegetables, basil", price: "17 €" },
  { section: "wines", name: "Chablis", desc_fr: "Bourgogne, blanc · verre / bouteille", desc_en: "Burgundy, white · glass / bottle", price: "7 € / 38 €" },
  { section: "wines", name: "Sancerre", desc_fr: "Loire, blanc · verre / bouteille", desc_en: "Loire, white · glass / bottle", price: "8 € / 42 €" },
  { section: "wines", name: "Côtes du Rhône", desc_fr: "Rhône, rouge · verre / bouteille", desc_en: "Rhône, red · glass / bottle", price: "6 € / 30 €" },
  { section: "wines", name: "Saint-Émilion", desc_fr: "Bordeaux, rouge · verre / bouteille", desc_en: "Bordeaux, red · glass / bottle", price: "9 € / 48 €" },
  { section: "wines", name: "Cidre de Normandie", desc_fr: "Brut, fermier · verre / bouteille", desc_en: "Dry, farmhouse · glass / bottle", price: "5 € / 18 €" }
];

let menuItems = MENU_FALLBACK;

/* --------------------------------------------------------------------------
   Чтение таблицы
   -------------------------------------------------------------------------- */

// Разбор CSV с учётом кавычек и запятых внутри текста
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvToItems(text) {
  const [header, ...rows] = parseCsv(text);
  const keys = header.map((h) => h.trim().toLowerCase());

  return rows
    .map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] || "").trim()])))
    .filter((item) => item.section && item.name);
}

async function loadMenu() {
  try {
    const response = await fetch(MENU_CSV_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(response.status);
    const items = csvToItems(await response.text());
    if (items.length) {
      menuItems = items;
      renderBook();
    }
  } catch (e) {
    // Таблица недоступна — остаётся запасная копия меню
  }
}

/* --------------------------------------------------------------------------
   Книга
   -------------------------------------------------------------------------- */
const menuDialog = document.getElementById("menu-dialog");
const bookPages = menuDialog.querySelector(".book__pages");
const bookTabs = menuDialog.querySelector(".book__tabs");
const bookCounter = menuDialog.querySelector(".book__counter");

let currentPage = 0;

function menuText(key) {
  const dict = translations[document.documentElement.lang] || translations.fr;
  return dict[key] || key;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Как в Canva: на каждой странице внизу по центру мелко «Chez Kristina»
function pageFooter() {
  return el("p", "book__footer", "Chez Kristina");
}

function renderCover() {
  const page = el("article", "book__page book__page--cover");
  const sketch = el("span", "cover-sketch");
  const img = el("img");
  img.src = "images/oysters-sketch.png";
  img.alt = "";
  sketch.append(img);
  page.append(sketch, el("h3", "book__cover-title", menuText("nav.menu")), pageFooter());
  return page;
}

function renderSection(section) {
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const page = el("article", "book__page");
  page.append(el("h3", "book__title", menuText(section.title)));

  const list = el("ul", "book__list");
  menuItems
    .filter((item) => item.section.toLowerCase() === section.key)
    .forEach((item) => {
      const li = el("li", "dish");
      const text = el("div", "dish__text");
      text.append(el("span", "dish__name", item.name));
      const desc = item["desc_" + lang] || item.desc_fr;
      if (desc) text.append(el("span", "dish__desc", desc));
      li.append(text, el("span", "dish__price", item.price));
      list.append(li);
    });

  page.append(list, pageFooter());
  return page;
}

function renderBook() {
  const pages = [renderCover(), ...MENU_SECTIONS.map(renderSection)];
  bookPages.replaceChildren(...pages);

  bookTabs.replaceChildren(
    ...MENU_SECTIONS.map((section, i) => {
      const tab = el("button", "book__tab", menuText(section.title));
      tab.type = "button";
      tab.addEventListener("click", () => goToPage(i + 1));
      return tab;
    })
  );

  goToPage(Math.min(currentPage, pages.length - 1), true);
}

// Страницы до текущей «перевёрнуты» влево, остальные лежат стопкой
function goToPage(index, instant) {
  const pages = [...bookPages.children];
  currentPage = Math.max(0, Math.min(index, pages.length - 1));

  pages.forEach((page, i) => {
    page.classList.toggle("no-anim", Boolean(instant));
    page.classList.toggle("is-turned", i < currentPage);
    page.style.zIndex = i < currentPage ? i : pages.length - i;
    page.setAttribute("aria-hidden", String(i !== currentPage));
  });

  [...bookTabs.children].forEach((tab, i) => {
    tab.setAttribute("aria-current", String(i + 1 === currentPage));
  });

  bookCounter.textContent = `${currentPage + 1} / ${pages.length}`;
  menuDialog.querySelector('[data-book="prev"]').disabled = currentPage === 0;
  menuDialog.querySelector('[data-book="next"]').disabled = currentPage === pages.length - 1;
}

menuDialog.querySelector('[data-book="prev"]').addEventListener("click", () => goToPage(currentPage - 1));
menuDialog.querySelector('[data-book="next"]').addEventListener("click", () => goToPage(currentPage + 1));

// Листание пальцем
let swipeStartX = null;

bookPages.addEventListener("pointerdown", (e) => { swipeStartX = e.clientX; });
bookPages.addEventListener("pointerup", (e) => {
  if (swipeStartX === null) return;
  const dx = e.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(dx) > 40) {
    goToPage(currentPage + (dx < 0 ? 1 : -1));
  } else {
    // Простое нажатие на страницу — следующая страница
    goToPage(currentPage + 1);
  }
});

/* --------------------------------------------------------------------------
   Окно
   -------------------------------------------------------------------------- */
function openMenu() {
  goToPage(0, true);
  menuDialog.showModal();
  document.body.classList.add("no-scroll");
}

function closeMenu() {
  menuDialog.close();
}

document.querySelectorAll("[data-open-menu]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    openMenu();
  });
});

menuDialog.querySelector("[data-close-menu]").addEventListener("click", closeMenu);

// Нажатие на затемнённый фон закрывает окно
menuDialog.addEventListener("click", (e) => {
  if (e.target === menuDialog) closeMenu();
});

menuDialog.addEventListener("close", () => {
  document.body.classList.remove("no-scroll");
});

menuDialog.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") goToPage(currentPage + 1);
  if (e.key === "ArrowLeft") goToPage(currentPage - 1);
});

// Смена языка — перерисовываем названия разделов и описания
document.addEventListener("sitelanguagechange", renderBook);

renderBook();
loadMenu();
