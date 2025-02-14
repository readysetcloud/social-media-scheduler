import { getClient } from "./utils/x.mjs";
const media = [];

export const handler = async (state) => {
  try {
    const client = await getClient(state.tenantId, state.accountId);

    let mediaId;
    if (state.image || state.video) {
      mediaId = await uploadMedia(client, state);
    }

    const response = await client.v2.tweet({
      text: state.message,
      ...mediaId && { media: { media_ids: [mediaId] } }
    });

    if(response.errors?.length){
      throw new Error(response.errors.join(', '));
    }

    return { id: response.data.id };
  }
  catch (err) {
    console.error(JSON.stringify(err));
  }
};

const uploadMedia = async (client, state) => {
  const existingMedia = media.find(m => (state.image && m.fileName == state.image) || (state.video && m.fileName == state.video));
  if (existingMedia) return existingMedia.mediaId;

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
  return mediaId;
};

const downloadMedia = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
