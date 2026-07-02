const VERSION = "v1.0.0";
const CREATOR = "XYCoolcraft";

function envelope(startedAt, status, resultOrError, extra) {
  const ping = (Date.now() - startedAt) + "ms";
  const base = {
    creator: CREATOR,
    developer: CREATOR,
    version: VERSION,
    status: status,
    ping: ping,
    time: new Date().toISOString()
  };
  if (status) {
    base.result = resultOrError;
  } else {
    base.error = typeof resultOrError === "string" ? resultOrError : (resultOrError && resultOrError.message) || "Unknown error";
  }
  return Object.assign(base, extra || {});
}

module.exports = { envelope, VERSION, CREATOR };
