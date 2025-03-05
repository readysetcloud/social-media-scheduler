// DELETE /notifications/{notificationId}

import { jsonResponse } from "../utils/helpers.mjs";
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const { notificationId } = event.pathParameters;
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: `notification#${notificationId}`,
      })
    }));

    return jsonResponse(204);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
