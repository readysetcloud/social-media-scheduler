import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
const cognito = new CognitoIdentityProviderClient();

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

    await cognito.send(new AdminAddUserToGroupCommand({
      GroupName: process.env.DEFAULT_GROUP_NAME,
      UserPoolId: event.userPoolId,
      Username: event.userName
    }));
  } catch (err) {
    console.error('Error processing post-confirmation trigger:', err);
  }

  return event;
};
