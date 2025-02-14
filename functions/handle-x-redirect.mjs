// GET /x/redirect

import { setParameter } from '@aws-lambda-powertools/parameters/ssm';
import { CacheClient, CacheDictionaryFetchResponse } from "@gomomento/sdk";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "./utils/helpers.mjs";
import { getXAppCredentials } from "./utils/x.mjs";
import { TwitterApi } from "twitter-api-v2";

const cacheClient = new CacheClient({ defaultTtlSeconds: 300 });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { oauth_token, oauth_verifier } = event.queryStringParameters;
    if (!oauth_token || !oauth_verifier) {
      console.error('Request is missing required query string parameters');
      return jsonResponse(400, { message: 'Missing required fields ' });
    }

    let detail = await cacheClient.dictionaryFetch(process.env.CACHE_NAME, oauth_token);
    if (detail.type != CacheDictionaryFetchResponse.Hit) {
      console.warn('Could not find oauth details for request');
      return jsonResponse(400, { message: 'Invalid token' });
    }

    detail = detail.value();
    const creds = await getXAppCredentials();
    creds.accessToken = oauth_token;
    creds.accessSecret = detail.secret;

    const xClient = new TwitterApi(creds);
    const user = await xClient.login(oauth_verifier);
    await saveAccount(detail.tenantId, user.userId, user.screenName);
    await storeCredentials(detail.tenantId, user.userId, user.accessToken, user.accessSecret);

    return jsonResponse(200, { message: 'nice' });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const saveAccount = async (tenantId, accountId, accountName) => {
  await ddb.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: tenantId,
      sk: `account#${accountId}`,
      id: accountId,
      name: accountName,
      platform: 'x',
      created: new Date().toISOString()
    })
  }));
};

const storeCredentials = async (tenantId, accountId, accessToken, accessSecret) => {
  await setParameter(`/social-media/${tenantId}/${accountId}`, {
    value: JSON.stringify({ accessToken, accessSecret }),
    overwrite: true,
    parameterType: 'SecureString'
  });
};
