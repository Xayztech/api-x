const axios = require("axios");

const tinyurl = {
  name: "tinyurl",
  priority: 1,
  run: async ({ url }) => {
    const { data } = await axios.get("https://tinyurl.com/api-create.php", { params: { url: url }, timeout: 20000 });
    if (!data || !String(data).startsWith("http")) throw new Error("TinyURL failed");
    return { short_url: String(data).trim() };
  }
};

const isgd = {
  name: "is.gd",
  priority: 2,
  run: async ({ url }) => {
    const { data } = await axios.get("https://is.gd/create.php", { params: { format: "simple", url: url }, timeout: 20000 });
    if (!data || !String(data).startsWith("http")) throw new Error("is.gd failed: " + data);
    return { short_url: String(data).trim() };
  }
};

const vgd = {
  name: "v.gd",
  priority: 3,
  run: async ({ url }) => {
    const { data } = await axios.get("https://v.gd/create.php", { params: { format: "simple", url: url }, timeout: 20000 });
    if (!data || !String(data).startsWith("http")) throw new Error("v.gd failed: " + data);
    return { short_url: String(data).trim() };
  }
};

module.exports = { tinyurl, isgd, vgd };
