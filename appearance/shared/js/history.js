(function () {
  var MAX_ENTRIES = 60;
  var STORE_KEY = "wh_history";
  var COOKIE_DAYS = 400;

  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    try {
      document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
    } catch (e) {}
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function readAll() {
    var raw = localStorage.getItem(STORE_KEY) || getCookie(STORE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function persist(list) {
    var raw = JSON.stringify(list.slice(0, MAX_ENTRIES));
    localStorage.setItem(STORE_KEY, raw);
    setCookie(STORE_KEY, raw);
  }

  function record(entry) {
    var list = readAll();
    list.unshift(Object.assign({ ts: Date.now() }, entry));
    persist(list);
    return list;
  }

  function clear() {
    localStorage.removeItem(STORE_KEY);
    setCookie(STORE_KEY, "");
  }

  function saveDraft(key, value) {
    localStorage.setItem("wh_draft_" + key, JSON.stringify(value));
  }

  function loadDraft(key) {
    var raw = localStorage.getItem("wh_draft_" + key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  window.WHHistory = {
    record: record,
    readAll: readAll,
    clear: clear,
    saveDraft: saveDraft,
    loadDraft: loadDraft
  };
})();
