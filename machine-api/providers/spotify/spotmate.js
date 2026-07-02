const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

async function spotmate(url) {
  if (!url.includes("open.spotify.com")) throw new Error("Invalid Spotify url");

  const ip = [10, crypto.randomInt(256), crypto.randomInt(256), crypto.randomInt(256)].join(".");
  const inst = axios.create({
    baseURL: "https://spotmate.online",
    timeout: 60000,
    headers: {
      origin: "https://spotmate.online",
      referer: "https://spotmate.online/en1",
      "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      "x-forwarded-for": ip,
      "x-real-ip": ip
    }
  });

  inst.interceptors.response.use((res) => {
    const cookies = res.headers["set-cookie"];
    if (cookies && cookies.length) inst.defaults.headers.common.cookie = cookies.map((c) => c.split(";")[0]).join("; ");
    return res;
  });

  const { data: html } = await inst.get("/");
  const $ = cheerio.load(html);
  const csrf = $('meta[name="csrf-token"]').attr("content");
  if (!csrf) throw new Error("CSRF token not found");
  inst.defaults.headers.common["x-csrf-token"] = csrf;

  const [{ data: meta }, { data: audio }] = await Promise.all([
    inst.post("/getTrackData", { spotify_url: url }),
    inst.post("/convert", { urls: url })
  ]);

  return {
    title: meta && meta.title,
    artist: meta && meta.artist,
    album: meta && meta.album,
    thumbnail: meta && (meta.image || meta.cover),
    duration: meta && meta.duration,
    downloadUrl: audio && audio.url
  };
}

module.exports = {
  name: "spotmate",
  priority: 1,
  run: async ({ url }) => spotmate(url)
};
