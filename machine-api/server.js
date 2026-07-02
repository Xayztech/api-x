require("dotenv").config();
const express = require("express");
const path = require("path");

const youtubeRoute = require("./routes/youtube");
const tiktokRoute = require("./routes/tiktok");
const spotifyRoute = require("./routes/spotify");
const shortlinkRoute = require("./routes/shortlink");
const aiRoute = require("./routes/ai");
const facebookRoute = require("./routes/facebook");
const capcutRoute = require("./routes/capcut");
const twitterRoute = require("./routes/twitter");
const instagramRoute = require("./routes/instagram");
const imageRoute = require("./routes/image");
const { envelope } = require("./core/envelope");
const { getJob } = require("./core/jobQueue");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPPORTED_LANGS = ["id", "en", "es", "fr", "de", "pt", "ru", "ar", "hi", "ja", "ko", "zh"];
const DEFAULT_LANG = "id";
const PAGES_DIR = path.join(__dirname, "..", process.env.WH_USE_DIST === "1" ? "appearance-dist" : "appearance", "pages");
const SHARED_DIR = path.join(__dirname, "..", process.env.WH_USE_DIST === "1" ? "appearance-dist" : "appearance", "shared");

app.disable("x-powered-by");
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/shared", express.static(SHARED_DIR, { maxAge: "1d" }));
app.use(express.static(PAGES_DIR, { index: false }));

function query(req) {
  return Object.assign({}, req.query, req.body);
}

app.all("/api/yt/search", (req, res) => youtubeRoute.search(req, res, query(req).q));
app.all("/api/yt/download", (req, res) => youtubeRoute.download(req, res, query(req).q, query(req).format));
app.all("/api/tiktok/search", (req, res) => tiktokRoute.search(req, res, query(req).q));
app.all("/api/tiktok/download", (req, res) => tiktokRoute.download(req, res, query(req).q));
app.all("/api/spotify/search", (req, res) => spotifyRoute.search(req, res, query(req).q));
app.all("/api/spotify/download", (req, res) => spotifyRoute.download(req, res, query(req).q, query(req).format));
app.all("/api/shortlink/create", (req, res) => shortlinkRoute.create(req, res, query(req).url, query(req).provider));
app.all("/api/ai/chat", (req, res) => aiRoute.chat(req, res));
app.all("/api/facebook/download", (req, res) => facebookRoute.download(req, res, query(req).q));
app.all("/api/capcut/download", (req, res) => capcutRoute.download(req, res, query(req).q));
app.all("/api/twitter/download", (req, res) => twitterRoute.download(req, res, query(req).q));
app.all("/api/instagram/download", (req, res) => instagramRoute.download(req, res, query(req).q));
app.all("/api/image/removebg", (req, res) => imageRoute.removeBg(req, res));
app.all("/api/image/upscale", (req, res) => imageRoute.upscaleImage(req, res));

app.all("/api/job/:id", (req, res) => {
  const startedAt = Date.now();
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json(envelope(startedAt, false, "Job not found"));
  if (job.status === "pending") return res.json(envelope(startedAt, true, { status: "pending" }));
  if (job.status === "failed") return res.json(envelope(startedAt, false, job.error));
  res.json(envelope(startedAt, true, job.result, { status: "completed" }));
});

function resolveLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

function sendPage(res, file) {
  res.sendFile(path.join(PAGES_DIR, file));
}

app.get("/", (req, res) => res.redirect(302, "/home/" + DEFAULT_LANG));
app.get("/home/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "home.html"); });
app.get("/ai/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "ai-chat.html"); });
app.get("/shortlink/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "shortlink.html"); });
app.get("/docs/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "docs.html"); });
app.get("/downloader/youtube/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-youtube.html"); });
app.get("/downloader/tiktok/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-tiktok.html"); });
app.get("/downloader/spotify/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-spotify.html"); });
app.get("/downloader/facebook/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-facebook.html"); });
app.get("/downloader/capcut/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-capcut.html"); });
app.get("/downloader/twitter/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-twitter.html"); });
app.get("/downloader/instagram/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "downloader-instagram.html"); });
app.get("/tools/image/:lang", (req, res) => { resolveLang(req.params.lang); sendPage(res, "tools-image.html"); });

app.use((req, res) => res.redirect(302, "/home/" + DEFAULT_LANG));

if (require.main === module) {
  app.listen(PORT, () => console.log("Web Helper server running on port " + PORT));
}

module.exports = app;
