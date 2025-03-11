import { getAccountKeys } from './utils/helpers.mjs';

export const handler = async (state) => {
  try {
    const keys = await getAccountKeys(state.tenantId, state.accountId);

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author: `urn:li:person:${state.accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              attributes: [],
              text: state.message.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });

    const id = response.headers.get('x-linkedin-id');

    return { id, link: `https://linkedin.com/feed/update/${id}` };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
