import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SSMClient, PutParameterCommand, DeleteParameterCommand } from "@aws-sdk/client-ssm";
import { SchedulerClient, DeleteScheduleCommand } from '@aws-sdk/client-scheduler';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "./utils/helpers.mjs";

const ddb = new DynamoDBClient();
const ssm = new SSMClient();
const scheduler = new SchedulerClient();

export const handler = async (event) => {
  try {
    let { accountId } = event.pathParameters;
    accountId = accountId.toLowerCase();
    let account = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: accountId,
        sk: 'account'
      })
    }));

    if (!account.Item) {
      return jsonResponse(404, { message: 'Account not found' });
    } else {
      account = unmarshall(account.Item);
    }

    const data = JSON.parse(event.body);
    await handleTwitterDetails(account, data.twitter);
    await handleLinkedInDetails(account, data.linkedIn);

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: err.message });
  }
};

const handleTwitterDetails = async (account, data) => {
  if (!data) return;
  if (data.removeCredentials) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'REMOVE #twitter',
      ExpressionAttributeNames: {
        '#twitter': 'twitter'
      }
    }));

    await ssm.send(new DeleteParameterCommand({
      Name: `/social-media/${account.pk}/twitter`
    }));
  } else if (data.handle && data.apiKey && data.apiKeySecret && data.accessToken && data.accessTokenSecret) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #twitter.#handle = :handle, #twitter.#status = :status',
      ExpressionAttributeNames: {
        '#twitter': 'twitter',
        '#handle': 'handle',
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':handle': data.handle,
        ':status': 'active'
      })
    }));

    await ssm.send(new PutParameterCommand({
      Name: `/social-media/${account.pk}/twitter`,
      Value: JSON.stringify({
        apiKey: data.apiKey,
        apiKeySecret: data.apiKeySecret,
        accessToken: data.accessToken,
        accessTokenSecret: data.accessTokenSecret,
        bearerToken: data.bearerToken
      }),
      Type: 'SecureString',
      Overwrite: true
    }));
  } else if (account.twitter?.status == 'active' && data.handle && !data.apiKey && !data.apiKeySecret && !data.accessTokenSecret && !data.accessToken && !data.bearerToken) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #twitter.#handle = :handle',
      ExpressionAttributeNames: {
        '#twitter': 'twitter',
        '#handle': 'handle'
      },
      ExpressionAttributeValues: marshall({
        ':handle': data.handle
      })
    }));
  } else if (account.twitter?.status !== 'active' && data.handle) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #twitter.#handle = :handle, #twitter.#status = :status',
      ExpressionAttributeNames: {
        '#twitter': 'twitter',
        '#handle': 'handle',
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':handle': data.handle,
        ':status': 'inactive'
      })
    }));
  }
};

const handleLinkedInDetails = async (account, data) => {
  if (!data) return;

  if (data.removeCredentials) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #linkedIn.#status = :status',
      ExpressionAttributeNames: {
        '#linkedIn': 'linkedIn',
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': 'inactive'
      })
    }));

    await ssm.send(new DeleteParameterCommand({
      Name: `/social-media/${account.pk}/linkedin`
    }));

    try {
      await scheduler.send(new DeleteScheduleCommand({
        Name: `${accountId}-LI-TOKEN`
      }));
    } catch (err) {
      console.warn(err);
    }
  } else {
    const params = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'REMOVE #linkedIn.#organizationId',
      ExpressionAttributeNames: {
        '#linkedIn': 'linkedIn',
        '#organizationId': 'organizationId'
      }
    };

    if (data.organizationId) {
      params.UpdateExpression = 'SET #linkedIn.#organizationId = :organizationId';
      params.ExpressionAttributeValues = marshall({
        ':organizationId': data.organizationId
      });
    }

    await ddb.send(new UpdateItemCommand(params));
  }
};
