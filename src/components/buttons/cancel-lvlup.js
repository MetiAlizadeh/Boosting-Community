const { ButtonInteraction , PermissionsBitField} = require('discord.js');
const ExtendedClient = require('../../class/ExtendedClient');

module.exports = {
    customId: 'finish-lvlup',
    /**
     * 
     * @param {ExtendedClient} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
            interaction.message.delete()
        }


    }
};