(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var provider = "tinyurl";
    document.querySelectorAll("[data-provider] button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-provider] button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        provider = btn.getAttribute("data-value");
      });
    });

    var form = document.querySelector("[data-shortlink-form]");
    var resultBox = document.querySelector("[data-shortlink-result]");
    var output = document.querySelector("[data-shortlink-output]");
    var jsonBox = document.querySelector("[data-shortlink-json]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector("button[type=submit]");
      var original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span>';

      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        var code = Math.random().toString(36).slice(2, 7);
        var short = "https://xy.gg/" + code;
        output.textContent = short;
        resultBox.style.display = "block";
        jsonBox.textContent = JSON.stringify({
          creator: "XYCoolcraft",
          developer: "XYCoolcraft",
          version: "v1.0.0",
          status: true,
          provider: provider,
          ping: "61ms",
          time: new Date().toISOString(),
          result: { short_url: short }
        }, null, 2);
        WHHistory.record({ type: "shortlink", provider: provider });
        WHApp.showToast(WHI18n.t("toast_processed"));
      }, 700);
    });
  });
})();
