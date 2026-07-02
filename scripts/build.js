const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "appearance");
const DIST_DIR = path.join(__dirname, "..", "appearance-dist");

function minifyJs(code) {
  return code
    .replace(/\n\s*\n/g, "\n")
    .replace(/^\s+/gm, "")
    .replace(/\s+$/gm, "");
}

function minifyCss(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim();
}

function copyDir(src, dist) {
  fs.mkdirSync(dist, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dist, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
      continue;
    }
    const content = fs.readFileSync(s, "utf8");
    if (entry.name.endsWith(".js")) fs.writeFileSync(d, minifyJs(content));
    else if (entry.name.endsWith(".css")) fs.writeFileSync(d, minifyCss(content));
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
copyDir(SRC_DIR, DIST_DIR);
console.log("Build selesai -> appearance-dist/. Set WH_USE_DIST=1 saat menjalankan server untuk memakainya.");
