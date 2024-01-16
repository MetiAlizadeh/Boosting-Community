const { Message, PermissionFlagBits, Permissions, ChannelType } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');


module.exports = {
    structure: {
      name: 'setup',
      description: 'Set up the bot in the server',
      aliases: ['s'],
      permissions: null,
    },
    run: async (client, message, args) => {
      // Check if the user has Administrator permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('You do not have permission to use this command.');
      }
  
      // Define categories, roles, and channels to create
      const categoriesToCreate = [
        { name: 'General', key: 'generalCategory' },
        { name: 'LOGS', key: 'generalLogsCategory' },
        { name: 'canceled-orders', key: 'canceledLogCategory' },
        { name: 'finished-orders', key: 'finishedLogCategory' },
        { name: 'attendance', key: 'attendanceCategory' },
      ];
  
      const rolesToCreate = [
        { name: 'level up booster', key: 'levelupRole' },
        { name: 'mythic booster', key: 'mBoosterRole' },
        // Add more roles as needed
      ];
  
      const channelsToCreate = [
        { name: 'get-mplus-role', key: 'rioChannel' },
        { name: 'attendance', key: 'attendanceChannel' },
        { name: 'Bank', key: 'bankChannel' },
        { name: 'levelUp', key: 'levelUpChannel' },
        // Add more channels as needed
      ];
  
      const dbClient = new MongoClient(process.env.MONGODB_URI);
  
      try {
        // Connect to the MongoDB database
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity'); // Replace with your database name
        const categoryCollection = db.collection('categories');
        const rolesCollection = db.collection('roles');
        const channelsCollection = db.collection('channels');
        const membersCollection = db.collection('members');
  
        let generalLogsCategoryId;
        let attendanceCategoryId;
        let generalCategoryId;
  
        // Create categories and store in the database
        for (const category of categoriesToCreate) {
          const createdCategory = await message.guild.channels.create({
            name: category.name,
            type: 4, // Category type
            reason: 'Category created by setup command',
          });
  
          await categoryCollection.updateOne(
            { key: category.key },
            { $set: { categoryId: createdCategory.id } },
            { upsert: true }
          );
  
          if (category.key === 'generalLogsCategory') {
            generalLogsCategoryId = createdCategory.id;
          }
  
          if (category.key === 'attendanceCategory') {
            attendanceCategoryId = createdCategory.id;
          }
  
          if (category.key === 'generalCategory') {
            generalCategoryId = createdCategory.id;
          }
        }
  
        // Create roles and store in the database
        for (const role of rolesToCreate) {
          const createdRole = await message.guild.roles.create({
            name: role.name,
            reason: 'Role created by setup command',
          });
  
          await rolesCollection.updateOne(
            { key: role.key },
            { $set: { roleId: createdRole.id } },
            { upsert: true }
          );
        }
  
        // Add members to the database
        const members = await message.guild.members.fetch();
        for (const member of members.values()) {
          await membersCollection.updateOne(
            { memberId: member.id },
            {
              $set: {
                memberRole: member.roles.cache.map((r) => r.id),
                isAdv: 'no',
                balance: 0,
              },
            },
            { upsert: true }
          );
        }
  
        // Create channels and store in the database
        for (const channel of channelsToCreate) {
          const createdChannel = await message.guild.channels.create({
            name: channel.name,
            reason: 'Channel created by setup command',
          });
  
          await channelsCollection.updateOne(
            { key: channel.key },
            { $set: { channelId: createdChannel.id } },
            { upsert: true }
          );
        }
  
        // Move specific channels to their respective categories
        const logChannelsToMove = ['verifyLogChannel', 'mplusLogChannel', 'canceledLogChannel', 'finishedLogChannel'];
        for (const channelKey of logChannelsToMove) {
          const channelData = await channelsCollection.findOne({ key: channelKey });
          if (channelData && channelData.channelId) {
            const channelToMove = message.guild.channels.cache.get(channelData.channelId);
            if (channelToMove) {
              if (channelKey === 'verifyLogChannel') {
                await channelToMove.setParent(generalLogsCategoryId);
              } else {
                await channelToMove.setParent(generalCategoryId);
              }
            }
          }
        }
  
        const attendanceChannelsToMove = ['attendanceChannel', 'levelUpChannel'];
        for (const channelKey of attendanceChannelsToMove) {
          const channelData = await channelsCollection.findOne({ key: channelKey });
          if (channelData && channelData.channelId) {
            const channelToMove = message.guild.channels.cache.get(channelData.channelId);
            if (channelToMove) {
              await channelToMove.setParent(attendanceCategoryId);
            }
          }
        }
  
        // Notify the user about the successful setup
        message.reply('Setup completed successfully.');
      } catch (error) {
        console.error(error);
        message.reply('An error occurred during the setup.');
      } finally {
        await dbClient.close();
      }
    },
};