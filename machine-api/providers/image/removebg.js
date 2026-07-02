const axios = require("axios");
const FormData = require("form-data");

const baseHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://removal.ai",
  Referer: "https://removal.ai/upload/",
  "X-Requested-With": "XMLHttpRequest"
};

function cleanCookies(cookieHeaders) {
  if (!cookieHeaders || !cookieHeaders.length) return "";
  return cookieHeaders.map((c) => c.split(";")[0]).filter((c) => c.trim().length > 0).join("; ");
}

async function getWebToken() {
  const session = await axios.get("https://removal.ai/upload/", { headers: baseHeaders, timeout: 30000 });
  const cookies = cleanCookies(session.headers["set-cookie"]);
  const nonceMatch = session.data.match(/"ajax_nonce"\s*:\s*"([^"]+)"/) || session.data.match(/security\s*=\s*"([^"]+)"/);
  const securityNonce = nonceMatch ? nonceMatch[1] : "f84d58eda0";

  const r = await axios.get("https://removal.ai/wp-admin/admin-ajax.php", {
    headers: Object.assign({}, baseHeaders, { Cookie: cookies }),
    params: { action: "ajax_get_webtoken", security: securityNonce },
    timeout: 30000
  });

  if (!r.data || !r.data.success || !r.data.data || !r.data.data.webtoken) throw new Error("Gagal mengambil token removal.ai");
  return { token: r.data.data.webtoken, cookies: cookies };
}

async function removebg(base64, filename) {
  const buffer = Buffer.from(base64, "base64");
  const { token, cookies } = await getWebToken();

  const form = new FormData();
  form.append("image_file", buffer, { filename: filename || "image.jpg", contentType: "image/jpeg" });

  const r = await axios.post("https://api.removal.ai/3.0/remove", form, {
    headers: Object.assign({}, baseHeaders, form.getHeaders(), { "Web-Token": token, Cookie: cookies }),
    timeout: 60000
  });

  const resData = r.data;
  return {
    width: resData.original_width || null,
    height: resData.original_height || null,
    originalUrl: resData.original || null,
    resultUrl: resData.url || resData.low_resolution || null
  };
}

module.exports = { name: "removal-ai", priority: 1, run: async ({ base64, filename }) => removebg(base64, filename) };
