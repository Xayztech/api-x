document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "twitter",
    searchEndpoint: "/api/twitter/download",
    downloadEndpoint: "/api/twitter/download",
    linkTest: /twitter\.com|x\.com/i
  });
});
