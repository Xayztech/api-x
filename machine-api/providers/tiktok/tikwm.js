const axios = require("axios");
const qs = require("qs");

const BASE = "https://www.tikwm.com";
const API = BASE + "/api/";
const HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  Origin: BASE,
  Referer: BASE + "/",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
};

async function post(endpoint, body) {
  const r = await axios.post(API + endpoint, qs.stringify(body), { headers: HEADERS, timeout: 45000 });
  if (r.data.code !== 0) throw new Error(r.data.msg || "tikwm API error");
  return r.data.data;
}

function url(u) {
  if (!u) return null;
  return u.startsWith("http") ? u : BASE + u;
}

function parseItem(item) {
  if (!item) return null;
  const media = [];
  if ((!item.size || item.size === 0) && Array.isArray(item.images) && item.images.length > 0) {
    item.images.forEach((v) => media.push({ type: "photo", url: url(v) }));
  } else {
    if (item.wmplay) media.push({ type: "watermark", url: url(item.wmplay) });
    if (item.play) media.push({ type: "nowatermark", url: url(item.play) });
    if (item.hdplay) media.push({ type: "nowatermark_hd", url: url(item.hdplay) });
  }
  return {
    id: item.id || item.video_id,
    title: item.title || "",
    duration: (item.duration || 0) + "s",
    cover: url(item.cover),
    region: item.region || null,
    media: media,
    music: item.music_info ? { title: item.music_info.title, author: item.music_info.author, url: url(item.music_info.play) } : null,
    stats: { views: item.play_count || 0, likes: item.digg_count || 0, comments: item.comment_count || 0, shares: item.share_count || 0 },
    author: item.author ? { username: item.author.unique_id, nickname: item.author.nickname, avatar: url(item.author.avatar) } : null
  };
}

async function download(link) {
  const raw = await post("", { url: link, count: 12, cursor: 0, web: 1, hd: 1 });
  const parsed = parseItem(raw);
  if (!parsed) throw new Error("Unable to parse TikTok media");
  return parsed;
}

async function search(keywords, count) {
  const raw = await post("feed/search", { keywords: keywords, count: count || 12, cursor: 0, web: 1, hd: 1 });
  const items = raw.videos || [];
  return items.map(parseItem).filter(Boolean);
}

module.exports = {
  name: "tikwm",
  priority: 1,
  runDownload: async ({ url }) => download(url),
  runSearch: async ({ query }) => search(query),
  run: async (args) => (args.query ? search(args.query) : download(args.url))
};
