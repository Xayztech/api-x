const axios = require("axios");
const FormData = require("form-data");

async function upload(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, filename || "image.jpg");
  form.append("type", 13);
  form.append("scaleRadio", 2);

  const headers = Object.assign({}, form.getHeaders(), {
    accept: "application/json, text/plain, */*",
    origin: "https://imglarger.com",
    referer: "https://imglarger.com/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
  });

  const { data } = await axios.post("https://photoai.imglarger.com/api/PhoAi/Upload", form, { headers: headers, timeout: 60000 });
  if (!data || !data.data) throw new Error("Upload upscale gagal");
  return data.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll(code) {
  const headers = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    origin: "https://imglarger.com",
    referer: "https://imglarger.com/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
  };

  for (let i = 0; i < 20; i++) {
    const { data } = await axios.post("https://photoai.imglarger.com/api/PhoAi/CheckStatus", { code: code, type: 13 }, { headers: headers, timeout: 30000 });
    if (data && data.data && data.data.status === "success") return data.data;
    await sleep(3000);
  }
  throw new Error("Timeout menunggu hasil upscale");
}

async function upscale(base64, filename) {
  const buffer = Buffer.from(base64, "base64");
  const uploaded = await upload(buffer, filename);
  const result = await poll(uploaded.code);
  return { resultUrl: result.downloadUrls ? result.downloadUrls[0] : result.url, provider: "imglarger" };
}

module.exports = { name: "imglarger", priority: 1, run: async ({ base64, filename }) => upscale(base64, filename) };
