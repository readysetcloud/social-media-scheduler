// GET /notifications/unread

import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "../utils/helpers.mjs";

const topics = new TopicClient({});
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const count = await getUnreadCount(tenantId);
    return jsonResponse(200, { count })
  } catch (err) {
    console.error(err);
  }
};

const getUnreadCount = async (tenantId) => {
  let messageCount = 0;
  let lastEvaluatedKey = null;

  do {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'schedules',
      KeyConditionExpression: '#type = :type AND begins_with(#sort, :sort)',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#sort': 'sort'
      },
      ExpressionAttributeValues: marshall({
        ':type': tenantId,
        ':sort': 'unread#'
      }),
      ...lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }
    }));

    messageCount += response.Count;
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return messageCount;
};
