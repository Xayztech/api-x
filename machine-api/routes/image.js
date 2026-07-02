const { runFallback } = require("../core/fallbackEngine");
const { envelope } = require("../core/envelope");
const { createJob, getJob } = require("../core/jobQueue");
const removebg = require("../providers/image/removebg");
const upscale = require("../providers/image/upscale");
const upscalePicsart = require("../providers/image/upscale-picsart");

function removeBg(req, res) {
  const startedAt = Date.now();
  const body = req.body || {};
  if (!body.base64) return res.status(400).json(envelope(startedAt, false, "Missing base64 image"));
  const jobId = createJob(async () => {
    const { data } = await runFallback([removebg], { base64: body.base64, filename: body.filename }, { timeoutMs: 120000 });
    return data;
  });
  res.json(envelope(startedAt, true, { jobId: jobId, poll: "/api/job/" + jobId }));
}

function upscaleImage(req, res) {
  const startedAt = Date.now();
  const body = req.body || {};
  if (!body.base64) return res.status(400).json(envelope(startedAt, false, "Missing base64 image"));
  const jobId = createJob(async () => {
    const { data } = await runFallback([upscale, upscalePicsart], { base64: body.base64, filename: body.filename }, { timeoutMs: 120000 });
    return data;
  });
  res.json(envelope(startedAt, true, { jobId: jobId, poll: "/api/job/" + jobId }));
}

module.exports = { removeBg, upscaleImage };
