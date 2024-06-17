import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AuthClient } from "linkedin-api-client";
import { jsonResponse, getSecretValue } from "./utils/helpers.mjs";

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    let { accountId } = data;
    accountId = accountId.toLowerCase();

    let account = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: accountId,
        sk: 'account'
      })
    }));

    if (!account.Item) {
      return jsonResponse(404, { message: 'Account not found' });
    } else {
      account = unmarshall(account.Item);
    }

    if (!account.linkedIn?.organizationId) {
      return jsonResponse(409, { message: 'Account not setup for LinkedIn' });
    }

    const origin = event.headers.origin ?? event.headers.Origin;
    const redirectUrl = `${origin}/v1/linkedin/redirect`;
    console.log(redirectUrl);
    const authClient = new AuthClient({
      clientId: await getSecretValue('clientId'),
      clientSecret: await getSecretValue('clientSecret'),
      redirectUrl
    });

    const authUrl = authClient.generateMemberAuthorizationUrl(['w_member_social'], `${redirectUrl}|${accountId}`);
    return jsonResponse(200, { url: authUrl });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};
