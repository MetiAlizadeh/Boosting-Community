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
    name: 'cancel',
    description: 'Cancel boost',
    aliases: [],
    permissions: null,
  },
  run: async (client, message, args) => {
    const boostId = args[0];
    const reason = args[1];
    
    // Check if boostId and reason are provided
    if (!boostId) {
      return message.reply('Please provide a valid boost ID.');
    }
    if (!reason) {
      return message.reply('Please provide a valid reason.');
    }

    try {
      // Connect to the MongoDB database
      await dbClient.connect();
      const db = dbClient.db('boostingcommunity');
      const ordersCollection = db.collection('orders');
      const categorysCollection = db.collection('categorys');
      const channelsCollection = db.collection('channels');

      // Check if the user is the adv (advertiser) of the boost
      const boostData = await ordersCollection.findOne({ boostId: boostId });
      if (!boostData || boostData.boostadv !== message.author.id) {
        await message.author.send('This is not your boost to cancel.');
        return;
      }

      // Find the Canceled Logs category and move the channel there
      const canceledLogCategoryData = await categorysCollection.findOne({ key: 'canceledLogCategory' });
      if (canceledLogCategoryData && canceledLogCategoryData.categoryId) {
        const canceledLogCategoryId = canceledLogCategoryData.categoryId;
        await message.channel.setParent(canceledLogCategoryId);
      }

      // Find the Canceled Logs channel and send a cancellation message
      const canceledLogChannelData = await channelsCollection.findOne({ key: 'canceledLogChannel' });
      if (canceledLogChannelData && canceledLogChannelData.channelId) {
        const canceledLogChannelId = canceledLogChannelData.channelId;
        const logChannel = client.channels.cache.get(canceledLogChannelId);
        logChannel.send({
          content: `Boost Canceled by ${message.author} - ${message.channel.toString()}`,
        });
      }

      message.reply('Boost cancellation processed, channel moved to Canceled Logs.');
    } catch (error) {
      console.error('Error processing the cancel command:', error);
      message.reply('An error occurred while processing the boost cancellation.');
    } finally {
      await dbClient.close();
    }
  },
};