const { Message, PermissionFlagBits, Permissions } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    structure: {
      name: 'change',
      description: 'Change a specific channel',
      aliases: ['c'],
      permissions: null,
    },
    run: async (client, message, args) => {
      // Check if the user has Administrator permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('You need administrator permissions to use this command.');
      }
  
      // Extract channel key and new channel from command arguments
      const channelKey = args[0];
      const newChannel = message.mentions.channels.first();
  
      if (!newChannel) {
        return message.reply('Please tag a valid channel.');
      }
  
      // Define valid channel keys
      const validKeys = ['rioChannel', 'attendanceChannel', 'bankChannel', 'levelUpChannel', 'verifyLogChannel', 'mplusLogChannel', 'canceledLogChannel', 'finishedLogChannel'];
      if (!validKeys.includes(channelKey)) {
        return message.reply('Invalid channel key. Please provide a valid key.');
      }
  
      // Create a MongoDB client
      const dbClient = new MongoClient(process.env.MONGODB_URI);
  
      try {
        // Connect to the MongoDB database
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity'); // Replace with your database name
        const channelsCollection = db.collection('channels');
  
        // Update the specified channel in the database
        await channelsCollection.updateOne(
          { key: channelKey },
          { $set: { channelId: newChannel.id } },
          { upsert: true }
        );
  
        // Notify the user about the channel change
        message.reply(`Channel for key \`${channelKey}\` has been updated to ${newChannel}`);
      } catch (error) {
        console.error('Error updating channel in DB:', error);
        message.reply('An error occurred while updating the channel.');
      } finally {
        // Close the MongoDB client
        await dbClient.close();
      }
    },
  };