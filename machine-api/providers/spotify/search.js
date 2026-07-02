const https = require("https");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://open.spotify.com/",
  Origin: "https://open.spotify.com/"
};

function request(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options || {}, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ statusCode: res.statusCode, body: body }));
    });
    req.on("error", reject);
    if (options && options.headers) Object.entries(options.headers).forEach(([k, v]) => req.setHeader(k, v));
    req.end();
  });
}

async function getToken() {
  const response = await request("https://open.spotify.com/embed/track/3HHqVJHqwgkxWhOQ4MhLB6", {
    method: "GET",
    headers: Object.assign({}, HEADERS, { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9" })
  });
  if (response.statusCode !== 200) return null;
  const match = response.body.match(/"accessToken":"(BQ[^"]+)"/);
  return match ? match[1] : null;
}

function formatTime(ms) {
  const min = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(0);
  return min + ":" + sec.padStart(2, "0");
}

async function search(query, limit) {
  const token = await getToken();
  if (!token) throw new Error("Failed to obtain Spotify token");

  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 10, 50));
  const payload = new URLSearchParams({ q: query, type: "track", limit: String(safeLimit), offset: "0" });

  const response = await request("https://api.spotify.com/v1/search?" + payload, {
    method: "GET",
    headers: Object.assign({}, HEADERS, { Authorization: "Bearer " + token })
  });

  if (response.statusCode !== 200) throw new Error("Spotify API error: " + response.statusCode);
  const data = JSON.parse(response.body);
  if (!data.tracks || !data.tracks.items) return [];

  return data.tracks.items.map((track) => ({
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album.name,
    duration: formatTime(track.duration_ms),
    releaseDate: track.album.release_date,
    imageUrl: track.album.images[0] ? track.album.images[0].url : null,
    trackUrl: "https://open.spotify.com/track/" + track.id
  }));
}

module.exports = {
  name: "spotify-web-search",
  priority: 1,
  run: async ({ query, limit }) => search(query, limit)
};
