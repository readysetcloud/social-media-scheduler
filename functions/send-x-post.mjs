import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import CryptoJS from 'crypto-js';

let accounts = {};
const postUrl = 'https://api.twitter.com/2/tweets';

export const handler = async (state) => {
  try {
    let keys = await getAccountKeys(state.accountId);
    if (typeof keys == 'string') {
      keys = JSON.parse(keys);
    }
    if (!keys.xApiKey || !keys.xApiKeySecret) {
      const err = 'Required secrets not found [xApiKey, xApiKeySecret]';
      delete accounts[state.accountId];
      console.error(err);
      throw new Error(err);
    }

    if (!keys.xBearerToken) {
      keys.xBearerToken = await getBearerToken(keys.xApiKey, keys.xApiKeySecret);
    }

    const oauthHeader = getOauthHeader(keys);

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ text: state.message })
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return { id: data.data.id };
  }
  catch (err) {
    console.error(JSON.stringify(err));
  }
};

const getBearerToken = async (apiKey, apiKeySecret) => {
  const response = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(apiKey + ':' + apiKeySecret).toString('base64'),
      'Content-type': 'application/x-www-form-urlencoded; charset: utf-8'
    },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) throw new Error(`HTTP error getting auth token! Status: ${response.status}`);
  const data = await response.json();
  return data.access_token;
};

const getOauthHeader = (keys) => {
  const oauth_consumer_key = keys.xApiKey;
  const oauth_consumer_secret = keys.xApiKeySecret;
  const oauth_token = keys.xAccessToken;
  const oauth_secret = keys.xAccessTokenSecret;
  const oauth_signing_key = `${oauth_consumer_secret}&${oauth_secret}`;

  const oauthParams = {
    oauth_consumer_key: oauth_consumer_key,
    oauth_token: oauth_token,
    oauth_nonce: getOauthNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
    oauth_timestamp: Math.round((new Date()).getTime() / 1000)
  };

  const oauthAuthHeader = Object.assign({}, oauthParams);
  const oauthParamsOrdered = {};
  Object.keys(oauthParams).sort().forEach(function (key) {
    oauthParamsOrdered[key] = oauthParams[key];
  });

  const oauth_parameter_string = toArray(oauthParamsOrdered).join('&');
  const oauth_base_string = `POST&${encodeURIComponent(postUrl)}&${encodeURIComponent(oauth_parameter_string)}`;
  const oauth_signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(oauth_base_string, oauth_signing_key));
  oauthAuthHeader.oauth_signature = encodeURIComponent(oauth_signature);

  const oauth_authorization_header = toArray(oauthAuthHeader).join(', ');
  return `OAuth ${oauth_authorization_header}`;
};

const toArray = (object) => {
  let array = [];
  Object.keys(object).forEach(key => {
    array.push(`${key}=${object[key]}`);
  });
  return array;
};

const getOauthNonce = () => {
  const random_source = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let oauth_nonce = '';
  for (let i = 0; i < 32; i++) {
    oauth_nonce += random_source.charAt(Math.floor(Math.random() * random_source.length));
  }
  const oauth_nonce_array = CryptoJS.enc.Utf8.parse(oauth_nonce);
  return encodeURIComponent(CryptoJS.enc.Base64.stringify(oauth_nonce_array));
};

const getAccountKeys = async (accountId) => {
  if (!accounts.accountId) {
    const parameterName = `/social-media/${accountId}`;
    const keys = await getParameter(parameterName, { decrypt: true, transform: 'json' });
    accounts.accountId = keys;
  }

  return accounts.accountId;
};
