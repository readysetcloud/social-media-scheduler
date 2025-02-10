// GET /confirmations/{referenceNumber}?token={token}
// this is a GET instead of a POST because it can be triggered via an email

import { DynamoDBClient, GetItemCommand, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { SFNClient, SendTaskSuccessCommand } from '@aws-sdk/client-sfn';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { authenticate, htmlResponse, jsonResponse } from "../utils/helpers.mjs";

const ddb = new DynamoDBClient();
const sfn = new SFNClient();

export const handler = async (event) => {
  try {
    const { referenceNumber } = event.pathParameters;
    const error = authenticate(event, referenceNumber);
    if (error) {
      return error;
    }

    const { Items } = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'campaigns',
      KeyConditionExpression: 'campaign = :campaign',
      ExpressionAttributeValues: marshall({
        ':campaign': referenceNumber
      })
    }));

    if (!Items?.length) {
      return jsonResponse(404, { message: 'No messages are found for the provided reference number' });
    }

    const messages = Items.map(item => unmarshall(item));
    const { Item } = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: referenceNumber,
        sk: 'taskToken'
      })
    }));

    if (!Item) {
      return jsonResponse(404, { message: 'Scheduling process with the provided reference number was not found' });
    };

    await sfn.send(new SendTaskSuccessCommand({
      taskToken: Item.taskToken.S,
      output: JSON.stringify(messages)
    }));

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: referenceNumber,
        sk: 'taskToken'
      })
    }));

    return htmlResponse(`<html><body>👍</body></html>`);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
