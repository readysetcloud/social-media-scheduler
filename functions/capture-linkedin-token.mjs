import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import { SchedulerClient, CreateScheduleCommand, UpdateScheduleCommand } from '@aws-sdk/client-scheduler';
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse, getSecretValue } from "./utils/helpers.mjs";
import { AuthClient } from "linkedin-api-client";

const ddb = new DynamoDBClient();
const ssm = new SSMClient();
const scheduler = new SchedulerClient();

export const handler = async (event) => {
  try {
    const { code, state } = event.queryStringParameters;
    const [redirectUrl, accountId] = state.split('|');

    const authClient = new AuthClient({
      clientId: await getSecretValue('clientId'),
      clientSecret: await getSecretValue('clientSecret'),
      redirectUrl
    });

    const token = await authClient.exchangeAuthCodeForAccessToken(code);
    console.log(token);
    await ssm.send(new PutParameterCommand({
      Name: `/social-media/${accountId.toLowerCase()}/linkedin`,
      Value: JSON.stringify({ accessToken: token.access_token }),
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
      UpdateExpression: 'SET #linkedIn.#status = :status, #linkedIn.#statusTimestamp = :timestamp',
      ExpressionAttributeNames: {
        '#linkedIn': 'linkedIn',
        '#status': 'status',
        '#statusTimestamp': 'statusTimestamp'
      },
      ExpressionAttributeValues: marshall({
        ':status': 'active',
        ':timestamp': new Date().toISOString()
      })
    }));

    await setupAuthTokenExpirationTimer(accountId, token.expires_in);
    return {
      statusCode: 302,
      headers: {
        Location: `${redirectUrl.split('/v1/')[0]}/v1/accounts/${accountId}`,
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const setupAuthTokenExpirationTimer = async (accountId, expiresInSeconds) => {
  const expirationDateTimer = new Date();
  expirationDateTimer.setSeconds(expirationDateTimer.getSeconds() + expiresInSeconds - (60 * 60 * 24));
  const params = {
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
    ScheduleExpression: `at(${expirationDateTimer.toISOString().split('.')[0]})`,
  };
  try {
    await scheduler.send(new CreateScheduleCommand());
  } catch (err) {
    await scheduler.send(new UpdateScheduleCommand(params));
  }
};
