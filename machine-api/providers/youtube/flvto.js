function extractVideoId(input) {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
  const match = input.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}

async function download(videoId, format) {
  const headers = { "accept-encoding": "gzip, deflate, br, zstd", origin: "https://ht.flvto.online" };
  const body = JSON.stringify({ id: videoId, fileType: format });
  const response = await fetch("https://ht.flvto.online/converter", { headers: headers, body: body, method: "post" });
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.json();
}

async function ytFlvto(input, format) {
  const videoId = extractVideoId(input);
  if (!videoId) throw new Error("URL YouTube tidak valid");

  const isAudio = ["mp3", "64", "128", "192", "320"].includes(String(format));
  const requestFormat = isAudio ? "mp3" : "MP4";

  const dlData = await download(videoId, requestFormat);
  if (!dlData || (dlData.status !== "ok" && dlData.status !== "success")) {
    throw new Error((dlData && dlData.msg) || "Gagal memproses konversi video");
  }

  let finalDownloadUrl = "";
  if (dlData.link) finalDownloadUrl = dlData.link;
  else if (dlData.formats && dlData.formats.length) finalDownloadUrl = dlData.formats[0].url;
  if (!finalDownloadUrl) throw new Error("Tidak ada tautan unduhan dari server");

  return {
    title: dlData.title || "Unknown Title",
    author: null,
    type: isAudio ? "audio" : "video",
    format: isAudio ? "mp3" : "mp4",
    thumbnail: "https://i.ytimg.com/vi/" + videoId + "/maxresdefault.jpg",
    duration: dlData.duration || null,
    downloadUrl: finalDownloadUrl,
    sourceId: videoId
  };
}

module.exports = { name: "flvto", priority: 4, run: async ({ url, format }) => ytFlvto(url, format) };
