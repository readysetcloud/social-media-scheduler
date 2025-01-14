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
          pk: `${state.accountId}#${message.id}`,
          sk: 'message',
          ...message,
          campaign: state.referenceNumber
        })
      }))
    ));

    return { messages: updatedMessages };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

