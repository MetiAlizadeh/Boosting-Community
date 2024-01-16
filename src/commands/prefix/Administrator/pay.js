const { Message, PermissionFlagBits, Permissions, ChannelType } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

module.exports = {
    structure: {
      name: 'pay',
      description: 'Pay an amount to another user',
      aliases: [],
      permissions: null,
    },
    run: async (client, message, args) => {
      // Check if the user has Administrator permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('You need administrator permissions to use this command.');
      }
  
      // Extract amount and recipient from command arguments
      const amount = args[0];
      const recipient = message.mentions.users.first();
  
      if (!recipient || isNaN(amount)) {
        return message.reply('Please specify a valid amount and user.');
      }
  
      // Create a MongoDB client
      const dbClient = new MongoClient(process.env.MONGODB_URI);
  
      try {
        // Connect to the MongoDB database
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity');
        const membersCollection = db.collection('members');
        const channelsCollection = db.collection('channels');
  
        // Deduct the specified amount from the recipient's balance
        await membersCollection.updateOne(
          { memberId: recipient.id },
          { $inc: { balance: -Number(amount) } }
        );
  
        // Retrieve the administrator log channel data from MongoDB
        const administratorLogChannelData = await channelsCollection.findOne({ key: 'administratorLogChannel' });
  
        if (administratorLogChannelData && administratorLogChannelData.channelId) {
          const administratorLogChannelId = administratorLogChannelData.channelId;
          const logChannel = client.channels.cache.get(administratorLogChannelId);
  
          // Log the payment transaction
          logChannel.send({
            content: `${message.author} paid ${recipient} ${amount}`,
          });
        }
  
        // Notify the user about the payment
        message.reply(`You have paid $${amount} to ${recipient}`);
      } catch (error) {
        console.error('Error in pay command:', error);
        message.reply('An error occurred.');
      } finally {
        // Close the MongoDB client
        await dbClient.close();
      }
    },
  };