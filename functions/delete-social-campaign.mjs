import { DynamoDBClient, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { SchedulerClient, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
const scheduler = new SchedulerClient();

export const handler = async (event) => {
  try {
    let { accountId, campaign } = event.detail;
    const data = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'campaigns',
      KeyConditionExpression: '#campaign = :campaign',
      ExpressionAttributeNames: {
        '#campaign': 'campaign'
      },
      ExpressionAttributeValues: marshall({
        ':campaign': `${accountId}#${campaign}`
      })
    }));

    const items = data.Items.map(item => unmarshall(item));
    for (const item of items) {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: item.pk,
          sk: item.sk
        })
      }));

      try {
        await scheduler.send(new DeleteScheduleCommand({
          Name: `${item.accountId}#${item.platform}#${item.pk}`,
          GroupName: 'social'
        }));
      } catch (err) {
        console.warn(err);
      }
    }
  } catch (error) {
    console.error(error);
  }
};
