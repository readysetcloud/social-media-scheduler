import { Client, GatewayIntentBits } from 'discord.js';
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

    let channelId = account.discord.channel;
    if (state.metadata?.channel) {
      channelId = state.metadata.channel;
    }

    const channel = await client.channels.fetch(channelId);
    if (channel) {
      const message = { content: state.message };
      if (state.metadata?.video) {
        const video = await downloadMedia(state.metadata.video);
        message.files = [{ attachment: video, name: 'clip.mp4' }];
      }

      const response = await channel.send(message);
      return { id: response.id };
    } else {
      console.error(`Channel ${channelId} not found`);
    }
    return { success: false };
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

const downloadMedia = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
