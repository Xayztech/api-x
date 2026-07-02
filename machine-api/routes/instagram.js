const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const downloadgram = require("../providers/instagram/downloadgram");
const downr = require("../providers/universal/downr");
const vidssave = require("../providers/universal/vidssave");

async function download(req, res, query) {
  const startedAt = Date.now();
  try {
    const { data, provider } = await runFallback([downloadgram, downr, vidssave], { url: query }, { timeoutMs: 60000 });
    res.json(envelope(startedAt, true, data, { provider: provider }));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

module.exports = { download };
