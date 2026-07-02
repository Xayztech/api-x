(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

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
    return json;
  }

  ready(function () {
    var mode = "removebg";
    document.querySelectorAll("[data-image-mode] button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-image-mode] button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        mode = btn.getAttribute("data-value");
      });
    });

    var dropZone = document.querySelector("[data-image-drop]");
    var fileInput = document.querySelector("[data-image-input]");
    var previewWrap = document.querySelector("[data-image-preview-wrap]");
    var beforeImg = document.querySelector("[data-image-before]");
    var afterWrap = document.querySelector("[data-image-after-wrap]");
    var processBtn = document.querySelector("[data-image-process]");
    var downloadLink = document.querySelector("[data-image-download]");
    var jsonPre = document.querySelector("[data-json-output]");
    var currentFile = null;

    dropZone.addEventListener("click", function () { fileInput.click(); });
    ["dragenter", "dragover"].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) { e.preventDefault(); dropZone.classList.add("drag-over"); });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) { e.preventDefault(); dropZone.classList.remove("drag-over"); });
    });
    dropZone.addEventListener("drop", function (e) {
      if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files.length) setFile(fileInput.files[0]);
    });

    function setFile(file) {
      currentFile = file;
      var reader = new FileReader();
      reader.onload = function () {
        beforeImg.src = reader.result;
        previewWrap.style.display = "grid";
        afterWrap.innerHTML = '<span style="font-size:13px;color:var(--ink-soft);">Belum diproses</span>';
        processBtn.disabled = false;
        downloadLink.style.display = "none";
      };
      reader.readAsDataURL(file);
    }

    function fileToBase64(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result).split(",")[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function pollJob(jobId, onDone, onError) {
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        fetch("/api/job/" + jobId)
          .then(function (r) { return r.json(); })
          .then(function (envelope) {
            if (!envelope.status) { clearInterval(timer); onError(envelope); return; }
            if (envelope.result && envelope.result.status === "completed") { clearInterval(timer); onDone(envelope); return; }
            if (attempts >= 400) { clearInterval(timer); onError({ error: "Timeout" }); }
          })
          .catch(function (err) { clearInterval(timer); onError({ error: err.message }); });
      }, 3000);
    }

    processBtn.addEventListener("click", function () {
      if (!currentFile) return;
      processBtn.disabled = true;
      var originalHtml = processBtn.innerHTML;
      processBtn.innerHTML = '<span class="spinner"></span>';
      afterWrap.innerHTML = '<span class="spinner" style="border-top-color:var(--ink); border-color: color-mix(in srgb, var(--ink) 25%, transparent);"></span>';

      fileToBase64(currentFile).then(function (base64) {
        var endpoint = mode === "upscale" ? "/api/image/upscale" : "/api/image/removebg";
        return fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: base64, filename: currentFile.name })
        });
      })
        .then(function (r) { return r.json(); })
        .then(function (envelope) {
          if (jsonPre) jsonPre.innerHTML = syntaxHighlight(envelope);
          if (!envelope.status) throw new Error(envelope.error || "Gagal memproses gambar");
          var jobId = envelope.result && envelope.result.jobId;
          if (!jobId) throw new Error("Tidak ada job id dari server");

          pollJob(jobId, function (doneEnvelope) {
            processBtn.disabled = false;
            processBtn.innerHTML = originalHtml;
            if (jsonPre) jsonPre.innerHTML = syntaxHighlight(doneEnvelope);
            var resultUrl = doneEnvelope.result && (doneEnvelope.result.resultUrl || doneEnvelope.result.result_url);
            if (resultUrl) {
              afterWrap.innerHTML = "";
              var img = document.createElement("img");
              img.src = resultUrl;
              img.style.width = "100%";
              img.style.borderRadius = "var(--radius-md)";
              afterWrap.appendChild(img);
              downloadLink.href = resultUrl;
              downloadLink.style.display = "inline-flex";
            } else {
              afterWrap.innerHTML = '<span style="font-size:13px;color:var(--warn);">Tidak ada hasil</span>';
            }
            WHHistory.record({ type: "image_" + mode, filename: currentFile.name });
            WHApp.showToast(WHI18n.t("toast_processed"));
          }, function (errEnvelope) {
            processBtn.disabled = false;
            processBtn.innerHTML = originalHtml;
            afterWrap.innerHTML = '<span style="font-size:13px;color:var(--warn);">Gagal memproses</span>';
            WHApp.showToast(errEnvelope.error || "Gagal memproses");
          });
        })
        .catch(function (err) {
          processBtn.disabled = false;
          processBtn.innerHTML = originalHtml;
          afterWrap.innerHTML = '<span style="font-size:13px;color:var(--warn);">' + err.message + "</span>";
          WHApp.showToast(err.message);
        });
    });
  });
})();
