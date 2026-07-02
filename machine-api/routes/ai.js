const { envelope } = require("../core/envelope");
const gemini = require("../providers/ai/gemini");

async function chat(req, res) {
  const startedAt = Date.now();
  const body = req.body || {};
  const message = body.message;
  const history = body.history || [];
  const attachments = body.attachments || [];

  if (!message && !attachments.length) {
    return res.status(400).json(envelope(startedAt, false, "Missing message or attachments"));
  }

  try {
    const result = await gemini.chat({ message: message, history: history, attachments: attachments });
    res.json(envelope(startedAt, true, { reply: result.text, model: result.model }));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

module.exports = { chat };
