const { Message, PermissionFlagBits, Permissions, EmbedBuilder, MessageEmbed } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
const config = require("../../../config");
require('dotenv').config();

module.exports = {
    structure: {
        name: 'team',
        description: 'team',
        aliases: [],
        permissions: null
    },
    /**
     * @param {ExtendedClient} client 
     * @param {Message} message 
     * @param {[String]} args 
     */
    run: async (client, message, args) => {
        if (args.length < 5) {
            return message.reply('Please provide a valid message ID and four boosters.');
        }
    
        const [messageId, ...boosterTags] = args;
        const boosters = boosterTags.map(tag => message.mentions.users.get(tag.replace(/[<@!>]/g, '')));
        const boosterIds = boosters.map(user => user.id);
    
        const dbClient = new MongoClient(process.env.MONGODB_URI);
        try {
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const ordersCollection = db.collection('orders');
            const categorysCollection = db.collection('categorys');
            const channelsCollection = db.collection('channels');

            // Check if the user is the adv of the boost
            const boostData = await ordersCollection.findOne({ boostId: messageId });
            if (!boostData || boostData.boostadv !== message.author.id) {
                await message.author.send('This is not your boost to edit.');
                return;
            }

            // Update the order in the database
            const updateResult = await ordersCollection.updateOne(
                { boostId: messageId },
                { $set: { boosters: boosterIds } }
            );
    
            if (updateResult.matchedCount === 0) {
                return message.reply('No order found with the given message ID.');
            }
            
            // Fetch the order channel
            const orderChannel = message.guild.channels.cache.get(message.channelId); // Replace with actual channelId if different
            if (!orderChannel) {
                return message.reply('Order channel not found.');
            }
            
            try {
                // Fetch the order message
                const orderMessage = await orderChannel.messages.fetch(messageId);
                if (!orderMessage) {
                    return message.reply('Order message not found.');
                }
            
                const embed = orderMessage.embeds[0]; // Assuming the order details are in the first embed
                if (!embed) {
                    return message.reply('No embed found in the order message.');
                }
            
                // Concatenate booster mentions into one string
                const boosterMentions = boosters.map(booster => `<@${booster.id}>`).join(`\n`);
            
                // Clone the existing embed and add a single field for all boosters
                const updatedEmbed = new EmbedBuilder(embed)
                    .addFields({ name: 'Boosters', value: boosterMentions, inline: true });
            
                await orderMessage.edit({ embeds: [updatedEmbed] });
            } catch (error) {
                console.error('Error fetching or editing the order message:', error);
                message.reply('An error occurred while trying to update the order message.');
            }

            // Send messages to boosters
            boosters.forEach(booster => {
                booster.send(`You joined the boost of ${message.channel.url}`);
            });
    
            message.reply('Boost team updated successfully.');
        } catch (error) {
            console.error('Error updating team:', error);
            message.reply('An error occurred while updating the team.');
        } finally {
            await dbClient.close();
        }
    }
};
