import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "../utils/helpers.mjs";
import short from 'short-uuid';

const ddb = new DynamoDBClient();
const events = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const body = JSON.parse(event.body);

    const sendAtTime = validateSendAtTime(body.sendAt);
    if (!sendAtTime) {
      return jsonResponse(400, { message: 'sendAt is not valid. Please select a future date, "now", or "auto".' });
    }

    const accounts = await loadAccounts(tenantId, body.accounts);
    if (!accounts?.length) {
      return jsonResponse(400, { message: 'No valid accounts were provided' });
    }

    const accountMessageMap = [];
    const messages = accounts.map(account => {
      const referenceNumber = short.generate();
      accountMessageMap.push({ account: account.id, referenceNumber });
      return {
        Source: 'post-message-user',
        DetailType: 'Schedule Social Post',
        Detail: JSON.stringify({
          tenantId,
          accountId: account.id,
          referenceNumber,
          messages: [{
            message: body.message,
            sendAt: sendAtTime
          }]
        })
      };
    });

    await events.send(new PutEventsCommand({
      Entries: messages
    }));

    return jsonResponse(202, { pending: accountMessageMap });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const loadAccounts = async (tenantId, accountIds) => {
  let accounts = [];
  let lastEvaluatedKey = null;

  do {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk'
      },
      ExpressionAttributeValues: marshall({
        ':pk': tenantId,
        ':sk': 'account#'
      }),
      ...lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }
    }));

    accounts = accounts.concat(response.Items.map(a => unmarshall(a)));

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return accounts.filter(a => accountIds.includes(a.id));
};

const validateSendAtTime = (sendAt) => {
  const sendAtTime = sendAt.toLowerCase();
  if (sendAtTime == 'now' || sendAtTime == 'auto') {
    return sendAtTime;
  }

  const date = new Date(sendAt);
  if (isNaN(date.getTime())) {
    return;
  }

  if (date > new Date()) {
    return date.toISOString().slice(0, 19);
  }
};
