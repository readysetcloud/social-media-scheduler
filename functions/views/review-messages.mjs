// GET /confirmations/{referenceNumber}/messages?token={signedKey}

import Handlebars from "handlebars";
import template from '../../templates/review-messages.hbs';
import styles from '../../templates/styles.handlebars';
import { authenticate, createHashKey, htmlResponse, jsonResponse } from "../utils/helpers.mjs";
import { loadMessages } from "../utils/messages.mjs";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { referenceNumber } = event.pathParameters;
    const error = authenticate(event, referenceNumber);
    if (error) {
      return error;
    }

    const messages = await loadMessages(referenceNumber);
    if (!messages?.length) {
      return htmlResponse(`<html>The requested messages do not exist.</html>`);
    }

    const { Item } = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        pk: { S: referenceNumber },
        sk: { S: 'taskToken' }
      }
    }));

    const token = createHashKey(referenceNumber);
    const data = {
      messages,
      referenceNumber,
      token,
      baseUrl: process.env.BASE_URL,
      requiresApproval: typeof(Item) == 'object'
    };

    const compiledTemplate = configureHbs();
    const html = compiledTemplate(data);

    return htmlResponse(html);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const configureHbs = () => {
  Handlebars.registerPartial('styles', styles);

  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate;
};
