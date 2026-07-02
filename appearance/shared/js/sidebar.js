(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var hamburger = document.querySelector("[data-hamburger]");
    var sidebar = document.querySelector("[data-sidebar]");
    var scrim = document.querySelector("[data-scrim]");

    function setOpen(open) {
      hamburger && hamburger.classList.toggle("is-open", open);
      sidebar && sidebar.classList.toggle("is-open", open);
      scrim && scrim.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    }

    hamburger && hamburger.addEventListener("click", function () {
      setOpen(!sidebar.classList.contains("is-open"));
    });
    scrim && scrim.addEventListener("click", function () { setOpen(false); });

    document.querySelectorAll("[data-sidebar] .sidebar-link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth < 900) setOpen(false);
      });
    });

    var path = window.location.pathname;
    document.querySelectorAll("[data-sidebar] .sidebar-link").forEach(function (link) {
      var base = link.getAttribute("data-match");
      if (base && path.indexOf(base) === 0) link.classList.add("active");
    });
  });
})();
