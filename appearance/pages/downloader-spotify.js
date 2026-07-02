document.addEventListener("DOMContentLoaded", function () {
  WHDownloader.init({
    platform: "spotify",
    searchEndpoint: "/api/spotify/search",
    downloadEndpoint: "/api/spotify/download",
    linkTest: /open\.spotify\.com/i
  });
});
