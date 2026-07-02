const axios = require("axios");
const crypto = require("crypto");

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info",
    download: "/download"
  },
  headers: {
    accept: "*/*",
    "content-type": "application/json",
    origin: "https://yt.savetube.me",
    referer: "https://yt.savetube.me/",
    "user-agent": "Postify/1.0.0"
  },
  formatVideo: ["144", "240", "360", "480", "720", "1080", "1440", "2k", "3k", "4k", "5k", "8k"],
  formatAudio: ["mp3", "m4a", "webm", "aac", "flac", "opus", "ogg", "wav"],

  hexToBuffer: (hexString) => Buffer.from(hexString.match(/.{1,2}/g).join(""), "hex"),

  decrypt: async (enc) => {
    const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
    const data = Buffer.from(enc, "base64");
    const iv = data.slice(0, 16);
    const content = data.slice(16);
    const key = savetube.hexToBuffer(secretKey);
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    let decrypted = decipher.update(content);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  },

  extractId: (url) => {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) if (p.test(url)) return url.match(p)[1];
    return null;
  },

  request: async (endpoint, data, method) => {
    const url = endpoint.startsWith("http") ? endpoint : savetube.api.base + endpoint;
    const { data: response } = await axios({
      method: method || "post",
      url: url,
      data: method === "get" ? undefined : data,
      params: method === "get" ? data : undefined,
      headers: savetube.headers,
      timeout: 60000
    });
    return response;
  },

  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, "get");
    return response.cdn;
  },

  download: async (link, format) => {
    const allFormats = savetube.formatVideo.concat(savetube.formatAudio);
    if (!allFormats.includes(format)) throw new Error("Unsupported format: " + format);

    const id = savetube.extractId(link);
    if (!id) throw new Error("Invalid YouTube link");

    const cdn = await savetube.getCDN();
    const info = await savetube.request("https://" + cdn + savetube.api.info, { url: "https://www.youtube.com/watch?v=" + id });
    const decrypted = await savetube.decrypt(info.data);

    const isAudio = savetube.formatAudio.includes(format);
    const dl = await savetube.request("https://" + cdn + savetube.api.download, {
      id: id,
      downloadType: isAudio ? "audio" : "video",
      quality: isAudio ? "128" : format,
      key: decrypted.key
    });

    return {
      title: decrypted.title || null,
      author: decrypted.uploader || decrypted.channel || null,
      type: isAudio ? "audio" : "video",
      format: format,
      thumbnail: decrypted.thumbnail || ("https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg"),
      duration: decrypted.duration || null,
      quality: isAudio ? "128kbps" : format,
      downloadUrl: dl.data.downloadUrl,
      sourceId: id
    };
  }
};

module.exports = {
  name: "savetube",
  priority: 2,
  run: async ({ url, format }) => savetube.download(url, format || "720")
};
