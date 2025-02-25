// PUT /accounts/{accountId}

import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "../utils/helpers.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    let { accountId } = event.pathParameters;
    const { name } = JSON.parse(event.body);
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: `account#${accountId}`
      }),
      ConditionExpression: 'attribute_exists(pk)',
      UpdateExpression: 'SET #name = :name, #updated = :updated',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#updated': 'lastUpdated'
      },
      ExpressionAttributeValues: marshall({
        ':name': name,
        ':updated': new Date().toISOString()
      })
    }));

    return jsonResponse(204);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { error: err.message });
  }
};
