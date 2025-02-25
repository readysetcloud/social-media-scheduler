import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DeleteParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { jsonResponse } from "../utils/helpers.mjs";

const ddb = new DynamoDBClient();
const ssm = new SSMClient();
const events = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const tenantId = event.requestContext.authorizer.claims.sub;
    if (!tenantId) {
      return jsonResponse(403, { message: 'Unauthorized' });
    }

    const { accountId } = event.pathParameters;
    try {
      await ssm.send(new DeleteParameterCommand({
        Name: `/social-media/${tenantId}/${accountId}`
      }));
    } catch (err) {
      if (err.name != 'ParameterNotFound') {
        throw err;
      }
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: `account#${accountId}`
      })
    }));

    await events.send(new PutEventsCommand({
      Entries: [{
        Source: 'delete-account',
        DetailType: 'Delete Account',
        Detail: JSON.stringify({
          tenantId,
          accountId
        })
      }]
    }));

    return jsonResponse(204);
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
