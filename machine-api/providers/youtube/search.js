async function youtubeSearch(query) {
  if (typeof query !== "string" || query.length === 0) throw new Error("invalid query");

  const headers = { "Accept-Encoding": "gzip, deflate, br, zstd" };
  const body = JSON.stringify({
    context: {
      client: {
        hl: "id",
        gl: "ID",
        clientName: "WEB",
        clientVersion: "2.20250701.09.00"
      }
    },
    params: "EgIQAQ%3D%3D",
    query: query
  });

  const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
    headers: headers,
    body: body,
    method: "post"
  });

  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  const json = await response.json();

  const contents = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;

  return contents
    .filter((v) => v && v.videoRenderer && v.videoRenderer.lengthText && v.videoRenderer.lengthText.simpleText)
    .map((v) => {
      const vr = v.videoRenderer;
      const videoId = vr.videoId;
      const thumbs = vr.thumbnail && vr.thumbnail.thumbnails;
      return {
        videoId: videoId,
        title: vr.title.runs[0].text,
        channel: vr.ownerText.runs[0].text,
        url: "https://youtu.be/" + videoId,
        duration: vr.lengthText.simpleText,
        views: vr.viewCountText && vr.viewCountText.simpleText,
        thumbnail: thumbs && thumbs.length ? thumbs[thumbs.length - 1].url : null
      };
    });
}

module.exports = {
  name: "youtube-native-search",
  priority: 1,
  run: async ({ query }) => youtubeSearch(query)
};
