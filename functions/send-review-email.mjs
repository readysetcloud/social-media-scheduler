import Handlebars from "handlebars";
import template from '../templates/review-email.hbs';
import { loadMessages } from "./utils/messages.mjs";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { createHashKey } from "./utils/helpers.mjs";

const ddb = new DynamoDBClient();
const events = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { referenceNumber, taskToken, contact } = event.detail;

    const messages = await loadMessages(referenceNumber);
    if (!messages?.length) {
      console.error(`There were no messages found for '${referenceNumber}`);
      return;
    }

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: referenceNumber,
        sk: 'taskToken',
        taskToken,
        ttl: Math.floor(Date.now() / 1000 + 24 * 60 * 60)
      })
    }));

    const token = createHashKey(referenceNumber);
    const data = {
      referenceNumber,
      token,
      messages,
      baseUrl: process.env.BASE_URL
    };
    const compiledTemplate = Handlebars.compile(template);
    const html = compiledTemplate(data);

    await events.send(new PutEventsCommand({
      Entries: [
        {
          Detail: JSON.stringify({
            to: contact,
            subject: '[REVIEW] New Social Media Messages',
            html
          }),
          DetailType: "Send Email",
          Source: "social-scheduler"
        }
      ]
    }));
  } catch (err) {
    console.error(err);
  }
};
