import { TwitterApi } from "twitter-api-v2";
import { getAccountKeys } from './helpers.mjs';

export const getXAppCredentials = async () => {
  let keys = await getAccountKeys('readysetcloud', 'twitter');
  keys = JSON.parse(keys);

  return { appKey: keys.apiKey, appSecret: keys.appSecret };
};

export const getXClient = async () => {
  const credentials = await getXAppCredentials();

  const client = new TwitterApi(credentials);
  return client;
};

export const getClient = async (tenantId, accountId) => {
  const keys = await getAccountKeys(tenantId, accountId);
  const creds = await getXAppCredentials();
  const twitterClient = new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: keys.accessToken,
    accessSecret: keys.accessSecret
  });

  return await twitterClient.readWrite;
};
