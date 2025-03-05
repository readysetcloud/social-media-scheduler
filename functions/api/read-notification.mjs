// POST /notifications/{notificationId}/read

import { jsonResponse } from "../utils/helpers.mjs";
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const { notificationId } = event.pathParameters;
    const { follow } = JSON.parse(event.body);

    const notification = await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: `notification#${notificationId}`,
      }),
      ConditionExpression: 'attribute_exists(pk)',
      UpdateExpression: 'SET #status = :read',
      sort: `unread#${notificationId}`,
      ExpressionAttributeNames: {
        '#status': 'sort'
      },
      ExpressionAttributeValues: marshall({
        ':read': `read${notificationId}`
      }),
      ReturnValues: 'ALL_NEW'
    }));

    let response = jsonResponse(204);
    if (notification.Attributes) {
      if (follow && notification.Attributes.link?.S) {
        response = jsonResponse(200, { redirectUrl: notification.Attributes.link.S, isExternal: notification.Attributes.external?.BOOL ?? false});
      }
    }

    return response;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Notification not found' });
    }

    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
