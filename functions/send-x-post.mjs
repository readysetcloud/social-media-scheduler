import { getOauthHeader, getClient } from "./utils/x.mjs";

const postUrl = 'https://api.twitter.com/2/tweets';
const media = [];

export const handler = async (state) => {
  try {
    let mediaId;
    if (state.image || state.video) {
      mediaId = await uploadMedia(state);
    }

    const oauthHeader = await getOauthHeader(state.accountId, postUrl);

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        text: state.message,
        ...state.mediaId && { media: { media_ids: [state.mediaId] } }
      })
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return { id: data.data.id };
  }
  catch (err) {
    console.error(JSON.stringify(err));
  }
};

const uploadMedia = async () => {
  const existingMedia = media.find(m => (state.image && m.fileName == state.image) || (state.video && m.fileName == state.video));
  if (existingMedia) return existingMedia.mediaId;

  const client = await getClient(state.accountId);

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
