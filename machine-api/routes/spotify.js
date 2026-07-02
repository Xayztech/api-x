const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const { createJob, getJob } = require("../core/jobQueue");

const searchProvider = require("../providers/spotify/search");
const spotmate = require("../providers/spotify/spotmate");
const dlapi = require("../providers/spotify/dlapi");
const spowload = require("../providers/spotify/spowload");

const downloadProviders = [spotmate, dlapi, spowload];

async function search(req, res, query) {
  const startedAt = Date.now();
  try {
    const { data } = await runFallback([searchProvider], { query: query });
    res.json(envelope(startedAt, true, data));
  } catch (err) {
    res.status(502).json(envelope(startedAt, false, err));
  }
}

function download(req, res, query, format) {
  const startedAt = Date.now();
  const jobId = createJob(async () => {
    const { data, provider } = await runFallback(downloadProviders, { url: query, format: format || "mp3" }, { timeoutMs: 120000 });
    return Object.assign({ provider: provider }, data);
  });
  res.json(envelope(startedAt, true, { jobId: jobId, poll: "/api/job/" + jobId }));
}

module.exports = { search, download };
