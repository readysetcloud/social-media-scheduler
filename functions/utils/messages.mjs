import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient();

export const loadMessages = async (referenceNumber) => {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    IndexName: 'campaigns',
    KeyConditionExpression: 'campaign = :campaign',
    ExpressionAttributeValues: marshall({
      ':campaign': referenceNumber
    })
  }));

  if (Items?.length) {
    const messages = Items.map(item => unmarshall(item));
    return messages;
  }
};
