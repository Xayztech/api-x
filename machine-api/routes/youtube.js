const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const { createJob, getJob } = require("../core/jobQueue");

const searchProvider = require("../providers/youtube/search");
const y2mate = require("../providers/youtube/y2mate");
const savetube = require("../providers/youtube/savetube");
const siputzx = require("../providers/youtube/siputzx");
const flvto = require("../providers/youtube/flvto");

const downloadProviders = [y2mate, savetube, siputzx, flvto];

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
    const { data, provider } = await runFallback(downloadProviders, { url: query, format: format || "720" }, { timeoutMs: 120000 });
    return Object.assign({ provider: provider }, data);
  });
  res.json(envelope(startedAt, true, { jobId: jobId, poll: "/api/job/" + jobId }));
}

function jobStatus(req, res, id) {
  const startedAt = Date.now();
  const job = getJob(id);
  if (!job) return res.status(404).json(envelope(startedAt, false, "Job not found"));
  if (job.status === "pending") return res.json(envelope(startedAt, true, { status: "pending" }));
  if (job.status === "failed") return res.json(envelope(startedAt, false, job.error));
  res.json(envelope(startedAt, true, job.result, { status: "completed" }));
}

module.exports = { search, download, jobStatus };
