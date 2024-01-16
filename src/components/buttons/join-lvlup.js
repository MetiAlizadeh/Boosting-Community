const { ButtonInteraction, PermissionsBitField, EmbedBuilder } = require('discord.js');
const ExtendedClient = require('../../class/ExtendedClient');
require('dotenv').config();
const { MongoClient } = require('mongodb');

module.exports = {
    customId: 'join-lvlup',
    run: async (client, interaction) => {
        const dbClient = new MongoClient(process.env.MONGODB_URI);
        try {
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const rolesCollection = db.collection('roles');

            const levelupRoleData = await rolesCollection.findOne({ key: 'levelupRole' });
            if (!levelupRoleData || !levelupRoleData.roleId) {
                return interaction.reply({ content: 'Level-up role not set up.', ephemeral: true });
            }
            const levelupRoleId = levelupRoleData.roleId;

            // Check if the user is eligible
            if (!interaction.member.roles.cache.has(levelupRoleId)) {
                return interaction.reply({ content: 'You do not have the required role.', ephemeral: true });
            }

            const message = await fetchInteractionMessage(client, interaction);
            if (isUserAlreadyListed(interaction, message)) {
                await interaction.reply({
                    content: 'You are already in the list.',
                    ephemeral: true
                });
                return;
            }

            const updatedEmbed = updateBoostersListEmbed(message, interaction);
            await message.edit({ embeds: [updatedEmbed] });
            await interaction.reply({
                content: "Joined",
                ephemeral: true
            });

            setTimeout(async () => {
                const finalMessage = await fetchInteractionMessage(client, interaction);
                const updatedEmbedFinal = sortBoostersListEmbed(finalMessage);
                await finalMessage.edit({ embeds: [updatedEmbedFinal] });
            }, 30000);
        } catch (error) {
            console.error('Error in join-lvlup interaction:', error);
        } finally {
            await dbClient.close();
        }

        
    }
};


async function fetchInteractionMessage(client, interaction) {
    const targetChannel = client.channels.cache.get(interaction.channelId);
    return targetChannel.messages.fetch(interaction.message.id);
}

function isUserAlreadyListed(interaction, message) {
    const boostersField = message.embeds[0].data.fields[0].value;
    return boostersField.includes(interaction.member.toString());
}

function updateBoostersListEmbed(message, interaction) {
    const embedData = message.embeds[0].data;
    const currentBoosters = embedData.fields.find(field => field.name === '**Boosters**').value.split('\n').filter(line => line.trim().length > 0);
    const randomValue = Math.floor(Math.random() * 101);
    currentBoosters.push(`${interaction.member} ${randomValue}`);
    const boostIdField = embedData.fields.find(field => field.name === '**Boost ID**');

    return new EmbedBuilder()
        .setColor(embedData.color)
        .setTitle(embedData.title)
        //.setURL(process.env.URL)
        .setThumbnail(process.env.THUMBNAIL)
        .addFields([
            { name: '**Boosters**', value: currentBoosters.join('\n'), inline: true },
            { name: '**Price**', value: embedData.fields[1].value, inline: true },
            { name: '**Adv**', value: embedData.fields[2].value, inline: true },
            { name: '**Order**', value: embedData.fields[3].value, inline: true },
            { name: 'Boost ID', value: message.id , inline: true }])
        .setTimestamp()
        .setFooter({ text: embedData.footer.text, iconURL: interaction.user.displayAvatarURL() });
}

function sortBoostersListEmbed(message) {
    const embedData = message.embeds[0].data;
    const currentBoosters = embedData.fields.find(field => field.name === '**Boosters**').value.split('\n').filter(line => line.trim().length > 0);
    const sortedBoosters = currentBoosters.sort((a, b) => {
        const aNum = parseInt(a.split(' ')[1]);
        const bNum = parseInt(b.split(' ')[1]);
        return bNum - aNum;
    });

    return new EmbedBuilder()
    .setColor(embedData.color)
    .setTitle(embedData.title)
    //.setURL(process.env.URL)
    .setThumbnail(process.env.THUMBNAIL)
        .addFields([
            { name: '**Boosters**', value: sortedBoosters.join('\n'), inline: true },
            { name: '**Price**', value: embedData.fields[1].value, inline: true },
            { name: '**Adv**', value: embedData.fields[2].value, inline: true },
            { name: '**Order**', value: embedData.fields[3].value, inline: true },
            { name: '**Boost ID**', value: message.id, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: embedData.footer.text, iconURL: message.author.displayAvatarURL() });
}
            