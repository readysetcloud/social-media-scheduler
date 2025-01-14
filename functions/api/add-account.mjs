// POST /accounts

import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jsonResponse } from '../utils/helpers.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      ConditionExpression: 'attribute_not_exists(pk)',
      Item: marshall({
        pk: data.id.toLowerCase(),
        sk: 'account',
        name: data.name,
        createdAt: new Date().toISOString(),
        type: 'account',
        sort: data.name,
        twitter: {},
        linkedIn: {},
        discord: {}
      })
    }));

    return jsonResponse(201, { id: data.id });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return jsonResponse(409, { error: 'Account already exists' });
    } else {
      return jsonResponse(500, { error: 'Something went wrong' });
    }
  }
};
