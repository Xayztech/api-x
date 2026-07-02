const HEADERS = {
  origin: "https://picsart.com",
  referer: "https://picsart.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  accept: "*/*"
};

async function getToken() {
  const resp = await fetch("https://picsart.com/-/landings/4.310.0/static/index-C3-HwnoW-GZgP7cLS.js", { headers: HEADERS });
  const text = await resp.text();
  const match = text.match(/"x-app-authorization":"Bearer\s+([^"]+)"/);
  if (!match || !match[1]) throw new Error("Token PicsArt tidak ditemukan");
  return match[1];
}

async function uploadBuffer(buffer) {
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2);
  let body = "--" + boundary + "\r\n";
  body += 'Content-Disposition: form-data; name="type"\r\n\r\n';
  body += "editing-temp-landings\r\n";
  body += "--" + boundary + "\r\n";
  body += 'Content-Disposition: form-data; name="file"; filename="image.jpg"\r\n';
  body += "Content-Type: image/jpeg\r\n\r\n";

  const part1 = Buffer.from(body, "utf-8");
  const part2 = Buffer.from("\r\n--" + boundary + '\r\nContent-Disposition: form-data; name="url"\r\n\r\n\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="metainfo"\r\n\r\n\r\n--' + boundary + "--\r\n", "utf-8");
  const data = Buffer.concat([part1, buffer, part2]);

  const resp = await fetch("https://upload.picsart.com/files", {
    method: "POST",
    headers: Object.assign({}, HEADERS, { "content-type": "multipart/form-data; boundary=" + boundary, accept: "application/json" }),
    body: data
  });
  return resp.json();
}

async function enhance(token, url, scale, faceEnhance, faceBlend) {
  const params = new URLSearchParams({ picsart_cdn_url: url, format: "PNG", model: "REALESERGAN" });
  const body = JSON.stringify({
    image_url: url,
    colour_correction: { enabled: false, blending: 0.5 },
    seed: 42,
    upscale: { enabled: true, node: "esrgan", target_scale: scale },
    face_enhancement: { enabled: faceEnhance, face_blending_cbcr: faceBlend }
  });

  const resp = await fetch("https://ai.picsart.com/gw1/diffbir-enhancement-service/v1.7.6?" + params, {
    method: "POST",
    headers: Object.assign({}, HEADERS, {
      accept: "application/json",
      "content-type": "application/json",
      platform: "website",
      "x-app-authorization": "Bearer " + token,
      "x-touchpoint": "widget_EnhancedImage",
      "x-touchpoint-referrer": "/ai-image-enhancer/",
      "task-mode": "async"
    }),
    body: body
  });
  return resp.json();
}

async function checkStatus(token, id) {
  const resp = await fetch("https://ai.picsart.com/gw1/diffbir-enhancement-service/v1.7.6/" + id, {
    method: "GET",
    headers: Object.assign({}, HEADERS, { accept: "application/json", "x-app-authorization": "Bearer " + token, platform: "website" })
  });
  return resp.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function picsartUpscale(base64, scale) {
  const buffer = Buffer.from(base64, "base64");
  const token = await getToken();

  const upload = await uploadBuffer(buffer);
  if (upload.status !== "success") throw new Error("Upload PicsArt gagal");

  const responseData = await enhance(token, upload.result.url, scale || 2, false, 0.5);
  if (!responseData || (responseData.status !== "ACCEPTED" && responseData.status !== "DONE")) {
    throw new Error("Gagal membuat antrean PicsArt");
  }

  const taskId = responseData.id;
  for (let attempts = 0; attempts < 30; attempts++) {
    await sleep(2000);
    const checkData = await checkStatus(token, taskId);
    if (checkData.status === "DONE" && checkData.result && checkData.result.image_url) {
      return { resultUrl: checkData.result.image_url, provider: "picsart" };
    }
    if (checkData.status === "FAILED" || checkData.error_message) {
      throw new Error("PicsArt gagal memproses: " + checkData.error_message);
    }
  }
  throw new Error("Timeout menunggu hasil PicsArt");
}

module.exports = { name: "picsart", priority: 2, run: async ({ base64 }) => picsartUpscale(base64, 2) };
