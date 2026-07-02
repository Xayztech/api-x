const axios = require("axios");

function normalizeQuality(format) {
  if (!format) return "720";
  const f = String(format).toLowerCase();
  if (["144", "240", "360", "720", "1080"].includes(f)) return f;
  if (["mp3", "audio", "64", "128", "192", "320"].includes(f)) {
    return ["128", "256", "320"].includes(f) ? f : "128";
  }
  return "720";
}

async function y2mate(input, format) {
  let targetLink = input.trim();
  const cleanQuality = normalizeQuality(format);

  if (!/^https?:\/\//i.test(targetLink)) {
    const searchPayload = new URLSearchParams();
    searchPayload.append("search_query", targetLink);
    const searchRes = await axios.post("https://search.nnmn.store/", searchPayload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Origin: "https://v22.www-y2mate.com",
        Referer: "https://v22.www-y2mate.com/"
      },
      timeout: 20000
    });
    if (!searchRes.data || !searchRes.data.items || !searchRes.data.items.length) throw new Error("Video tidak ditemukan");
    targetLink = "https://youtu.be/" + searchRes.data.items[0].id;
  } else {
    const matchId = targetLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]+)/);
    if (matchId) targetLink = "https://youtu.be/" + matchId[1];
  }

  const metaRes = await axios.get("https://www.youtube.com/oembed", {
    params: { url: targetLink, format: "json" },
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", Referer: "https://frame.y2meta-uk.com/" },
    timeout: 20000
  });
  const meta = metaRes.data;

  const keyRes = await axios.get("https://cnv.cx/v2/sanity/key", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", Referer: "https://frame.y2meta-uk.com/", Origin: "https://frame.y2meta-uk.com" },
    timeout: 20000
  });
  const key = keyRes.data.key;

  let outFormat = "mp3";
  let audioBitrate = "128";
  let videoQuality = "720";
  const mp4Qualities = ["144", "240", "360", "720", "1080"];
  const mp3Qualities = ["128", "256", "320"];

  if (mp4Qualities.includes(cleanQuality)) {
    outFormat = "mp4";
    videoQuality = cleanQuality;
  } else if (mp3Qualities.includes(cleanQuality)) {
    outFormat = "mp3";
    audioBitrate = cleanQuality;
  }

  const body = new URLSearchParams({
    link: targetLink,
    format: outFormat,
    audioBitrate: audioBitrate,
    videoQuality: videoQuality,
    filenameStyle: "pretty",
    vCodec: "h264"
  });

  const convRes = await axios.post("https://cnv.cx/v2/converter", body.toString(), {
    headers: { Key: key, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", Origin: "https://frame.y2meta-uk.com", Referer: "https://frame.y2meta-uk.com/" },
    timeout: 30000
  });
  const conv = convRes.data;
  if (!conv || !conv.url) throw new Error("y2mate: gagal mendapat tautan unduhan");

  return {
    title: meta.title,
    author: meta.author_name,
    type: outFormat,
    format: outFormat,
    quality: outFormat === "mp3" ? audioBitrate + "kbps" : videoQuality + "p",
    thumbnail: meta.thumbnail_url,
    duration: null,
    downloadUrl: conv.url,
    filename: conv.filename,
    sourceUrl: targetLink
  };
}

module.exports = { name: "y2mate", priority: 1, run: async ({ url, format }) => y2mate(url, format) };
