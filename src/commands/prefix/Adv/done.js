// Import necessary Discord.js and MongoDB modules
const { Message, PermissionFlagBits, Permissions, EmbedBuilder, MessageEmbed } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
const config = require("../../../config");
const dbClient = new MongoClient(process.env.MONGODB_URI);
require('dotenv').config();

module.exports = {
  structure: {
    name: 'done',
    description: 'Finish boost',
    aliases: [],
    permissions: null,
  },
  run: async (client, message, args) => {
    const boostId = args[0];
    
    // Check if a valid boost ID is provided
    if (!boostId) {
      return message.reply('Please provide a valid boost ID.');
    }

    try {
      // Connect to the MongoDB database
      await dbClient.connect();
      const db = dbClient.db('boostingcommunity');
      const membersCollection = db.collection('members');
      const channelsCollection = db.collection('channels');
      const categorysCollection = db.collection('categorys');
      const ordersCollection = db.collection('orders');
      const boostMessage = await message.channel.messages.fetch(boostId);
      const embed = boostMessage.embeds[0];

      // Check if the user is the adv (advertiser) of the boost
      const boostData = await ordersCollection.findOne({ boostId: boostId });
      if (!boostData || boostData.boostadv !== message.author.id) {
        await message.author.send('This is not your boost to finish.');
        return;
      }

      if (!embed) {
        return message.reply('No embed found in the boost message.');
      }

      // Extract booster IDs
      const boosterField = embed.fields.find(field => field.name === 'Boosters');
      if (!boosterField) {
        return message.reply('Boosters field not found in the embed.');
      }
      const boosterIds = boosterField.value.match(/<@!?(\d+)>/g).map(mention => mention.replace(/[<@!>]/g, ''));

      // Extract payment amount for boosters
      const paymentField = embed.fields.find(field => field.name.includes('Booster Cut'));
      if (!paymentField) {
        return message.reply('Booster Cut field not found in the embed.');
      }
      const paymentAmount = parseInt(paymentField.value.replace(/[^\d.]/g, '')) * 1000;

      // Extract Adv information
      const advField = embed.fields.find(field => field.name === '**Adv**');
      console.log(advField)
      if (!advField) {
        return message.reply('Adv field not found in the embed.');
      }
      const advId = advField.value.match(/<@!?(\d+)>/)[1];
      const advCutMatch = advField.value.match(/(\d+)k/);
      if (!advCutMatch) {
        return message.reply('Adv cut information not found in the embed.');
      }
      const advCut = parseInt(advCutMatch[1]) * 1000;

      // Update balances for boosters and adv
      for (const boosterId of boosterIds) {
        await membersCollection.updateOne(
          { memberId: boosterId },
          { $inc: { balance: paymentAmount } }
        );
      }
      await membersCollection.updateOne(
        { memberId: advId },
        { $inc: { balance: advCut } }
      );

      // Move the channel to the Finished Log Category
      const finishedLogCategoryData = await categorysCollection.findOne({ key: 'finishedLogCategory' });
      if (finishedLogCategoryData && finishedLogCategoryData.categoryId) {
        const finishedLogCategoryId = finishedLogCategoryData.categoryId;
        await boostMessage.channel.setParent(finishedLogCategoryId);
      }

      const finishedLogChannelData = await channelsCollection.findOne({ key: 'finishedLogChannel' });
      if (finishedLogChannelData && finishedLogChannelData.channelId) {
        const finishedLogChannelId = finishedLogChannelData.channelId;
        const logChannel = client.channels.cache.get(finishedLogChannelId);
        logChannel.send({
          content: `Boost Completed by ${message.author} - ${message.channel.toString()}`,
        });
      }

      message.reply('Boost completion processed, balances updated, and channel moved to Finished Logs.');
    } catch (error) {
      console.error('Error processing the done command:', error);
      message.reply('An error occurred while processing the boost completion.');
    } finally {
      await dbClient.close();
    }
  },
};