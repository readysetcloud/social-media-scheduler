// GET /accounts

import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { jsonResponse } from "../utils/helpers.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'You are not authorized to get accounts.' });
    }

    const data = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk'
      },
      ExpressionAttributeValues: marshall({
        ':pk': tenantId,
        ':sk': 'account#'
      })
    }));

    let accounts = [];
    if (data.Items?.length) {
      accounts = data.Items.map(account => {
        return {
          id: account.id.S,
          name: account.name.S,
          platform: account.platform.S
        };
      });
    }

    return jsonResponse(200, { accounts });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
