const { ChatInputCommandInteraction, SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
const config = require("../../../config");
require('dotenv').config();
const dbClient = new MongoClient(process.env.MONGODB_URI);

module.exports = {
  structure: {
    name: 'levelup',
    description: '',
    aliases: [],
    permissions: null
  },
  run: async (client, message, args) => {
    // Connect to the MongoDB database
    dbClient.connect();

    const db = dbClient.db('boostingcommunity');
    membersCollection = db.collection('members');
    const categorysCollection = db.collection('categorys');
    const channelsCollection = db.collection('channels');
    const rolesCollection = db.collection('roles');
    const levelUpBoostsCollection= db.collection('boosts');
    
    const order = args[1];
    const price = args[0];
    const user = message.author;

    // Check if the user is Adv
    const memberData = await membersCollection.findOne({ memberId: user.id });
    if (!memberData || memberData.isAdv !== 'yes') {
      return message.reply('You are not authorized to use this command.');
    }

    // Fetch the levelupRole ID from MongoDB
    const levelupRoleData = await rolesCollection.findOne({ key: 'levelupRole' });
    if (!levelupRoleData || !levelupRoleData.roleId) {
      return message.reply('Level-up role not set up.');
    }
    const levelupRoleId = levelupRoleData.roleId;

    // Create buttons for the message
    const buttonsRow = createActionRow();

    // Send an initial message with an embed and buttons
    const sentMessage = await message.reply({
      embeds: [createBoostEmbed(user, order, price)],
      components: [buttonsRow],
      content: `<@&${levelupRoleId}> ${user} Levelup ${order}`
    });

    // Get the channel ID for the Level Up Boost Log
    const levelUpLogChannelData = await channelsCollection.findOne({ key: 'levelUpLogChannel' });
    if (levelUpLogChannelData && levelUpLogChannelData.channelId) {
      const levelUpLogChannelId = levelUpLogChannelData.channelId;
      const logChannel = client.channels.cache.get(levelUpLogChannelId);
      // Send a log message
      logChannel.send({
        content: `Boost created by ${message.author} - ${message.channel.toString()}`,
      });
    }

    // Update the message with additional information
    const updatedEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle(`Level Up Boost ${order}`)
      .setThumbnail(process.env.THUMBNAIL)
      .addFields(
        { name: '**Boosters**', value: `-`, inline: true },
        { name: '**Price**', value: `:coin: ${price}K`, inline: true },
        { name: '**Adv**', value: `:bust_in_silhouette: ${user}`, inline: true },
        { name: '**Order**', value: `🗒️ ${order}`, inline: true },
        { name: '**Boost ID**', value: sentMessage.id, inline: true },
      )
      .setFooter({ text: `Developed By M3yt1`, iconURL: user.avatarURL() });

    await sentMessage.edit({ embeds: [updatedEmbed] });

    // Save boost information in MongoDB
    const boostInfo = {
      boostId: sentMessage.id,
      advid: user.id,
      boosters: [], // To be updated later
      order: order,
      price: price
    };
    await levelUpBoostsCollection.insertOne(boostInfo);

    // Manage message timeout and updating boosters in MongoDB
    await manageMessageTimeout(sentMessage, levelUpBoostsCollection);
  },
};

function createActionRow() {
  // Create buttons for the message
  const joinButton = new ButtonBuilder().setCustomId('join-lvlup').setLabel('🎲').setStyle(ButtonStyle.Success);
  const deleteButton = new ButtonBuilder().setCustomId('cancel-levelup').setLabel('Cancel').setStyle(ButtonStyle.Danger);
  return new ActionRowBuilder().addComponents(joinButton, deleteButton);
}

function createBoostEmbed(user, order, price) {
  // Create an embed for the boost message
  return new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle(`Level Up Boost ${order}`)
    .setThumbnail(process.env.THUMBNAIL)
    .addFields(
      { name: '**Boosters**', value: `-`, inline: true },
      { name: '**Price**', value: `:coin: ${price}K`, inline: true },
      { name: '**Adv**', value: `:bust_in_silhouette: ${user}`, inline: true },
      { name: '**Order**', value: `🗒️ ${order}`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `Developed By M3yt1`, iconURL: user.avatarURL() });
}

async function manageMessageTimeout(message) {
    setTimeout(async () => {
        try {
            await message.edit({ components: [] });
        } catch (error) {
            console.error('Error editing message:', error);
        }
    }, 30000);

    message.channel.send('Closing in 30sec').then(msg => {
        setTimeout(() => msg.edit('Order will close in 15 seconds'), 15000);
        setTimeout(() => msg.edit('Order Closed'), 30000);
        setTimeout(() => msg.edit().catch(console.error), 33000);
    });

    // After 30 seconds, fetch and update the boosters field in MongoDB
    setTimeout(async () => {
        try {
            const updatedMessage = await message.channel.messages.fetch(message.id);
            const embed = updatedMessage.embeds[0];
            const boosterField = embed.fields.find(field => field.name === '**Boosters**');
            const dbClient = new MongoClient(process.env.MONGODB_URI);
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const rolesCollection = db.collection('roles');
            const levelUpBoostsCollection = db.collection('levelUpBoosts');

            if (boosterField) {
                const boosterIds = boosterField.value.match(/<@!?(\d+)>/g).map(mention => mention.replace(/[<@!>]/g, ''));

                if (boosterIds) {
                    await levelUpBoostsCollection.updateOne(
                        { boostId: message.id },
                        { $set: { boosters: boosterIds } }
                    );
                }
            }
        } catch (error) {
            console.error('Error updating boosters in MongoDB:', error);
        }
    }, 30000);
}
