(function () {
  var COOKIE_DAYS = 400;

  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(mode) {
    var resolved = mode === "system" ? (systemPrefersDark() ? "night" : "light") : mode;
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function getMode() {
    return localStorage.getItem("wh_theme") || getCookie("wh_theme") || "system";
  }

  function setMode(mode) {
    localStorage.setItem("wh_theme", mode);
    setCookie("wh_theme", mode);
    applyTheme(mode);
    document.dispatchEvent(new CustomEvent("wh:theme-change", { detail: { mode: mode } }));
  }

  applyTheme(getMode());

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (getMode() === "system") applyTheme("system");
  });

  window.WHTheme = { getMode: getMode, setMode: setMode };
})();
