(function () {
  var MODELS = [
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", sub: "Google · rotasi key", available: true },
    { id: "llama-3.1-8b", label: "Llama 3.1 8B", sub: "Segera hadir", available: false },
    { id: "llama-3.1-70b", label: "Llama 3.1 70B", sub: "Segera hadir", available: false }
  ];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var modelPanel = document.querySelector("[data-model-panel]");
    var modelLabel = document.querySelector("[data-model-label]");
    var current = MODELS[0];

    function renderModels() {
      modelPanel.innerHTML = "";
      MODELS.forEach(function (m) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "dropdown-option" + (m.id === current.id ? " selected" : "");
        if (!m.available) el.style.opacity = "0.45";
        el.innerHTML = "<span>" + m.label + '</span><span class="dropdown-option-sub">' + m.sub + "</span>";
        el.addEventListener("click", function () {
          if (!m.available) { WHApp.showToast("Model ini segera hadir"); return; }
          current = m;
          modelLabel.textContent = m.label;
          renderModels();
          WHDropdown.closeAll(null);
        });
        modelPanel.appendChild(el);
      });
    }
    renderModels();

    var fileInput = document.querySelector("[data-file-input]");
    var attachPreview = document.querySelector("[data-attach-preview]");
    var attachedFiles = [];

    document.querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        fileInput.setAttribute("accept", btn.getAttribute("data-pick") === "image" ? "image/*" : "*/*");
        fileInput.click();
        WHDropdown.closeAll(null);
      });
    });

    function renderAttachments() {
      attachPreview.innerHTML = "";
      attachedFiles.forEach(function (file, idx) {
        var chip = document.createElement("div");
        chip.className = "attach-chip";
        chip.innerHTML = "<span>" + (file.type.indexOf("image") === 0 ? "🖼️" : "📄") + " " + file.name.slice(0, 22) + "</span>";
        var x = document.createElement("button");
        x.type = "button";
        x.textContent = "✕";
        x.addEventListener("click", function () {
          attachedFiles.splice(idx, 1);
          renderAttachments();
        });
        chip.appendChild(x);
        attachPreview.appendChild(chip);
      });
    }

    fileInput.addEventListener("change", function () {
      attachedFiles = attachedFiles.concat(Array.from(fileInput.files));
      renderAttachments();
      fileInput.value = "";
    });

    var dropHint = document.querySelector("[data-drop-hint]");
    ["dragenter", "dragover"].forEach(function (evt) {
      dropHint.addEventListener(evt, function (e) { e.preventDefault(); dropHint.classList.add("drag-over"); });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dropHint.addEventListener(evt, function (e) { e.preventDefault(); dropHint.classList.remove("drag-over"); });
    });
    dropHint.addEventListener("drop", function (e) {
      if (e.dataTransfer.files.length) {
        attachedFiles = attachedFiles.concat(Array.from(e.dataTransfer.files));
        renderAttachments();
      }
    });

    var messages = document.querySelector("[data-chat-messages]");
    var input = document.querySelector("[data-chat-input]");
    var sendBtn = document.querySelector("[data-chat-send]");

    var savedHistory = WHHistory.loadDraft("chat_thread");
    if (savedHistory && savedHistory.length) {
      messages.innerHTML = "";
      savedHistory.forEach(function (m) {
        var bubble = document.createElement("div");
        bubble.className = "msg " + (m.role === "user" ? "msg-user" : "msg-ai");
        bubble.textContent = m.text;
        messages.appendChild(bubble);
      });
    }

    function persistThread() {
      var thread = Array.from(messages.children).map(function (el) {
        return { role: el.classList.contains("msg-user") ? "user" : "ai", text: el.textContent };
      });
      WHHistory.saveDraft("chat_thread", thread);
    }

    function addMessage(role, text) {
      var bubble = document.createElement("div");
      bubble.className = "msg " + (role === "user" ? "msg-user" : "msg-ai");
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
      persistThread();
    }

    function fileToBase64(file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result).split(",")[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function buildHistory() {
      return Array.from(messages.children)
        .filter(function (el) { return !el.hasAttribute("data-typing"); })
        .map(function (el) {
          return { role: el.classList.contains("msg-user") ? "user" : "ai", text: el.textContent };
        });
    }

    function send() {
      var text = input.value.trim();
      if (!text && !attachedFiles.length) return;
      var filesToSend = attachedFiles.slice();
      addMessage("user", text || "(mengirim " + filesToSend.length + " berkas)");
      input.value = "";
      attachedFiles = [];
      renderAttachments();

      var typing = document.createElement("div");
      typing.className = "msg msg-ai";
      typing.setAttribute("data-typing", "");
      typing.innerHTML = '<span class="spinner" style="border-top-color:var(--ink); border-color: color-mix(in srgb, var(--ink) 25%, transparent);"></span>';
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      Promise.all(filesToSend.map(function (f) {
        return fileToBase64(f).then(function (base64) { return { base64: base64, mimeType: f.type, name: f.name }; });
      }))
        .then(function (attachments) {
          return fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: buildHistory(), attachments: attachments, model: current.id })
          });
        })
        .then(function (r) { return r.json(); })
        .then(function (envelope) {
          typing.remove();
          if (!envelope.status) throw new Error(envelope.error || "Gagal mendapat balasan Ai");
          addMessage("ai", envelope.result.reply);
        })
        .catch(function (err) {
          typing.remove();
          addMessage("ai", "Maaf, terjadi kendala menghubungi Ai: " + err.message);
        });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 140) + "px";
    });
  });
})();
