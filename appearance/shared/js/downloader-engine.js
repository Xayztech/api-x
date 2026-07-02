(function () {
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function syntaxHighlight(obj) {
    var json = JSON.stringify(obj, null, 2);
    json = escapeHtml(json);
    json = json.replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:');
    json = json.replace(/: "([^"]*)"/g, ': <span class="jv-s">"$1"</span>');
    json = json.replace(/: (\d+(\.\d+)?)/g, ': <span class="jv-n">$1</span>');
    return json;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function init(config) {
    var form = document.querySelector("[data-downloader-form]");
    var resultWrap = document.querySelector("[data-result-wrap]");
    var jsonPre = document.querySelector("[data-json-output]");
    var searchResultsEl = document.querySelector("[data-search-results]");
    var segButtons = document.querySelectorAll("[data-mode] button");
    var mode = "download";
    var formatType = "video";
    var currentResult = null;
    var audioCtx = null;
    var gainNode = null;
    var mediaEl = null;

    segButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        segButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        mode = btn.getAttribute("data-value");
      });
    });

    document.querySelectorAll("[data-format-type] button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-format-type] button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        formatType = btn.getAttribute("data-value");
        document.querySelectorAll("[data-format-list]").forEach(function (list) {
          list.style.display = list.getAttribute("data-format-list") === formatType ? "flex" : "none";
        });
      });
    });

    document.querySelectorAll(".format-option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        var parent = opt.closest("[data-format-list]");
        parent.querySelectorAll(".format-option").forEach(function (o) { o.classList.remove("selected"); });
        opt.classList.add("selected");
      });
    });

    function pollJob(jobId, onDone, onError) {
      var attempts = 0;
      var maxAttempts = 400;
      var timer = setInterval(function () {
        attempts++;
        fetch("/api/job/" + jobId)
          .then(function (r) { return r.json(); })
          .then(function (envelope) {
            if (!envelope.status) { clearInterval(timer); onError(envelope); return; }
            if (envelope.result && envelope.result.status === "completed") {
              clearInterval(timer);
              onDone(envelope);
              return;
            }
            if (attempts >= maxAttempts) { clearInterval(timer); onError({ error: "Timeout menunggu proses" }); }
          })
          .catch(function (err) { clearInterval(timer); onError({ error: err.message }); });
      }, 3000);
    }

    function fillResult(meta) {
      currentResult = meta;
      var setText = function (sel, val) {
        var el = document.querySelector(sel);
        if (el) el.textContent = val || "-";
      };
      setText("[data-result-title]", meta.title);
      setText("[data-result-author]", meta.author || meta.channel || meta.artist);
      var descEl = document.querySelector("[data-result-desc]");
      if (descEl) descEl.textContent = meta.description || "";
      setText("[data-result-duration]", meta.duration);
      setText("[data-result-views]", meta.views || meta.plays);
      setText("[data-result-likes]", meta.likes);
      setText("[data-result-country]", meta.region || meta.country);
      var thumb = document.querySelector("[data-result-thumb]");
      if (thumb && meta.thumbnail) thumb.src = meta.thumbnail;
      var linkInput = document.querySelector("[data-result-link]");
      if (linkInput) linkInput.value = meta.url || meta.downloadUrl || "";
      var openLink = document.querySelector("[data-open-source]");
      if (openLink && (meta.url || meta.downloadUrl)) openLink.href = meta.url || meta.downloadUrl;

      var downloadBtn = document.querySelector("[data-download-btn]");
      if (downloadBtn) downloadBtn.style.display = meta.downloadUrl ? "inline-flex" : "none";
      var playBtn2 = document.querySelector("[data-play-online-btn]");
      if (playBtn2) playBtn2.style.display = meta.downloadUrl ? "inline-flex" : "none";
    }

    function renderSearchResults(items) {
      if (!searchResultsEl) return;
      if (!items || !items.length) {
        searchResultsEl.style.display = "none";
        searchResultsEl.innerHTML = "";
        return;
      }
      searchResultsEl.style.display = "grid";
      searchResultsEl.innerHTML = "";
      items.slice(0, 24).forEach(function (item, idx) {
        var card = document.createElement("div");
        card.className = "tool-card";
        card.style.cursor = "pointer";
        card.style.animationDelay = (idx * 30) + "ms";
        var thumb = item.thumbnail ? '<img src="' + item.thumbnail + '" style="width:100%; height:110px; object-fit:cover; border-radius: var(--radius-md); margin-bottom:8px;">' : "";
        card.innerHTML = thumb +
          "<h3 style=\"font-size:13.5px; -webkit-line-clamp:2; overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical;\">" + escapeHtml(item.title || "Untitled") + "</h3>" +
          "<p style=\"font-size:12px;\">" + escapeHtml(item.channel || item.author || item.artist || "-") + (item.duration ? " · " + escapeHtml(String(item.duration)) : "") + "</p>";
        card.addEventListener("click", function () {
          loadAndDownload(item.url || item.videoId || item.id);
        });
        searchResultsEl.appendChild(card);
      });
    }

    function loadAndDownload(url) {
      if (!url) return;
      var submitBtn = form ? form.querySelector("button[type=submit]") : null;
      var originalHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner"></span>'; }
      if (resultWrap) resultWrap.style.opacity = "0.4";
      if (resultWrap) window.scrollTo({ top: resultWrap.offsetTop - 90, behavior: "smooth" });

      fetch(config.downloadEndpoint + "?q=" + encodeURIComponent(url) + (formatType ? "&format=" + encodeURIComponent(formatType) : ""))
        .then(function (r) { return r.json(); })
        .then(function (envelope) {
          if (jsonPre) jsonPre.innerHTML = syntaxHighlight(envelope);
          if (!envelope.status) throw new Error(envelope.error || "Gagal memproses");

          function restore() {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHtml; }
            if (resultWrap) resultWrap.style.opacity = "1";
          }

          var jobId = envelope.result && envelope.result.jobId;
          if (!jobId) {
            restore();
            fillResult(envelope.result || {});
            WHApp.showToast(WHI18n.t("toast_processed"));
            return;
          }
          pollJob(jobId, function (doneEnvelope) {
            restore();
            if (jsonPre) jsonPre.innerHTML = syntaxHighlight(doneEnvelope);
            fillResult(doneEnvelope.result || {});
            WHApp.showToast(WHI18n.t("toast_processed"));
          }, function (errEnvelope) {
            restore();
            WHApp.showToast(errEnvelope.error || "Gagal memproses");
          });
        })
        .catch(function (err) {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalHtml; }
          if (resultWrap) resultWrap.style.opacity = "1";
          WHApp.showToast(err.message || "Gagal terhubung ke server");
        });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input");
        var query = input.value.trim();
        if (!query) return;
        var submitBtn = form.querySelector("button[type=submit]");
        var originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>';
        if (resultWrap) resultWrap.style.opacity = "0.4";
        WHHistory.saveDraft(config.platform + "_last_query", query);

        var isLink = config.linkTest.test(query);
        var endpoint = (mode === "search" || (!isLink && mode !== "download")) ? config.searchEndpoint : config.downloadEndpoint;

        function restore() {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
          if (resultWrap) resultWrap.style.opacity = "1";
        }

        fetch(endpoint + "?q=" + encodeURIComponent(query) + (formatType ? "&format=" + encodeURIComponent(formatType) : ""))
          .then(function (r) { return r.json(); })
          .then(function (envelope) {
            if (jsonPre) jsonPre.innerHTML = syntaxHighlight(envelope);
            if (!envelope.status) throw new Error(envelope.error || "Gagal memproses");

            if (endpoint === config.searchEndpoint) {
              restore();
              var items = Array.isArray(envelope.result) ? envelope.result : [envelope.result];
              renderSearchResults(items);
              if (mode === "search_download" && items.length) {
                loadAndDownload(items[0].url || items[0].videoId);
              } else if (items.length) {
                fillResult(items[0]);
              }
              WHApp.showToast(WHI18n.t("toast_processed"));
              return;
            }

            if (searchResultsEl) { searchResultsEl.style.display = "none"; searchResultsEl.innerHTML = ""; }

            var jobId = envelope.result && envelope.result.jobId;
            if (!jobId) {
              restore();
              fillResult(envelope.result || {});
              WHApp.showToast(WHI18n.t("toast_processed"));
              return;
            }

            pollJob(jobId, function (doneEnvelope) {
              restore();
              if (jsonPre) jsonPre.innerHTML = syntaxHighlight(doneEnvelope);
              fillResult(doneEnvelope.result || {});
              WHApp.showToast(WHI18n.t("toast_processed"));
            }, function (errEnvelope) {
              restore();
              WHApp.showToast(errEnvelope.error || "Gagal memproses");
            });
          })
          .catch(function (err) {
            restore();
            WHApp.showToast(err.message || "Gagal terhubung ke server");
          });

        WHHistory.record({ type: config.platform + "_" + mode, query: query });
      });
    }

    function ensureMediaEl() {
      if (mediaEl) return mediaEl;
      var slot = document.querySelector("[data-media-slot]");
      if (!slot) return null;
      mediaEl = document.createElement("video");
      mediaEl.controls = false;
      mediaEl.crossOrigin = "anonymous";
      mediaEl.style.width = "100%";
      mediaEl.style.borderRadius = "var(--radius-lg)";
      mediaEl.style.display = "none";
      mediaEl.style.background = "#000";
      slot.appendChild(mediaEl);

      mediaEl.addEventListener("timeupdate", function () {
        if (!mediaEl.duration) return;
        var pct = (mediaEl.currentTime / mediaEl.duration) * 100;
        renderProgress(pct, mediaEl.currentTime);
      });
      mediaEl.addEventListener("ended", function () {
        var playBtn = document.querySelector("[data-play]");
        if (playBtn) playBtn.textContent = "▶";
      });
      return mediaEl;
    }

    var bar = document.querySelector("[data-player-bar]");
    var fill = document.querySelector("[data-player-fill]");
    var handle = document.querySelector("[data-player-handle]");
    var timeCurrent = document.querySelector("[data-time-current]");
    var isDragging = false;

    function renderProgress(pct, currentSeconds) {
      if (!fill) return;
      fill.style.width = pct + "%";
      handle.style.left = pct + "%";
      if (timeCurrent) timeCurrent.textContent = formatTime(currentSeconds || 0);
    }

    function setFromClientX(clientX) {
      var rect = bar.getBoundingClientRect();
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.min(100, Math.max(0, pct));
      if (mediaEl && mediaEl.duration) {
        mediaEl.currentTime = (pct / 100) * mediaEl.duration;
      }
      renderProgress(pct, mediaEl ? mediaEl.currentTime : 0);
    }

    if (bar) {
      bar.addEventListener("mousedown", function (e) { isDragging = true; setFromClientX(e.clientX); });
      window.addEventListener("mousemove", function (e) { if (isDragging) setFromClientX(e.clientX); });
      window.addEventListener("mouseup", function () { isDragging = false; });
      bar.addEventListener("touchstart", function (e) { isDragging = true; setFromClientX(e.touches[0].clientX); });
      bar.addEventListener("touchmove", function (e) { if (isDragging) setFromClientX(e.touches[0].clientX); });
      window.addEventListener("touchend", function () { isDragging = false; });
      renderProgress(0, 0);
    }

    var playBtn = document.querySelector("[data-play]");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        var el = ensureMediaEl();
        if (!el || !el.src) {
          WHApp.showToast("Muat hasil dulu sebelum memutar");
          return;
        }
        if (el.paused) {
          el.play();
          playBtn.textContent = "⏸";
        } else {
          el.pause();
          playBtn.textContent = "▶";
        }
      });
    }

    document.querySelectorAll("[data-seek]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var delta = parseInt(btn.getAttribute("data-seek"), 10);
        if (mediaEl && mediaEl.duration) {
          mediaEl.currentTime = Math.min(mediaEl.duration, Math.max(0, mediaEl.currentTime + delta));
        }
      });
    });

    var volumeSlider = document.querySelector("[data-volume]");
    var volumeValue = document.querySelector("[data-volume-value]");
    if (volumeSlider) {
      volumeSlider.addEventListener("input", function () {
        var val = parseInt(volumeSlider.value, 10);
        volumeValue.textContent = val + "%";
        var el = ensureMediaEl();
        if (!el) return;
        if (val <= 100) {
          el.volume = val / 100;
          if (gainNode) gainNode.gain.value = 1;
        } else {
          el.volume = 1;
          try {
            if (!audioCtx) {
              audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              var source = audioCtx.createMediaElementSource(el);
              gainNode = audioCtx.createGain();
              source.connect(gainNode);
              gainNode.connect(audioCtx.destination);
            }
            gainNode.gain.value = val / 100;
          } catch (err) {
            WHApp.showToast("Boost volume tidak didukung untuk sumber ini");
          }
        }
      });
    }

    function playOnline() {
      if (!currentResult || !currentResult.downloadUrl) {
        WHApp.showToast("Belum ada media untuk diputar");
        return;
      }
      var el = ensureMediaEl();
      if (!el) return;
      el.src = currentResult.downloadUrl;
      el.style.display = "block";
      el.style.maxHeight = "360px";
      el.play().then(function () {
        var pb = document.querySelector("[data-play]");
        if (pb) pb.textContent = "⏸";
      }).catch(function () {
        WHApp.showToast("Gagal memutar otomatis, tekan tombol play manual");
      });
      var console2 = document.querySelector(".player-console");
      if (console2) console2.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    var playOnlineBtn = document.querySelector("[data-play-online-btn]");
    if (playOnlineBtn) playOnlineBtn.addEventListener("click", playOnline);

    var downloadBtn = document.querySelector("[data-download-btn]");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        if (!currentResult || !currentResult.downloadUrl) {
          WHApp.showToast("Belum ada tautan unduhan");
          return;
        }
        var a = document.createElement("a");
        a.href = currentResult.downloadUrl;
        a.download = currentResult.title || "download";
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        WHHistory.record({ type: config.platform + "_file_download", title: currentResult.title });
      });
    }

    var jsonRawBtn = document.querySelector("[data-json-raw-link]");
    if (jsonRawBtn) {
      jsonRawBtn.addEventListener("click", function () {
        if (jsonPre) {
          var win = window.open("", "_blank");
          win.document.write("<pre>" + jsonPre.textContent + "</pre>");
        }
      });
    }
  }

  window.WHDownloader = { init: init };
})();
