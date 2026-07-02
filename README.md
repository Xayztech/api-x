# Web Helper — Fase 1: Frontend Shell

Ini adalah **fondasi frontend** (dashboard, sidebar, theme switcher, language switcher, routing per bahasa) yang dibangun dari brief dan isi `All-api.zip`. Backend nyata (fallback engine ke 86 API, AI Gemini + rotasi key, dsb) **belum** disambungkan — semua data di halaman ini masih dummy, agar struktur dan tampilan bisa dicek dulu sebelum saya lanjut ke fase berikutnya.

## Menjalankan secara lokal

```bash
npm install
npm start
```

Buka `http://localhost:3000` — otomatis redirect ke `/home/id`.

## Struktur folder

```
webhelper/
  package.json            CJS, Node.js >=24, npm start
  machine-api/
    server.js              Express: static file + routing /halaman/:lang
  appearance/
    shared/
      css/                 tokens.css, base.css, layout.css, components.css
      js/                  theme.js, i18n.js, history.js, dropdown.js, sidebar.js, app.js
      i18n/                12 bahasa: id, en, es, fr, de, pt, ru, ar, hi, ja, ko, zh
    pages/
      home.html             Dashboard
      downloader-youtube.html + .js   Contoh downloader end-to-end (dummy)
      ai-chat.html + .js     Shell chat Ai (model dropdown, attach, drop zone)
      shortlink.html + .js   Shell shortlink
      docs.html              Docs & cara pakai API
```

## Yang sudah jalan di fase ini

- Hamburger menu + sidebar drawer, brand klik → redirect ke home
- Theme switcher kustom (Light / Night / Follow the System) — bukan `<select>` bawaan browser, tersimpan di localStorage + cookie 400 hari
- Language switcher kustom, 12 bahasa, URL berpola `/halaman/{lang}` (kecuali endpoint API asli nanti)
- Emoji "menyatu" dengan tema lewat CSS filter (`--emoji-filter`), berubah otomatis di mode gelap/terang
- History & draft chat tersimpan (localStorage + cookie 400 hari — batas maksimum cookie di browser modern, mendekati "1 tahun")
- Halaman YouTube downloader: tab Download / Search / Search+Download, console player kustom (seek -10/-5/+5/+10, play/pause, progress bar bisa diseret, volume sampai 500%), pemilihan format video/audio, panel Raw JSON dengan tombol Copy
- Halaman Ai Chat: dropdown model (Gemini 3.1 Flash Lite, Llama 3.1 gratis), menu lampiran (gambar/berkas), preview lampiran dengan tombol hapus, drop zone khusus desktop, riwayat chat tersimpan
- Halaman Shortlink & Docs API (pola endpoint, langkah pakai, contoh respons)

## Yang belum — untuk fase berikutnya

1. **Backend fallback engine** — membaca 86 file di `All-api.zip`, mengelompokkan per platform, membuat urutan fallback (kuat → lemah), format respons wajib `{ creator, developer, version, ... }`.
2. **Endpoint REST asli**: `/api/{app}/{search|download}` menerima semua metode HTTP, menyertakan `ping` dan `time`.
3. **Integrasi Gemini** via `@google/genai`, `safetySettings: BLOCK_NONE`, rotasi `.env` key otomatis saat limit/error.
4. **Job queue untuk proses panjang** — supaya tidak kena limit timeout Vercel (Hobby: 10 detik, Pro: 60–300 detik). Solusinya bukan "timeout 2 hari" (itu tidak mungkin di serverless manapun), tapi proses download dijalankan sebagai job async dengan endpoint status `/api/job/:id` yang di-poll dari frontend.
5. Skrip `install.sh` untuk deploy non-serverless (VPS) yang menanyakan domain dsb.
6. Minifikasi/obfuscation build step untuk produksi (proteksi source code hanya bisa memperlambat, bukan mencegah total — ini akan dijelaskan lagi saat fase build/deploy).

Beri tahu saya modul mana yang mau dilanjutkan dulu (backend YouTube end-to-end, AI chat asli, atau modul lain), supaya saya bangun secara utuh dan teruji, bukan setengah jadi.
