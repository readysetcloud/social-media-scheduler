import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import { SchedulerClient, CreateScheduleCommand } from '@aws-sdk/client-scheduler';
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "./utils/helpers.mjs";
import { AuthClient } from "linkedin-api-client";

const ddb = new DynamoDBClient();
const ssm = new SSMClient();
const scheduler = new SchedulerClient();

export const handler = async (event) => {
  try {
    const { code, state } = event.queryStringParameters;
    const [redirectUri, accountId] = state.split('|');

    const keys = await getParameter(`/social-media/${accountId.toLowerCase()}`, { decrypt: true, transform: 'json' });
    const authClient = new AuthClient({
      clientId: keys.linkedInClientId,
      clientSecret: keys.linkedInClientSecret,
      redirectUri
    });

    const token = await authClient.exchangeAuthCodeForAccessToken(code);
    keys.linkedInAccessToken = token.access_token;

    await ssm.send(new PutParameterCommand({
      Name: `/social-media/${accountId.toLowerCase()}`,
      Value: JSON.stringify(keys),
      Type: 'SecureString',
      Overwrite: true
    }));

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall(
        {
          pk: accountId,
          sk: 'account'
        }),
      ConditionExpression: 'attribute_exists(pk)',
      UpdateExpression: 'SET #hasLinkedIn = :hasLinkedIn, #linkedIn.#status = :linkedInStatus',
      ExpressionAttributeNames: {
        '#hasLinkedIn': 'hasLinkedIn',
        '#linkedIn': 'linkedIn',
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':hasLinkedIn': true,
        ':linkedInStatus': 'active'
      })
    }));

    await setupAuthTokenExpirationTimer(token.expires_in);
    return jsonResponse(200, { message: 'Successfully updated LinkedIn credentials' });

  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const setupAuthTokenExpirationTimer = async (accountId, expiresInSeconds) => {
  const expirationDateTimer = new Date();
  expirationDateTimer.setSeconds(expirationDateTimer.getSeconds() + expiresInSeconds - (60 * 60 * 24));

  await scheduler.send(new CreateScheduleCommand({
    Name: `${accountId}-LI-TOKEN`,
    ActionAfterCompletion: 'DELETE',
    FlexibleTimeWindow: {
      Mode: 'OFF'
    },
    GroupName: 'token-expiration',
    Target: {
      Arn: process.env.EXPIRE_LI_CREDENTIALS_STATE_MACHINE,
      RoleArn: process.env.EXPIRE_LI_CREDENTIALS_ROLE,
      Input: JSON.stringify({
        accountId
      })
    },
    ScheduleExpression: `at(${expirationDateTimer.toISOString().split('.')[0]}Z)`,
  }));
};
