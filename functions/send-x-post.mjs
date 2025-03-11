import { getClient } from "./utils/x.mjs";
const media = [];

export const handler = async (state) => {
  try {
    const client = await getClient(state.tenantId, state.accountId);

    let mediaIds = [];
    if (state.message.media?.length) {
      mediaIds = await uploadMedia(client, state.message.media);
    }

    const response = await client.v2.tweet({
      text: state.message.text,
      ...mediaIds.length && { media: { media_ids: [mediaIds] } }
    });

    if (response.errors?.length) {
      console.error(response.errors);
      throw new Error(response.errors.join(', '));
    }
    console.log(response.data);
    return { id: response.data.id, link: `https://x.com/${state.screenName}/status/${response.data.id}` };
  }
  catch (err) {
    console.error(err);
    throw err;
  }
};

const uploadMedia = async (client, mediaItems) => {
  const mediaIds = [];
  for (const mediaItem of mediaItems) {
    const existingMedia = media.find(m => (mediaItem.fileName == m.fileName));
    if (existingMedia) {
      mediaIds.push(existingMedia.mediaId);
      continue;
    }

    const buffer = await downloadMedia(mediaItem.fileName);
    const mediaId = await client.v1.uploadMedia(buffer, { mimeType: mediaItem.mimeType });

    media.push({ fileName: mediaItem.fileName, mediaId });
  }
  return mediaIds;
};

const downloadMedia = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
