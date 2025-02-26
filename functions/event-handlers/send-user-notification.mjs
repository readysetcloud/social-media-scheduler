import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { TopicClient } from "@gomomento/sdk";
import { ulid } from "ulid";

const topics = new TopicClient({});
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId, message, link } = event.detail;

    const id = ulid();
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: tenantId,
        sk: `notification#${id}`,
        timestamp: new Date().toISOString(),
        type: tenantId,
        sort: `unread#${id}`,
        message,
        ...link && { link },
        ttl: Math.floor((Date.now() / 1000) + 7 * 24 * 60 * 60)
      })
    }));

    const unreadCount = await getUnreadCount(tenantId);
    await topics.publish(process.env.CACHE_NAME, tenantId, JSON.stringify({ type: 'New Notification', count: unreadCount }));
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
