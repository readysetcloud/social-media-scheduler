import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const ddb = new DynamoDBClient();
const events = new EventBridgeClient();

export const handler = async (event) => {
  try {
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      ConditionExpression: 'attribute_not_exists(pk)',
      Item: marshall({
        pk: event.request.userAttributes.sub,
        sk: 'account',
        name: event.userName,
        createdAt: new Date().toISOString(),
        type: 'account',
        sort: event.userName
      })
    }));

    await events.send(new PutEventsCommand({
      Entries: [
        {
          Detail: JSON.stringify({
            userName: event.userName,
            groupName: process.env.DEFAULT_GROUP_NAME
          }),
          DetailType: 'Add User to Tier',
          Source: 'user-post-confirmation'
        }
      ]
    }));
  } catch (err) {
    console.error('Error processing post-confirmation trigger:', err);
  }

  return event;
};
