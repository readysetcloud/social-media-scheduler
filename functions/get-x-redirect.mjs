import { jsonResponse } from "./utils/helpers.mjs";
import { CacheClient } from '@gomomento/sdk';
import { getXClient } from "./utils/x.mjs";

const cacheClient = new CacheClient({ defaultTtlSeconds: 300 });

export const handler = async (event) => {
  try {
    const xClient = await getXClient();
    const auth = await xClient.generateAuthLink(process.env.X_CALLBACK_URL);
    await cacheClient.dictionarySetFields(process.env.CACHE_NAME, auth.oauth_token, {
      tenantId: 'hardcoded',
      secret: auth.oauth_token_secret
    });

    return {
      statusCode: 302,
      headers: {
        'Access-Control-Allow-Origin': '*',
        Location: auth.url
      }
    };
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
