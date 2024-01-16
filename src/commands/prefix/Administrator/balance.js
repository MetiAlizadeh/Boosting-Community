const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
require('dotenv').config();
module.exports = {
    structure: {
      name: 'balance',
      description: 'Check your balance',
      aliases: [],
      permissions: null,
    },
    run: async (client, message, args) => {
      // Create a MongoDB client
      const dbClient = new MongoClient(process.env.MONGODB_URI);
  
      try {
        // Connect to the MongoDB database
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity');
        const channelsCollection = db.collection('channels');
  
        // Retrieve bank channel data from MongoDB
        const bankChannelData = await channelsCollection.findOne({ key: 'bankChannel' });
        if (!bankChannelData || !bankChannelData.channelId) {
          return message.reply('Bank channel not set up.');
        }
  
        // Get the bank channel from the guild
        const bankChannelId = bankChannelData.channelId;
        const bankChannel = message.guild.channels.cache.get(bankChannelId);
  
        // Create an embed and a balance button
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription('See your Balance');
  
        const balanceButton = new ButtonBuilder()
          .setCustomId('check-balance')
          .setLabel('Balance')
          .setStyle(ButtonStyle.Primary);
  
        // Create a row with the balance button
        const row = new ActionRowBuilder().addComponents(balanceButton);
  
        // Send the embed with the balance button to the bank channel
        await bankChannel.send({ embeds: [embed], components: [row] });
      } catch (error) {
        console.error('Error in balance command:', error);
        message.reply('An error occurred.');
      } finally {
        // Close the MongoDB client
        await dbClient.close();
      }
    },
  };