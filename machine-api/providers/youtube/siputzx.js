const axios = require("axios");
const crypto = require("crypto");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const BASE_URL = "https://youtubedl.siputzx.my.id";

function solvePow(challenge, difficulty) {
  let nonce = 0;
  const prefix = "0".repeat(difficulty);
  while (true) {
    const hash = crypto.createHash("sha256").update(challenge + nonce).digest("hex");
    if (hash.startsWith(prefix)) return nonce.toString();
    nonce++;
  }
}

async function downloadVideo(url, type) {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar: jar, withCredentials: true, timeout: 60000 }));

  const initRes = await client.post(BASE_URL + "/akumaudownload", { url: url, type: type });
  const { challenge, difficulty } = initRes.data;
  const nonce = solvePow(challenge, difficulty);

  await client.post(BASE_URL + "/cekpunyaku", { url: url, type: type, nonce: nonce });

  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const { data } = await client.get(BASE_URL + "/download", { params: { url: url, type: type } });
    if (data.status === "completed") return BASE_URL + data.fileUrl;
    if (data.status === "failed") throw new Error(data.error || "Conversion failed");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timed out waiting for conversion");
}

module.exports = {
  name: "siputzx",
  priority: 3,
  run: async ({ url, format }) => {
    const isAudio = ["mp3", "m4a", "opus"].includes(format) || format === "audio";
    const type = isAudio ? "audio" : "video";
    const downloadUrl = await downloadVideo(url, type);
    return {
      type: type,
      format: format,
      downloadUrl: downloadUrl,
      sourceId: url
    };
  }
};
