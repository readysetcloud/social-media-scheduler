//GET /linkedin/redirect

import { setParameter } from '@aws-lambda-powertools/parameters/ssm';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { CacheClient, CacheDictionaryFetchResponse } from "@gomomento/sdk";
import { jsonResponse } from "../utils/helpers.mjs";
import { AuthClient, RestliClient } from "linkedin-api-client";

const ddb = new DynamoDBClient();
const cacheClient = new CacheClient({ defaultTtlSeconds: 300 });

export const handler = async (event) => {
  try {
    const { code, state } = event.queryStringParameters;

    const [redirectUrl, id] = state.split('|');
    let detail = await cacheClient.dictionaryFetch(process.env.CACHE_NAME, id);
    if (detail.type != CacheDictionaryFetchResponse.Hit) {
      console.warn('Could not find oauth details for request');
      return jsonResponse(400, { message: 'Invalid token' });
    }

    detail = detail.value();
    const authClient = new AuthClient({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      redirectUrl
    });

    const token = await authClient.exchangeAuthCodeForAccessToken(code);
    const linkedin = new RestliClient();
    const me = await linkedin.get({
      resourcePath: '/userinfo',
      accessToken: token.access_token
    });

    const expirationDate = new Date(Date.now() + token.expires_in * 1000).toISOString();
    await saveAccount(detail, me.data, expirationDate)
    await storeCredentials(detail.tenantId, me.data.sub, token.access_token);

    const response = jsonResponse(302);
    response.headers.Location = `${process.env.REDIRECT}?selected=${me.data.sub}`;

    return response;
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const saveAccount = async (detail, user, expirationDate) => {
  await ddb.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: detail.tenantId,
      sk: `account#${user.sub}`,
      id: user.sub,
      name: detail.name ?? user.name ?? user.email,
      screenName: user.name ?? user.email,
      platform: 'linkedin',
      expirationDate,
      created: new Date().toISOString()
    })
  }));
};

const storeCredentials = async (tenantId, accountId, accessToken) => {
  await setParameter(`/social-media/${tenantId}/${accountId}`, {
    value: JSON.stringify({ accessToken }),
    overwrite: true,
    parameterType: 'SecureString'
  });
};
