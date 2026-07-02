const axios = require("axios");

const API = {
  meta: "https://spotify.dlapi.app/api/Gettrack",
  convert: "https://master.dlapi.app/api/v1/convert",
  task: "https://master.dlapi.app/api/v1/tasks"
};

const client = axios.create({
  timeout: 60000,
  headers: {
    Authorization: "Bearer pGLXoCsVu0hcstAecIDwlrlbcrUzv0e1cWBJ0yuB",
    "Content-Type": "application/json",
    "User-Agent": "Spotmate/1.0"
  }
});

function isValidSpotifyUrl(url) {
  return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/.test(url);
}

async function meta(url) {
  const { data } = await client.get(API.meta, { params: { spotify_url: url } });
  if (!data) throw new Error("Empty metadata response");
  return data;
}

async function convert(url, format) {
  const { data: init } = await client.post(API.convert, { url: url, format: format || "mp3" });
  if (init && init.download_url) return init.download_url;

  const taskId = init && (init.task_id || init.id);
  if (!taskId) throw new Error("No task id received");

  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data: status } = await client.get(API.task + "/" + taskId);
    if (status && (status.status === "finished" || status.status === "completed")) {
      return (status.result && status.result.download_url) || status.download_url;
    }
    if (status && status.status === "failed") throw new Error("Server-side processing failed");
  }
  throw new Error("Conversion task timed out");
}

async function download(url, format) {
  if (!isValidSpotifyUrl(url)) throw new Error("Invalid Spotify url");
  const data = await meta(url);
  const targetUrl = (data.external_urls && data.external_urls.spotify) || url;
  const downloadUrl = await convert(targetUrl, format);
  return {
    title: data.name,
    artist: data.artists ? data.artists.map((a) => a.name).join(", ") : null,
    album: data.album ? data.album.name : null,
    duration: data.duration_ms,
    thumbnail: data.album && data.album.images && data.album.images[0] ? data.album.images[0].url : null,
    downloadUrl: downloadUrl
  };
}

module.exports = {
  name: "dlapi",
  priority: 2,
  run: async ({ url, format }) => download(url, format)
};
