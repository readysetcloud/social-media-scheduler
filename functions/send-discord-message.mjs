import { Client, GatewayIntentBits, GuildChannel } from 'discord.js';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getSecretValue } from './utils/helpers.mjs';

const ddb = new DynamoDBClient();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let clientLoggedIn = false;

export const handler = async (state) => {
  try {
    const token = await getSecretValue('discord');
    let account = await getAccount(state.accountId);

    if (!clientLoggedIn) {
      await client.login(token);
      clientLoggedIn = true;
    }

    const channel = await client.channels.fetch(account.discord.channel);
    if (channel) {
      await channel.send(state.message);
      return { id: account.discord.channel };
    } else {
      console.error(`Channel ${discordSecrets.channel} not found`);
    }
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (clientLoggedIn) {
      await client.destroy();
      clientLoggedIn = false;
    }
  }
};

const getAccount = async (accountId) => {
  const account = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: accountId,
      sk: 'account'
    })
  }));
  if (!account.Item) {
    throw new Error('Account not found');
  }
  return unmarshall(account.Item);
};

