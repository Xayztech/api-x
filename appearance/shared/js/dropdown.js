(function () {
  function closeAll(except) {
    document.querySelectorAll(".dropdown.is-open").forEach(function (el) {
      if (el !== except) el.classList.remove("is-open");
    });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".dropdown-trigger");
    if (trigger) {
      var dropdown = trigger.closest(".dropdown");
      var willOpen = !dropdown.classList.contains("is-open");
      closeAll(dropdown);
      dropdown.classList.toggle("is-open", willOpen);
      return;
    }
    if (!e.target.closest(".dropdown-panel")) closeAll(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll(null);
  });

  window.WHDropdown = { closeAll: closeAll };
})();
