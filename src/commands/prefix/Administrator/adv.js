const { Message, PermissionFlagBits, Permissions } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
module.exports = {
  structure: {
    name: 'adv',
    description: 'Add or remove advertisers',
    aliases: [],
    permissions: null,
  },
  run: async (client, message, args) => {
    // Check if the user has Administrator permissions
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('You need administrator permissions to use this command.');
    }

    // Extract action and tagged user from command arguments
    const action = args[0];
    const taggedUser = message.mentions.users.first();
    if (!taggedUser) {
      return message.reply('Please tag a valid user.');
    }

    // Check if the action is 'add' or 'remove'
    if (!['add', 'remove'].includes(action)) {
      return message.reply('Invalid action. Please use add or remove.');
    }

    // Create a MongoDB client
    const dbClient = new MongoClient(process.env.MONGODB_URI);

    try {
      // Connect to the MongoDB database
      await dbClient.connect();
      const db = dbClient.db('boostingcommunity');
      const membersCollection = db.collection('members');
      const updateValue = action === 'add' ? 'yes' : 'no';

      // Update user's 'isAdv' field in the database
      await membersCollection.updateOne(
        { memberId: taggedUser.id },
        { $set: { isAdv: updateValue } },
        { upsert: true }
      );

      // Notify the user about the action
      message.reply(`User ${taggedUser.username} has been ${action === 'add' ? 'added to' : 'removed from'} the adv list.`);
    } catch (error) {
      console.error('Error updating user status:', error);
      message.reply('An error occurred while updating the user status.');
    } finally {
      // Close the MongoDB client
      await dbClient.close();
    }
  },
};