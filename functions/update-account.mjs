import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "./utils/helpers.mjs";

const ddb = new DynamoDBClient();
const ssm = new SSMClient();

export const handler = async (event) => {
  try {
    let { accountId } = event.pathParameters;
    accountId = accountId.toLowerCase();
    const data = JSON.parse(event.body);
    const hasTwitter = data.twitterApiKey && data.twitterApiKeySecret && data.twitterAccessToken && data.twitterAccessTokenSecret;
    const hasLinkedIn = data.linkedinAccessToken && data.linkedInSecretKey;

    try {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: accountId,
          sk: 'account'
        }),
        ConditionExpression: 'attribute_exists(pk)',
        UpdateExpression: 'SET #hasTwitter = :hasTwitter, #hasLinkedIn = :hasLinkedIn',
        ExpressionAttributeNames: {
          '#hasTwitter': 'hasTwitter',
          '#hasLinkedIn': 'hasLinkedIn'
        },
        ExpressionAttributeValues: marshall({
          ':hasTwitter': hasTwitter,
          ':hasLinkedIn': hasLinkedIn
        })
      }));
    } catch (err) {
      console.warn(err);
      return jsonResponse(404, { message: 'Account not found' });
    }

    await ssm.send(new PutParameterCommand({
      Name: `/social-media/${accountId}`,
      Value: JSON.stringify({
        xApiKey: data.twitterApiKey,
        xApiKeySecret: data.twitterApiKeySecret,
        xAccessToken: data.twitterAccessToken,
        xAccessTokenSecret: data.twitterAccessTokenSecret,
        xBearerToken: data.twitterBearerToken
      }),
      Type: 'SecureString',
      Overwrite: true
    }));

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: err.message });
  }
};
