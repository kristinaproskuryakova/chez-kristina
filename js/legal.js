/* Юридические страницы: если посетитель сам переключил язык ссылкой
   «English» / «Français», запоминаем его выбор для главной страницы.
   Простой заход на страницу язык сайта не меняет. */
document.querySelectorAll(".legal__lang").forEach((link) => {
  link.addEventListener("click", () => {
    try {
      localStorage.setItem("chez-kristina-lang", link.hreflang);
    } catch (e) {
      // хранилище недоступно — главная откроется на языке по умолчанию
    }
  });
});
