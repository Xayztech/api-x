const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const capcut = require("../providers/capcut/capcut");

async function download(req, res, query) {
  const startedAt = Date.now();
  try {
    const { data, provider } = await runFallback([capcut], { url: query }, { timeoutMs: 60000 });
    res.json(envelope(startedAt, true, data, { provider: provider }));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

module.exports = { download };
