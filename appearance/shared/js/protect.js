(function () {
  var isProd = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  if (!isProd) return;
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("keydown", function (e) {
    var blocked = e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "J", "C"].indexOf(e.key.toUpperCase()) !== -1) ||
      (e.ctrlKey && e.key.toUpperCase() === "U");
    if (blocked) e.preventDefault();
  });
})();
