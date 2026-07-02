function makeKeyRotator(keys) {
  const list = (keys || []).filter(Boolean);
  let cursor = 0;

  if (!list.length) {
    return {
      hasKeys: () => false,
      next: () => { throw new Error("No API keys configured"); },
      count: () => 0
    };
  }

  return {
    hasKeys: () => true,
    count: () => list.length,
    next: () => {
      const key = list[cursor % list.length];
      cursor += 1;
      return key;
    },
    current: () => list[(cursor - 1 + list.length) % list.length]
  };
}

module.exports = { makeKeyRotator };
