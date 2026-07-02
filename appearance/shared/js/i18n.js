(function () {
  var SUPPORTED = ["id", "en", "es", "fr", "de", "pt", "ru", "ar", "hi", "ja", "ko", "zh"];
  var DEFAULT_LANG = "id";
  var CACHE = {};

  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + 400 * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function langFromPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var last = parts[parts.length - 1];
    if (SUPPORTED.indexOf(last) !== -1) return last;
    return null;
  }

  function currentLang() {
    return langFromPath() || localStorage.getItem("wh_lang") || getCookie("wh_lang") || DEFAULT_LANG;
  }

  function basePathWithoutLang() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length && SUPPORTED.indexOf(parts[parts.length - 1]) !== -1) parts.pop();
    return "/" + parts.join("/");
  }

  function fetchDict(lang) {
    if (CACHE[lang]) return Promise.resolve(CACHE[lang]);
    return fetch("/shared/i18n/" + lang + ".json")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (data) { CACHE[lang] = data; return data; });
  }

  function applyDict(dict) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (dict[key]) el.setAttribute("placeholder", dict[key]);
    });
    document.documentElement.setAttribute("lang", currentLang());
  }

  function setLang(lang, navigate) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    localStorage.setItem("wh_lang", lang);
    setCookie("wh_lang", lang);
    if (navigate) {
      window.location.pathname = basePathWithoutLang() + "/" + lang;
      return;
    }
    fetchDict(lang).then(applyDict);
    document.dispatchEvent(new CustomEvent("wh:lang-change", { detail: { lang: lang } }));
  }

  function init() {
    var lang = currentLang();
    fetchDict(lang).then(applyDict);
  }

  window.WHI18n = {
    SUPPORTED: SUPPORTED,
    currentLang: currentLang,
    setLang: setLang,
    init: init,
    t: function (key) { return (CACHE[currentLang()] || {})[key] || key; }
  };
})();
