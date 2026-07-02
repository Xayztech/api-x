const axios = require("axios");

const AUTH = "20250901majwlqo";
const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Origin: "https://vidssave.com",
  Referer: "https://vidssave.com/"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processResource(resItem) {
  if (resItem.download_url) {
    return { quality: resItem.quality || "Default", type: resItem.type, format: resItem.format, size: resItem.size, url: resItem.download_url };
  }
  if (!resItem.resource_content) return null;

  const downloadBody = new URLSearchParams({
    auth: AUTH,
    domain: "api-ak.vidssave.com",
    request: resItem.resource_content,
    no_encrypt: "1"
  }).toString();

  const taskRes = await axios.post("https://api.vidssave.com/api/contentsite_api/media/download", downloadBody, { headers: HEADERS, timeout: 20000 });
  if (!taskRes.data.data || !taskRes.data.data.task_id) return null;
  const taskId = taskRes.data.data.task_id;

  let finalUrl = null;
  for (let attempts = 0; attempts < 15 && !finalUrl; attempts++) {
    const queryRes = await axios.get("https://api.vidssave.com/sse/contentsite_api/media/download_query", {
      params: { auth: AUTH, domain: "api-ak.vidssave.com", task_id: taskId, download_domain: "vidssave.com", origin: "content_site" },
      timeout: 20000
    });

    if (String(queryRes.data).includes('"status":"success"')) {
      const match = String(queryRes.data).match(/"download_link":"(.*?)"/);
      if (match) { finalUrl = match[1].replace(/\\/g, ""); break; }
    } else if (String(queryRes.data).includes('"status":"failed"')) {
      break;
    }
    await sleep(1500);
  }

  return finalUrl ? { quality: resItem.quality || "Default", type: resItem.type, format: resItem.format, size: resItem.size, url: finalUrl } : null;
}

async function vidssave(link) {
  const parseBody = new URLSearchParams({ auth: AUTH, domain: "api-ak.vidssave.com", origin: "source", link: link }).toString();
  const parseRes = await axios.post("https://api.vidssave.com/api/contentsite_api/media/parse", parseBody, { headers: HEADERS, timeout: 20000 });

  const videoData = parseRes.data.data;
  if (!videoData || !videoData.resources) throw new Error("vidssave: tidak ada resource ditemukan");

  const resultsRaw = await Promise.all(videoData.resources.map((r) => processResource(r).catch(() => null)));
  const downloadResults = resultsRaw.filter((item) => item !== null);
  if (!downloadResults.length) throw new Error("vidssave: gagal mengambil tautan unduhan");

  return {
    title: videoData.title || "-",
    thumbnail: videoData.thumbnail,
    duration: videoData.duration || null,
    url: link,
    downloadUrl: downloadResults[0].url,
    formats: { all: downloadResults }
  };
}

module.exports = { name: "vidssave", priority: 3, run: async ({ url }) => vidssave(url) };
