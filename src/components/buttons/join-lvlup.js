const { ButtonInteraction, PermissionsBitField, EmbedBuilder } = require('discord.js');
const ExtendedClient = require('../../class/ExtendedClient');
require('dotenv').config();

module.exports = {
    customId: 'join-lvlup',
    run: async (client, interaction) => {
        if (!isUserEligible(interaction)) {
            await interaction.reply({
                content: 'You do not have the required role.',
                ephemeral: true
            });
            return;
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
    }
};

function isUserEligible(interaction) {
    return interaction.member.roles.cache.has(process.env.LVLUP_BOOSTER) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

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
            