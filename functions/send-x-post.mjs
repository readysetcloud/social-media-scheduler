import { getTwitterOauthHeader } from "./utils/twitter.mjs";

const postUrl = 'https://api.twitter.com/2/tweets';

export const handler = async (state) => {
  try {
    const oauthHeader = await getTwitterOauthHeader(state.accountId, postUrl);

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

