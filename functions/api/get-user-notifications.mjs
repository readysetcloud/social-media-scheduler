import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "../utils/helpers.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const notifications = await getNotifications(tenantId);
    return jsonResponse(200, { notifications });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const getNotifications = async (tenantId) => {
  let notifications = [];
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
        ':sk': 'notification#'
      }),
      ...lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }
    }));

    notifications = notifications.concat(response.Items.map(a => {
      const notification = unmarshall(a);
      return {
        id: notification.sk.split('#')[1],
        date: notification.timestamp,
        message: notification.message,
        isUnread: notification.sort.startsWith('unread#'),
        ...notification.link && { link: notification.link }
      };
    }));

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return notifications;
};
