const axios = require("axios");

function randomChar(chars, range) {
  let out = "";
  for (let i = 0; i < range; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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

async function download(link) {
  const resolved = await resolve(link);
  const match = resolved.match(/\/(video|photo)\/(\d+)/);
  if (!match) throw new Error("Unable to resolve TikTok video id");

  const { data } = await axios("https://api16-normal-useast5.tiktokv.us/aweme/v1/feed/?" + makeQs(match[2]), {
    method: "OPTIONS",
    timeout: 30000,
    headers: { "User-Agent": "com.zhiliaoapp.musically/300904 (2018111632; U; Android 11; en_US; V2039; Build/QQ3A.200805.001; Cronet/58.0.2991.0)" }
  });

  const item = data && data.aweme_list && data.aweme_list[0];
  if (!item) throw new Error("Empty aweme data");

  const isVideo = !!item.video;
  const stats = item.statistics || {};
  const author = item.author || {};
  const music = item.music || {};

  return {
    id: item.aweme_id,
    title: item.desc || "",
    region: item.region || null,
    isVideo: isVideo,
    duration: isVideo ? Math.floor(item.video.duration / 1000) + "s" : null,
    stats: { likes: stats.digg_count || 0, views: stats.play_count || 0, shares: stats.share_count || 0, comments: stats.comment_count || 0 },
    media: isVideo
      ? [{ type: "nowatermark", url: item.video.play_addr && item.video.play_addr.url_list && item.video.play_addr.url_list[0] }]
      : (item.image_post_info ? item.image_post_info.images.map((img) => ({ type: "photo", url: img.display_image.url_list[0] })) : []),
    author: {
      avatar: author.avatar_thumb && author.avatar_thumb.url_list ? author.avatar_thumb.url_list[0] : null,
      nickname: author.nickname || "",
      username: author.unique_id || ""
    },
    music: {
      title: music.title || "",
      author: music.author || "",
      url: music.play_url && music.play_url.url_list ? music.play_url.url_list[0] : null
    }
  };
}

module.exports = {
  name: "tiktok-native",
  priority: 2,
  run: async ({ url }) => download(url)
};
