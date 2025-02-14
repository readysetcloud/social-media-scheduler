import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import crypto from 'crypto';

let secrets;
let accounts = {};

export const jsonResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    ...body && { body: JSON.stringify(body) }
  };
};

export const htmlResponse = (html) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: html
  };
};

export const getSecretValue = async (key) => {
  if (!secrets) {
    secrets = await getSecret(process.env.SECRET_ID, { transform: 'json' });
  }
  return secrets[key];
};

export const createHashKey = (data) => {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET);
  hmac.update(payload);

  return hmac.digest('hex');
};

export const verifyHashKey = (data, hashKey) => {
  const key = createHashKey(data);

  return key === hashKey;
};

export const authenticate = (event, referenceNumber) => {
  const token = event.queryStringParameters?.token;
  if (!token || !verifyHashKey(referenceNumber, token)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'text/html' },
      body: `<html>You are not authorized to view this page.</html>`
    };
  }
};

export const getAccountKeys = async (tenantId, accountId) => {
  if (!accounts[accountId]) {
    const parameterName = `/social-media/${tenantId}/${accountId}`;
    const keys = await getParameter(parameterName, { decrypt: true, transform: 'json' });
    accounts[accountId] = keys;
  }

  return accounts[accountId];
};
