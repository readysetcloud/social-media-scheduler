import { getTwitterClient } from "./utils/twitter.mjs";

const media = [];

export const handler = async (state) => {
  try {
    const existingMedia = media.find(m => (state.image && m.fileName == state.image) || (state.video && m.fileName == state.video));
    if (existingMedia) return { mediaId: existingMedia.mediaId };

    const client = await getTwitterClient(state.accountId);

    let buffer;
    let mimeType;
    if (state.image) {
      buffer = await downloadMedia(state.image);
      mimeType = 'image/png';
    } else if (state.video) {
      buffer = await downloadMedia(state.video);
      mimeType = 'video/mp4';
    }
    const mediaId = await client.v1.uploadMedia(buffer, { mimeType });

    media.push({ fileName: state.image, mediaId });
    return { mediaId };
  }
  catch (err) {
    console.error(JSON.stringify(err));
    throw err;
  }
};

const downloadMedia = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
