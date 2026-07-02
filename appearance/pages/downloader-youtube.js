document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "youtube",
    searchEndpoint: "/api/yt/search",
    downloadEndpoint: "/api/yt/download",
    linkTest: /youtu\.?be/i
  });
});
