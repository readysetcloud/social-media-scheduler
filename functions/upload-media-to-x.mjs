import { getTwitterClient } from "./utils/twitter.mjs";

const media = [];

export const handler = async (state) => {
  try {
    const existingMedia = media.find(m => m.fileName == state.image);
    if (existingMedia) return { mediaId: existingMedia.mediaId };

    const imageBuffer = await downloadImage(state.image);
    const client = await getTwitterClient(state.accountId);
    const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' });

    media.push({ fileName: state.image, mediaId });
    return { mediaId };
  }
  catch (err) {
    console.error(JSON.stringify(err));
    throw err;
  }
};

const downloadImage = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
