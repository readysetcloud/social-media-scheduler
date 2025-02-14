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
  let keys = await getAccountKeys(tenantId, accountId);
  const twitterClient = new TwitterApi({
    appKey: keys.apiKey,
    appSecret: keys.apiKeySecret,
    accessToken: keys.accessToken,
    accessSecret: keys.accessTokenSecret
  }, {});

  return await twitterClient.readWrite;
};
