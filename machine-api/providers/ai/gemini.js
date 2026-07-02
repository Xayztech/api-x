const { GoogleGenAI } = require("@google/genai");
const { makeKeyRotator } = require("../../core/keyRotator");

const MODEL = "gemini-3.1-flash-lite";

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

const SYSTEM_PROMPT = "Kamu adalah asisten Ai di dalam Web Helper, dibuat oleh XYCoolcraft. Jawab dengan jelas, ramah, dan sesuai bahasa yang dipakai pengguna.";

function loadKeys() {
  const raw = Object.keys(process.env)
    .filter((k) => /^GEMINI_API_KEY(_\d+)?$/.test(k))
    .sort()
    .map((k) => process.env[k]);
  return raw;
}

const rotator = makeKeyRotator(loadKeys());

async function chat({ message, history, attachments }) {
  if (!rotator.hasKeys()) throw new Error("No GEMINI_API_KEY configured in .env");

  const contents = (history || []).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const parts = [{ text: message }];
  (attachments || []).forEach((a) => {
    if (a.base64 && a.mimeType) parts.push({ inlineData: { data: a.base64, mimeType: a.mimeType } });
  });
  contents.push({ role: "user", parts: parts });

  let lastError;
  const attempts = Math.max(rotator.count(), 1);

  for (let i = 0; i < attempts; i++) {
    const apiKey = rotator.next();
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          safetySettings: SAFETY_SETTINGS
        }
      });
      const text = response.text || (response.candidates && response.candidates[0] && response.candidates[0].content.parts.map((p) => p.text).join(""));
      if (!text) throw new Error("Empty response from Gemini");
      return { text: text, model: MODEL, keyIndex: i };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error("All Gemini keys failed: " + (lastError && lastError.message));
}

module.exports = { chat, MODEL, hasKeys: rotator.hasKeys };
