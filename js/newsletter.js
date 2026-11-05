/* ==========================================================================
   Рассылка: окно подписки, проверка e-mail и галочек, сообщение «спасибо»
   ========================================================================== */
const nlDialog = document.getElementById("newsletter-dialog");
const nlForm = nlDialog.querySelector(".nl-form");
const nlEmail = nlForm.querySelector("#newsletter-email");
const nlEmailError = nlForm.querySelector("#newsletter-email-error");
const nlCheckError = nlForm.querySelector("#newsletter-check-error");
const nlChecks = [...nlForm.querySelectorAll('input[type="checkbox"]')];
const nlDone = nlDialog.querySelector(".nl-done");

// Почтовые домены, в которых чаще всего ошибаются при наборе
const KNOWN_DOMAINS = [
  "gmail.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr",
  "yahoo.com", "yahoo.fr", "icloud.com", "orange.fr", "free.fr",
  "sfr.fr", "laposte.net", "wanadoo.fr", "live.fr", "me.com"
];

// Адрес вида имя@домен.зона: без пробелов, одна @, в домене есть точка
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

let ignoredSuggestion = null;

function nlText(key) {
  const dict = translations[document.documentElement.lang] || translations.fr;
  return dict[key] || key;
}

// Сколько букв нужно поменять, чтобы из одного слова получить другое
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// Похоже на опечатку в известном домене (gmial.com, gmail.con, gmail) — предлагаем исправление
function suggestDomain(email) {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || KNOWN_DOMAINS.includes(domain)) return null;

  let best = null;
  let bestDistance = 3;
  KNOWN_DOMAINS.forEach((known) => {
    const name = known.split(".")[0];
    const d = domain.includes(".") ? distance(domain, known) : distance(domain, name);
    if (d < bestDistance) {
      bestDistance = d;
      best = known;
    }
  });
  return best ? email.slice(0, at + 1) + best : null;
}

function showEmailError(message, suggestion) {
  nlEmailError.textContent = message || "";
  nlEmail.setAttribute("aria-invalid", String(Boolean(message || suggestion)));

  if (suggestion) {
    const fix = document.createElement("button");
    fix.type = "button";
    fix.className = "nl-form__suggest";
    fix.textContent = `${nlText("newsletter.didYouMean")} ${suggestion} ?`;
    fix.addEventListener("click", () => {
      nlEmail.value = suggestion;
      showEmailError("");
      nlEmail.focus();
    });
    nlEmailError.append(fix);
  }
}

function validateEmail() {
  const value = nlEmail.value.trim();
  nlEmail.value = value;

  if (!value) {
    showEmailError(nlText("newsletter.errEmpty"));
    return false;
  }

  const suggestion = suggestDomain(value);

  if (!EMAIL_PATTERN.test(value)) {
    showEmailError(nlText("newsletter.errInvalid"), suggestion);
    return false;
  }

  // Адрес по форме верный, но домен похож на опечатку: подсказываем один раз.
  // Если гость отправит тот же адрес ещё раз — значит, домен настоящий, пропускаем.
  if (suggestion && ignoredSuggestion !== value) {
    ignoredSuggestion = value;
    showEmailError("", suggestion);
    return false;
  }

  showEmailError("");
  return true;
}

function validateChecks() {
  const ok = nlChecks.every((box) => box.checked);
  nlCheckError.textContent = ok ? "" : nlText("newsletter.errChecks");
  nlChecks.forEach((box) => box.setAttribute("aria-invalid", String(!box.checked && !ok)));
  return ok;
}

nlForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const emailOk = validateEmail();
  const checksOk = validateChecks();

  if (!emailOk) {
    nlEmail.focus();
    return;
  }
  if (!checksOk) return;

  // TODO: здесь отправить адрес в сервис рассылок (например, Brevo) — пока никуда не уходит
  nlForm.hidden = true;
  nlDone.hidden = false;
});

// Ошибка исчезает, как только гость начинает исправлять
nlEmail.addEventListener("input", () => {
  if (nlEmailError.textContent) showEmailError("");
});
nlChecks.forEach((box) => box.addEventListener("change", () => {
  if (nlCheckError.textContent) validateChecks();
}));

/* --------------------------------------------------------------------------
   Открыть / закрыть окно
   -------------------------------------------------------------------------- */
function resetNewsletter() {
  nlForm.reset();
  nlForm.hidden = false;
  nlDone.hidden = true;
  ignoredSuggestion = null;
  showEmailError("");
  nlEmail.removeAttribute("aria-invalid");
  nlCheckError.textContent = "";
  nlChecks.forEach((box) => box.removeAttribute("aria-invalid"));
}

document.querySelectorAll(".newsletter__open").forEach((button) => {
  button.addEventListener("click", () => {
    resetNewsletter();
    nlDialog.showModal();
    document.body.classList.add("no-scroll");
    nlEmail.focus();
  });
});

nlDialog.querySelector("[data-close-newsletter]").addEventListener("click", () => nlDialog.close());

// Нажатие на затемнённый фон закрывает окно
nlDialog.addEventListener("click", (e) => {
  if (e.target === nlDialog) nlDialog.close();
});

nlDialog.addEventListener("close", () => {
  document.body.classList.remove("no-scroll");
});

// При смене языка убираем старые сообщения об ошибках — они были на другом языке
document.addEventListener("sitelanguagechange", () => {
  showEmailError("");
  nlCheckError.textContent = "";
});
