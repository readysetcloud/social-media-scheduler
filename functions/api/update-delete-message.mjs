import { DynamoDBClient, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { authenticate, jsonResponse } from "../utils/helpers.mjs";
import { loadMessages } from "../utils/messages.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { referenceNumber, messageId } = event.pathParameters;
    const error = authenticate(event, referenceNumber);
    if (error) {
      return error;
    }

    const messages = await loadMessages(referenceNumber);
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      return jsonResponse(404, { message: 'Message not found' });
    }

    const httpMethod = event.requestContext.http.method;
    if (httpMethod == 'DELETE') {
      console.log(`Deleting ${message.pk}`);
      await deleteMessage(message.pk);
    } else if (httpMethod == 'PUT') {
      console.log(`Updating ${message.pk}`);
      const input = JSON.parse(event.body);
      await updateMessage(message.pk, input);
    } else {
      console.log(httpMethod);
    }

    return jsonResponse(204);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const updateMessage = async (messageId, input) => {
  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: messageId,
      sk: 'message'
    }),
    UpdateExpression: 'SET #message = :message',
    ExpressionAttributeNames: {
      '#message': 'message'
    },
    ExpressionAttributeValues: marshall({
      ':message': input.message
    })
  }));
};

const deleteMessage = async (messageId) => {
  await ddb.send(new DeleteItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: messageId,
      sk: 'message'
    })
  }));
};
