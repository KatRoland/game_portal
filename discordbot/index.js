require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = process.env.PORT || 3030;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log('Discord bot started!');
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Pong!');
});

app.post('/message', async (req, res) => {
  try {
    const { channelId, message, guildId } = req.body;
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).send('Guild not found');
    }
    console.log(guild)
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).send('Channel not found');
    }
    console.log(channel)
    channel.send(message);
    res.status(200).send('Message sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending message');
  }
});

app.post('/react', async (req, res) => {
  try {
    const { channelId, messageId, emoji, guildId } = req.body;
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).send('Guild not found');
    }
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).send('Channel not found');
    }
    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).send('Message not found');
    }
    await message.react(emoji);
    res.status(200).send('Reacted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error reacting to message');
  }
});

app.post('/deafen', async (req, res) => {
  try {
    const { userIds, guildId } = req.body;
    if (!userIds || !guildId) {
      return res.status(400).send('Missing userIds or guildId');
    }

    console.log(userIds, guildId)
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).send('Guild not found');
    }
    for (const userId of userIds) {
      const member = await guild.members.fetch(userId);
      if (!member) {
        return res.status(404).send(`Member ${userId} not found`);
      }
      await member.voice.setDeaf(true);
    }
    res.status(200).send('Deafened successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deafening member');
  }
});

app.post('/undeafen', async (req, res) => {
  try {
    const { userIds, guildId } = req.body;
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).send('Guild not found');
    }
    for (const userId of userIds) {
      const member = await guild.members.fetch(userId);
      if (!member) {
        return res.status(404).send(`Member ${userId} not found`);
      }
      await member.voice.setDeaf(false);
    }
    res.status(200).send('Undeafened successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error undeafening member');
  }
});

app.listen(port, () => {
  console.log(`Express server: http://localhost:${port}`);
});

client.login(process.env.DISCORD_TOKEN);
