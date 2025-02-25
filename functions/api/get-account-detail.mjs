import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { jsonResponse } from '../utils/helpers.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const { accountId } = event.pathParameters;
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: `account#${accountId}`
      })
    }));

    if (!response.Item) {
      return jsonResponse(404, { message: 'Account not found' });
    }

    const accountItem = unmarshall(response.Item);
    const account = {
      id: accountItem.id,
      name: accountItem.name,
      platform: accountItem.platform,
      createdDate: accountItem.created,
      screenName: accountItem.screenName,
      ...accountItem.expirationDate && { expires: accountItem.expirationDate }
    };

    return jsonResponse(200, account);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
