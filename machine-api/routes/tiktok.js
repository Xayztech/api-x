const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");

const tikwm = require("../providers/tiktok/tikwm");
const native = require("../providers/tiktok/native");
const native2 = require("../providers/tiktok/native2");

const downloadProviders = [
  { name: tikwm.name, priority: tikwm.priority, run: tikwm.runDownload },
  native,
  native2
];

async function search(req, res, query) {
  const startedAt = Date.now();
  try {
    const data = await tikwm.runSearch({ query: query });
    res.json(envelope(startedAt, true, data));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

async function download(req, res, query) {
  const startedAt = Date.now();
  try {
    const { data, provider } = await runFallback(downloadProviders, { url: query }, { timeoutMs: 60000 });
    res.json(envelope(startedAt, true, data, { provider: provider }));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

module.exports = { search, download };
