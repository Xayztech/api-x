const axios = require("axios");

function randomChar(chars, range) {
  let s = "";
  for (let i = 0; i < range; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function generateDeviceId() {
  return "7" + randomChar("0123456789", 18);
}

async function resolve(u) {
  if (!u.includes("vt.tiktok.com")) return u;
  const r = await axios.get(u, { maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400, timeout: 20000 });
  return r.headers.location || u;
}

function makeQs(id) {
  return new URLSearchParams({
    aweme_id: id,
    version_name: "1.1.9",
    version_code: "2018111632",
    device_id: generateDeviceId(),
    iid: generateDeviceId(),
    manifest_version_code: "2018111632",
    update_version_code: "2018111632",
    openudid: randomChar("0123456789abcdef", 16),
    uuid: randomChar("1234567890", 16),
    _rticket: Date.now() * 1000,
    ts: Date.now(),
    device_brand: "Vivo",
    device_type: "V2039",
    device_platform: "android",
    resolution: "1080*1920",
    dpi: 460,
    os_version: "11",
    sys_region: "US",
    region: "ID",
    timezone_name: "Asia/Makassar"
  }).toString();
}

async function tiktokNative2(url) {
  const resolved = await resolve(url);
  const match = resolved.match(/\/(video|photo)\/(\d+)/);
  if (!match) throw new Error("Tidak dapat mengekstrak ID TikTok");

  const { data } = await axios("https://api16-normal-useast5.tiktokv.us/aweme/v1/feed/?" + makeQs(match[2]), {
    method: "OPTIONS",
    headers: { "User-Agent": "com.zhiliaoapp.musically/300904 (2018111632; U; Android 11; en_US; V2039; Build/QQ3A.200805.001; Cronet/58.0.2991.0)" },
    timeout: 20000
  });

  const item = data && data.aweme_list && data.aweme_list[0];
  if (!item) throw new Error("Data TikTok kosong");

  const isVideo = !!item.video;
  const stats = item.statistics || {};
  const author = item.author || {};

  return {
    title: item.desc || "",
    author: author.nickname || author.unique_id || "-",
    region: item.region || null,
    duration: item.video && item.video.duration ? Math.floor(item.video.duration / 1000) + "s" : null,
    views: stats.play_count || 0,
    likes: stats.digg_count || 0,
    comments: stats.comment_count || 0,
    thumbnail: (author.avatar_thumb && author.avatar_thumb.url_list && author.avatar_thumb.url_list[0]) || null,
    downloadUrl: isVideo ? (item.video.play_addr && item.video.play_addr.url_list && item.video.play_addr.url_list[0]) : null,
    url: url
  };
}

module.exports = { name: "tiktok-native2", priority: 3, run: async ({ url }) => tiktokNative2(url) };
