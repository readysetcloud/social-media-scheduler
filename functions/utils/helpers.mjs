import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

let secrets;

export const jsonResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
};

export const getSecretValue = async (key) => {
  if (!secrets) {
    secrets = await getSecret(process.env.SECRET_ID, { transform: 'json' });
  }
  return secrets[key];
};
