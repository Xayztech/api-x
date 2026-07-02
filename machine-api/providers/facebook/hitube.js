const axios = require("axios");
const NodeRSA = require("node-rsa");

const API_HOST = "https://api.hitube.io";
const FB_DOWNLOAD_PATH = "/st-tik-video/fb/dl2";
const RSA_PUB = "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CP\nCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/\n7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e\n2SuC+4EuVkaqzN08LQIDAQAB\n-----END PUBLIC KEY-----";

function generateSessionID(ts) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return "common_" + s + "_" + ts;
}

function resolveUrl(raw) {
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : API_HOST + "/st-tik/token/" + raw;
}

function detectFbUrlType(url) {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.includes("/reel/") || u.includes("/reels/") || u.includes("fb.watch") || u.includes("/share/r/")) return "reels";
  if (u.includes("/videos/") || u.includes("/video/") || u.includes("/watch") || u.includes("/share/v/")) return "video";
  if (u.includes("/photos/") || u.includes("/photo/") || u.includes("/share/p/")) return "photo";
  if (u.includes("/stories/") || u.includes("/share/s/")) return "story";
  return "unknown";
}

async function fbdl(url) {
  const urlType = detectFbUrlType(url);
  const ts = Date.now();
  const key = new NodeRSA();
  key.importKey(RSA_PUB, "public");
  key.setOptions({ encryptionScheme: "pkcs1" });
  const encrypted = key.encrypt(ts.toString(), "base64");
  const sessionid = generateSessionID(ts);

  const res = await axios.get(API_HOST + FB_DOWNLOAD_PATH, {
    params: { url: url, sessionid: sessionid },
    headers: {
      "X-Secure-Message": encrypted,
      Referer: "https://www.fvidgo.com/",
      Origin: "https://www.fvidgo.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
    },
    timeout: 30000
  });

  const data = res.data;
  if (data.code !== 200) throw new Error(data.msg || "Facebook provider gagal");
  if (!data.result || !data.result.fbBos || !data.result.fbBos.length) throw new Error("Tidak ada hasil dari Facebook");

  const bo = data.result.fbBos[0];
  const videos = [];
  const audios = [];
  if (bo.multiResolutions && bo.multiResolutions.length) {
    bo.multiResolutions.forEach((r) => {
      if (!r.url) return;
      const label = r.label || r.tag || r.quality || "";
      const item = { url: resolveUrl(r.url), label: label || "MP3" };
      if (label) videos.push(item); else audios.push(item);
    });
  }

  return {
    title: bo.desc || "Facebook " + urlType,
    author: bo.author || "-",
    duration: bo.duration || null,
    thumbnail: resolveUrl(bo.cover || bo.thumb),
    url: url,
    downloadUrl: videos.length ? videos[0].url : (audios.length ? audios[0].url : resolveUrl(bo.url)),
    formats: { video: videos, audio: audios },
    urlType: urlType
  };
}

module.exports = { name: "hitube", priority: 1, run: async ({ url }) => fbdl(url) };
