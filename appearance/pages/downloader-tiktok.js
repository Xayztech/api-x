document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "tiktok",
    searchEndpoint: "/api/tiktok/search",
    downloadEndpoint: "/api/tiktok/download",
    linkTest: /tiktok\.com/i
  });
});
