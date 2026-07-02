document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "facebook",
    searchEndpoint: "/api/facebook/download",
    downloadEndpoint: "/api/facebook/download",
    linkTest: /facebook\.com|fb\.watch/i
  });
});
