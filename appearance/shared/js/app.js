(function () {
  var LANG_NAMES = {
    id: "Bahasa Indonesia", en: "English", es: "Español", fr: "Français",
    de: "Deutsch", pt: "Português", ru: "Русский", ar: "العربية",
    hi: "हिन्दी", ja: "日本語", ko: "한국어", zh: "中文"
  };

  var THEME_OPTIONS = [
    { value: "light", label: "Light", emoji: "☀️" },
    { value: "night", label: "Night", emoji: "🌙" },
    { value: "system", label: "Follow the System", emoji: "🖥️" }
  ];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function showToast(message) {
    var toast = document.querySelector("[data-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("data-toast", "");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { showToast(WHI18n.t("toast_copied")); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(WHI18n.t("toast_copied"));
    }
  }

  function renderThemeMenu(panel) {
    var mode = WHTheme.getMode();
    panel.innerHTML = "";
    THEME_OPTIONS.forEach(function (opt) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "dropdown-option" + (mode === opt.value ? " selected" : "");
      el.innerHTML = '<span><span class="emoji">' + opt.emoji + "</span> " + opt.label + "</span>" + (mode === opt.value ? "<span>✓</span>" : "");
      el.addEventListener("click", function () {
        WHTheme.setMode(opt.value);
        renderThemeMenu(panel);
        WHDropdown.closeAll(null);
      });
      panel.appendChild(el);
    });
  }

  function renderLangMenu(panel) {
    var current = WHI18n.currentLang();
    panel.innerHTML = "";
    WHI18n.SUPPORTED.forEach(function (code) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "dropdown-option" + (current === code ? " selected" : "");
      el.innerHTML = "<span>" + LANG_NAMES[code] + '</span><span class="dropdown-option-sub">' + code.toUpperCase() + "</span>";
      el.addEventListener("click", function () {
        WHI18n.setLang(code, true);
      });
      panel.appendChild(el);
    });
  }

  ready(function () {
    WHI18n.init();

    var themePanel = document.querySelector("[data-theme-panel]");
    if (themePanel) renderThemeMenu(themePanel);

    var langPanel = document.querySelector("[data-lang-panel]");
    if (langPanel) renderLangMenu(langPanel);

    document.querySelectorAll("[data-copy]").forEach(function (el) {
      el.addEventListener("click", function () {
        var target = el.getAttribute("data-copy");
        var source = target ? document.querySelector(target) : el;
        var text = source ? (source.value || source.textContent) : "";
        copyText(text.trim());
      });
    });

    document.querySelectorAll("[data-hamburger-home]").forEach(function (el) {
      el.addEventListener("click", function () {
        window.location.pathname = "/home/" + WHI18n.currentLang();
      });
    });
  });

  window.WHApp = { showToast: showToast, copyText: copyText };
})();
