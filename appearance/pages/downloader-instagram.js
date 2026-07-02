document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "instagram",
    searchEndpoint: "/api/instagram/download",
    downloadEndpoint: "/api/instagram/download",
    linkTest: /instagram\.com/i
  });
});
