import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { jsonResponse } from "./utils/helpers.mjs";

const ddb = new DynamoDBClient();
const lambda = new LambdaClient();

export const handler = async (event) => {
  try {
    let { accountId } = event.pathParameters;
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

    const data = JSON.parse(event.body);
    let url;
    switch (data.platform) {
      case 'twitter':
        url = await sendTweet(account, data.message);
        break;
      case 'linkedIn':
        url = await sendLinkedInPost(account, data.message);
        break;
      default:
        return jsonResponse(400, { message: 'Invalid platform selection' });
    }

    if (url) {
      return jsonResponse(201, { url });
    } else {
      return jsonResponse(409, { message: 'Unable to send post on selected platform' });
    }
  } catch (err) {
    console.error(err);
    return jsonResponse(500, { message: 'Something went wrong' });
  }
};

const sendTweet = async (account, message) => {
  if (account.twitter?.status == 'active') {
    const response = await lambda.send(new InvokeCommand({
      FunctionName: process.env.SEND_TWITTER_POST_ARN,
      Payload: JSON.stringify({
        accountId: account.pk,
        message
      })
    }));

    const data = JSON.parse(Buffer.from(response.Payload).toString());
    return `https://x.com/${account.twitter.handle}/status/${data.id}`;
  }
};

const sendLinkedInPost = async (account, message) => {
  if (account?.linkedIn?.status == 'active') {
    const response = await lambda.send(new InvokeCommand({
      FunctionName: process.env.SEND_LINKEDIN_POST_ARN,
      Payload: JSON.stringify({
        accountId: account.pk,
        message
      })
    }));
    const data = JSON.parse(Buffer.from(response.Payload).toString());
    return `https://linkedin.com/posts/${data.url}`;
  }
};
