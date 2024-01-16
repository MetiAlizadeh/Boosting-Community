
const { Message, PermissionFlagBits, Permissions, ChannelType, uttonInteraction  } = require('discord.js');
const ExtendedClient = require('../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
module.exports = {
    customId: 'check-balance',
    /**
     * 
     * @param {ExtendedClient} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const userId = interaction.user.id;
        const dbClient = new MongoClient(process.env.MONGODB_URI);

        try {
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const membersCollection = db.collection('members');

            const memberData = await membersCollection.findOne({ memberId: userId });
            if (memberData) {
                await interaction.user.send(`Your balance: ${memberData.balance}`);
            } else {
                await interaction.user.send('No balance information found.');
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        } finally {
            await dbClient.close();
        }


    }
};