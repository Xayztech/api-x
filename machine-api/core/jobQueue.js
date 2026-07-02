const jobs = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;

function createJob(taskFn) {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const job = { id: id, status: "pending", result: null, error: null, createdAt: Date.now() };
  jobs.set(id, job);

  Promise.resolve()
    .then(taskFn)
    .then((result) => {
      job.status = "completed";
      job.result = result;
    })
    .catch((err) => {
      job.status = "failed";
      job.error = err.message;
    });

  setTimeout(() => jobs.delete(id), JOB_TTL_MS);
  return id;
}

function getJob(id) {
  return jobs.get(id) || null;
}

module.exports = { createJob, getJob };
