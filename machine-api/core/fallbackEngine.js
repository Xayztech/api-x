const DEFAULT_TIMEOUT_MS = 45000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout: " + label + " exceeded " + ms + "ms")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runFallback(providers, args, options) {
  const opts = options || {};
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const errors = [];
  const sorted = providers.slice().sort((a, b) => (a.priority || 99) - (b.priority || 99));

  for (const provider of sorted) {
    try {
      const data = await withTimeout(provider.run(args), timeoutMs, provider.name);
      if (!data) throw new Error("Empty response from " + provider.name);
      return { provider: provider.name, data: data, triedProviders: errors.concat([{ provider: provider.name, ok: true }]) };
    } catch (err) {
      errors.push({ provider: provider.name, ok: false, error: err.message });
      continue;
    }
  }

  const combinedError = new Error("All providers failed: " + errors.map((e) => e.provider + " (" + e.error + ")").join(", "));
  combinedError.triedProviders = errors;
  throw combinedError;
}

module.exports = { runFallback };
