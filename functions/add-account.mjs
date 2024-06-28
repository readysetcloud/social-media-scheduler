import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

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

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: data.id })
    };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Account already exists' })
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Something went wrong' })
      };
    }
  }
};
