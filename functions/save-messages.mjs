import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export const handler = async (state) => {
  try {
    if (!state.referenceNumber) {
      console.error('No reference number provided');
      throw new Error('Reference number is required');
    }

    const updatedMessages = state.messages.map((message, index) => ({
      ...message,
      id: `${state.referenceNumber}-${index}`
    }));

    await Promise.all(updatedMessages.map(message =>
      ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall({
          pk: `${state.tenantId}#${state.accountId}#${message.id}`,
          sk: 'message',
          ...message,
          campaign: state.referenceNumber,
          status: 'unscheduled',
          type: `${state.accountId}#${state.platform}`,
          platform: state.platform,
          screenName: state.screenName,
          sort: 'DO_NOT_SEND',
          ttl: Math.floor(Date.now() / 1000 + 25 * 60 * 60) // Set a cleanup date if workflow fails
        })
      }))
    ));

    return { messages: updatedMessages };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

