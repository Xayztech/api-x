const axios = require("axios");

async function spowload(spotifyUrl) {
  const matchType = spotifyUrl.match(/(track|playlist)/i);
  const matchId = spotifyUrl.match(/([a-zA-Z0-9]{22})/);
  if (!matchType || !matchId) throw new Error("Tautan Spotify tidak valid");

  const type = matchType[0].toLowerCase();
  const id = matchId[0];
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

  const initResponse = await axios.get("https://spowload.cc/", { headers: { "User-Agent": ua }, timeout: 20000 });
  const rawCookies = initResponse.headers["set-cookie"];
  if (!rawCookies) throw new Error("Gagal mengambil cookie spowload");
  const cookieString = rawCookies.map((c) => c.split(";")[0]).join("; ");

  const tokenMatch = initResponse.data.match(/name="_token"\s+value="([^"]+)"/) || initResponse.data.match(/value="([^"]+)"\s+name="_token"/);
  const csrfTokenPlain = tokenMatch ? tokenMatch[1] : "";

  const targetPath = "/spotify/" + type + "-" + id;
  const detailPage = await axios.get("https://spowload.cc" + targetPath, { headers: { "User-Agent": ua, Cookie: cookieString }, timeout: 20000 });

  const scriptMatch = detailPage.data.match(/let\s+urldata\s*=\s*"([\s\S]*?)";/);
  if (!scriptMatch) throw new Error("Gagal mengekstrak metadata spowload");

  const cleanJsonString = scriptMatch[1].replace(/\\"/g, '"').replace(/\\\//g, "/");
  const meta = JSON.parse(cleanJsonString);

  let coverUrl = "";
  if (meta.type === "track") coverUrl = (meta.album && meta.album.images && meta.album.images[0] && meta.album.images[0].url) || "";
  else if (meta.type === "playlist") coverUrl = (meta.images && meta.images[0] && meta.images[0].url) || "";
  coverUrl = coverUrl.replace(/\\/g, "");

  const response = await axios.post(
    "https://spowload.cc/convert",
    { urls: spotifyUrl, cover: coverUrl },
    {
      headers: { "Content-Type": "application/json", "User-Agent": ua, Origin: "https://spowload.cc", Referer: "https://spowload.cc" + targetPath, Cookie: cookieString, "X-CSRF-TOKEN": csrfTokenPlain },
      timeout: 30000
    }
  );

  if (!response.data || response.data.error !== false) throw new Error((response.data && response.data.message) || "spowload gagal memproses");

  if (meta.type === "track") {
    const artists = (meta.artists && meta.artists.map((a) => a.name).join(", ")) || "Unknown Artist";
    return {
      title: meta.name,
      author: artists,
      album: (meta.album && meta.album.name) || "N/A",
      duration: meta.duration_ms ? Math.round(meta.duration_ms / 1000) : null,
      thumbnail: coverUrl,
      url: "https://open.spotify.com/track/" + meta.id,
      downloadUrl: response.data.url
    };
  }

  throw new Error("spowload: hanya mendukung single track saat ini");
}

module.exports = { name: "spowload", priority: 3, run: async ({ url }) => spowload(url) };
