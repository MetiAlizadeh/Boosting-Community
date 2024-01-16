const { ButtonInteraction, SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ExtendedClient = require('../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
const config = require("../../config");
module.exports = {
    customId: 'cancel-levelup',
    /**
     * 
     * @param {ExtendedClient} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const dbClient = new MongoClient(process.env.MONGODB_URI);
        try {
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const levelUpBoostsCollection = db.collection('boosts');

            // Fetch the boost info based on the message ID
            const messageId = interaction.message.id;
            const boostInfo = await levelUpBoostsCollection.findOne({ boostId: messageId });

            if (boostInfo && boostInfo.advid === interaction.user.id) {
                // If the user is the adv, cancel the boost
                const cancelledEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Boost Cancelled')
                    .setDescription('This boost has been cancelled.');

                await interaction.message.edit({ embeds: [cancelledEmbed], components: [] });
                await interaction.reply({ content: 'Boost cancelled successfully.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'You are not authorized to cancel this boost.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in finish-lvlup interaction:', error);
            await interaction.reply({ content: 'An error occurred.', ephemeral: true });
        } finally {
            await dbClient.close();
        }
    }
};