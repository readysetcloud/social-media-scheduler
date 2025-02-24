import { CacheClient } from "@gomomento/sdk";
import { AuthClient } from "linkedin-api-client";
import { jsonResponse } from "../utils/helpers.mjs";
import crypto from 'crypto';

const cacheClient = new CacheClient({ defaultTtlSeconds: 300 });

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    const name = event.queryStringParameters?.name;

    const authClient = new AuthClient({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      redirectUrl: process.env.CALLBACK_URL
    });

    const id = crypto.randomBytes(16).toString('hex');
    const state = `${process.env.CALLBACK_URL}|${id}`;
    const authUrl = authClient.generateMemberAuthorizationUrl(
      ['openid', 'profile', 'w_member_social', 'email'],
      state
    );

    await cacheClient.dictionarySetFields(process.env.CACHE_NAME, id, {
      tenantId,
      ...name && { name }
    });

    return jsonResponse(200, { loginUrl: authUrl });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
