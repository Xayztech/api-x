const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const { tinyurl, isgd, vgd } = require("../providers/shortlink/providers");

const PROVIDER_MAP = { tinyurl: tinyurl, isgd: isgd, vgd: vgd };
const ALL_PROVIDERS = [tinyurl, isgd, vgd];

async function create(req, res, url, preferred) {
  const startedAt = Date.now();
  if (!url) return res.status(400).json(envelope(startedAt, false, "Missing url"));

  const preferredProvider = PROVIDER_MAP[preferred];
  const providers = preferredProvider ? [preferredProvider].concat(ALL_PROVIDERS.filter((p) => p !== preferredProvider)) : ALL_PROVIDERS;

  try {
    const { data, provider } = await runFallback(providers, { url: url }, { timeoutMs: 20000 });
    res.json(envelope(startedAt, true, data, { provider: provider }));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

module.exports = { create };
