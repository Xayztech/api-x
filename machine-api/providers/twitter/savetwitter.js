const axios = require("axios");
const cheerio = require("cheerio");

async function savetwitter(url) {
  const payload = new URLSearchParams({ q: url, lang: "id", cftoken: "" });
  const response = await axios.post("https://savetwitter.net/api/ajaxSearch", payload.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Referer: "https://savetwitter.net/id3"
    },
    timeout: 30000
  });

  if (!response.data || !response.data.data) throw new Error("Gagal mengambil data dari Twitter/X");

  const $ = cheerio.load(response.data.data);
  const videos = [];
  let image = null;

  $(".tw-button-dl").each((i, el) => {
    const text = $(el).text();
    const href = $(el).attr("href");
    if (!href || !href.startsWith("http")) return;
    if (text.includes("MP4")) {
      const match = text.match(/\((\d+)p\)/);
      const quality = match ? parseInt(match[1], 10) : 0;
      videos.push({ quality: quality, url: href });
    }
  });

  $(".download-items__btn a").each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("http")) image = href;
  });

  videos.sort((a, b) => b.quality - a.quality);

  return {
    title: "Twitter / X post",
    author: "-",
    thumbnail: image,
    url: url,
    downloadUrl: videos.length ? videos[0].url : image,
    formats: { video: videos },
    type: videos.length ? "video" : (image ? "image" : "unknown")
  };
}

module.exports = { name: "savetwitter", priority: 1, run: async ({ url }) => savetwitter(url) };
