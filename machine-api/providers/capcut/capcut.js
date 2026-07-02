const axios = require("axios");

function findKeyDeep(obj, targetKey) {
  if (!obj || typeof obj !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const result = findKeyDeep(obj[key], targetKey);
      if (result) return result;
    }
  }
  return null;
}

async function capcutDl(url) {
  const res = await axios.get(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9,id;q=0.8"
    },
    timeout: 30000
  });

  const finalUrl = (res.request && res.request.res && res.request.res.responseUrl) || "";
  if (!/\/template-detail\/\d/.test(finalUrl) && !url.includes("template-detail")) {
    throw new Error("Tautan CapCut tidak valid");
  }

  const match = res.data.match(/id="__MODERN_ROUTER_DATA__">(.*?)<\/script>/);
  if (!match) throw new Error("Gagal mengekstrak data halaman CapCut");

  const parsedRouter = JSON.parse(match[1]);
  const detail = findKeyDeep(parsedRouter, "templateDetail");
  if (!detail) throw new Error("Struktur data template CapCut tidak ditemukan");

  return {
    title: (detail.structuredData && detail.structuredData.name) || detail.title || "CapCut Template",
    author: (detail.author && detail.author.name) || "Unknown",
    duration: detail.templateDuration || 0,
    views: detail.playAmount || 0,
    likes: detail.likeAmount || 0,
    comments: detail.commentAmount || 0,
    thumbnail: detail.coverUrl || "",
    downloadUrl: detail.videoUrl || "",
    url: url
  };
}

module.exports = { name: "capcut-official", priority: 1, run: async ({ url }) => capcutDl(url) };
