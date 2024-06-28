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
    const account = await getAccount(accountId);
    if (!account) {
      return jsonResponse(404, { message: 'Account not found' });
    }

    const data = JSON.parse(event.body);
    await handleTwitterDetails(account, data.twitter);
    await handleLinkedInDetails(account, data.linkedIn);
    await handleDiscordDetails(account, data.discord);

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: err.message });
  }
};

const getAccount = async (accountId) => {
  const response = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({ pk: accountId.toLowerCase(), sk: 'account' })
  }));

  return response.Item ? unmarshall(response.Item) : null;
};

const handleTwitterDetails = async (account, data) => {
  if (!data) return;
  const twitter = {
    ...account,
    ...data
  };
  console.log('editing twitter');
  if (data.removeCredentials) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #twitter.#status = :status',
      ExpressionAttributeNames: {
        '#twitter': 'twitter'
      },
      ExpressionAttributeValues: marshall({
        ':status': 'inactive'
      })
    }));

    await ssm.send(new DeleteParameterCommand({
      Name: `/social-media/${account.pk}/twitter`
    }));
  } else if (twitter.handle && twitter.apiKey && twitter.apiKeySecret && twitter.accessToken && twitter.accessTokenSecret) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: account.pk,
        sk: account.sk
      }),
      UpdateExpression: 'SET #twitter = :twitter',
      ExpressionAttributeNames: {
        '#twitter': 'twitter'
      },
      ExpressionAttributeValues: marshall({
        ':twitter': {
          handle: twitter.handle,
          status: 'active',
        }
      })
    }));

    await ssm.send(new PutParameterCommand({
      Name: `/social-media/${account.pk}/twitter`,
      Value: JSON.stringify({
        apiKey: twitter.apiKey,
        apiKeySecret: twitter.apiKeySecret,
        accessToken: twitter.accessToken,
        accessTokenSecret: twitter.accessTokenSecret,
        bearerToken: twitter.bearerToken
      }),
      Type: 'SecureString',
      Overwrite: true
    }));
  } else if (twitter.status == 'active' && twitter.handle && !twitter.apiKey && !twitter.apiKeySecret && !twitter.accessTokenSecret && !twitter.accessToken && !twitter.bearerToken) {
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
  console.log('editing linkedin');
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

const handleDiscordDetails = async (account, data) => {
  if (!data) return;

  console.log('editing discord');
  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: account.pk,
      sk: account.sk
    }),
    UpdateExpression: 'SET #discord = :discord',
    ExpressionAttributeNames: {
      '#discord': 'discord'
    },
    ExpressionAttributeValues: marshall({
      ':discord': {
        channel: data.channel
      }
    })
  }));

};
