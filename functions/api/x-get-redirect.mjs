import { jsonResponse } from "../utils/helpers.mjs";
import { CacheClient } from '@gomomento/sdk';
import { getXClient } from "../utils/x.mjs";

const cacheClient = new CacheClient({ defaultTtlSeconds: 300 });

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    const name = event.queryStringParameters?.name;
    const xClient = await getXClient();
    const auth = await xClient.generateAuthLink(process.env.X_CALLBACK_URL);
    await cacheClient.dictionarySetFields(process.env.CACHE_NAME, auth.oauth_token, {
      tenantId,
      secret: auth.oauth_token_secret,
      ...name && { name }
    });

    return jsonResponse(200, { loginUrl: auth.url });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
