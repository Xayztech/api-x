document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "capcut",
    searchEndpoint: "/api/capcut/download",
    downloadEndpoint: "/api/capcut/download",
    linkTest: /capcut\.com/i
  });
});
