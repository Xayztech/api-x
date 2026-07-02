const axios = require("axios");

const PROXY = "https://cors.siputzx.my.id";

async function downloadGram(url) {
  const payload = new URLSearchParams({ url: url, v: "3", lang: "en" }).toString();
  const { data } = await axios.post(PROXY + "/https://api.downloadgram.org/media", payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Origin: "https://downloadgram.org",
      Referer: "https://downloadgram.org/",
      Accept: "*/*"
    },
    timeout: 30000
  });

  if (!data || typeof data !== "string") throw new Error("Server Instagram tidak mengembalikan respons valid");

  const cleanHtml = data.replace(/\\x20/g, " ").replace(/\\x22/g, '"').replace(/\\/g, "");
  const regexCdn = /href="(https:\/\/cdn\.downloadgram\.org\/[^"\s>]+)"/gi;
  const urls = [];
  let match;
  while ((match = regexCdn.exec(cleanHtml)) !== null) urls.push(match[1]);
  const uniqueUrls = Array.from(new Set(urls));

  if (!uniqueUrls.length) throw new Error("Tidak ditemukan tautan unduhan Instagram");

  return {
    title: "Instagram media",
    author: "-",
    url: url,
    downloadUrl: uniqueUrls[0],
    formats: { all: uniqueUrls }
  };
}

module.exports = { name: "downloadgram", priority: 1, run: async ({ url }) => downloadGram(url) };
