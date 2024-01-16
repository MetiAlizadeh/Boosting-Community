const { Message, PermissionFlagBits, Permissions, EmbedBuilder, MessageEmbed } = require('discord.js');
const ExtendedClient = require('../../../class/ExtendedClient');
const { MongoClient } = require('mongodb');
const { PermissionFlagsBits } = require('discord.js');
const config = require("../../../config");
require('dotenv').config();

// Define the percentages for adv and boosters cuts from the config
const advCutPercentage = config.cuts.adv;
const boostersCutPercentage = config.cuts.boosters;

module.exports = {
    structure: {
        name: 'order',
        description: 'zzz',
        aliases: ['o'],
        permissions: null
    },
    run: async (client, message, args) => {
        const dbClient = new MongoClient(process.env.MONGODB_URI);
        try {
            await dbClient.connect();
            const db = dbClient.db('boostingcommunity');
            const channelsCollection = db.collection('channels');
            const ordersCollection = db.collection('orders');
            const membersCollection = db.collection('members');
            const user = message.author;

            // Check if the user is an "adv" in the database
            const memberDataa = await membersCollection.findOne({ memberId: user.id });
            if (!memberDataa || memberDataa.isAdv !== 'yes') {
                return message.reply('You are not authorized to use this command.');
            }

            // Fetching the ATTENDANCE_CHANNEL_ID from the database
            const attendanceChannelData = await channelsCollection.findOne({ key: 'attendanceChannel' });
            if (!attendanceChannelData || !attendanceChannelData.channelId) {
                return message.reply('Attendance channel not set up.');
            }
            const attendanceChannelId = attendanceChannelData.channelId;

            // Check if the command is used in the attendance channel
            if (message.channel.id !== attendanceChannelId) {
                return message.reply('This command can only be used in the attendance channel.');
            }

            // Parse arguments
            const [stack, amountOfRuns, keyLevel, goldPot, ...restArgs] = args;
            const note = restArgs.join(' '); // Join the remaining arguments to form the note

            // Check if user is "adv" in DB
            const memberData = await membersCollection.findOne({ memberId: user.id });
            if (!memberData || memberData.isAdv !== 'yes') {
                return message.reply('You are not authorized to use this command.');
            }

            const channelName = `order-${user.username}`;
            if (!channelName) {
                return message.reply('Error: Unable to determine a valid channel name.');
            }

            const parentChannel = message.guild.channels.cache.get(attendanceChannelId).parentId;
            let createdChannel;

            try {
                // Create a new channel for the boost order
                createdChannel = await message.guild.channels.create({
                    name: channelName,
                    parent: parentChannel,
                    reason: 'Order channel created'
                });

                let boostId;

                // Calculate the adv and boosters cut
                const advCut = goldPot * advCutPercentage;
                const boostersCut = goldPot * boostersCutPercentage;

                // Send an initial message with an embed
                await createdChannel.send({ content: `${user}` })
                    .then(async (msg) => msg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#FF0000")
                                .setTitle(`${stack} Stack - ${amountOfRuns}x${keyLevel}`)
                                .setDescription(`${note}`)
                                .setThumbnail(process.env.THUMBNAIL)
                                .addFields(
                                    { name: '**TEAM**', value: `No Team yet`, inline: true },
                                    { name: '**Price**', value: `:coin: ${goldPot}K`, inline: true },
                                    { name: '**Adv**', value: `:bust_in_silhouette: <@${user.id}> \n (adv cut: ${advCut.toPrecision(3)}k)`, inline: true },
                                    { name: '**Armor Stack**', value: `:white_check_mark: ${stack}`, inline: true },
                                    { name: '**Key**', value: ":white_check_mark: Check description", inline: true },
                                    { name: '**Booster Cut : (Per Person)**', value: `:coin: ${boostersCut.toPrecision(3)}K`, inline: true },
                                )
                                .setTimestamp()
                                .setFooter({
                                    text: `Boost Id ${msg.id} | Developed By M3yt1`,
                                    iconURL: user.avatarURL()
                                })
                        ]
                    }))
                    .then(msg => {
                        boostId = msg.id;
                        createdChannel.send(`${user} **Set Team For Current Booking**\n` + '```!team ' + msg.id + " @Booster1 @Booster2 @Booster3 @Booster4```");
                        createdChannel.send(`**Type Of Boost/Description:**\n` + '```' + amountOfRuns + 'x' + keyLevel + " " + note + '```');
                        createdChannel.send(`**Signup Template to follow:**\n` + "```Spec + Score + key/no key + ilvl```");
                    });

                // Save order details in MongoDB
                const orderDetails = {
                    boostId: boostId,
                    boostInfo: `${amountOfRuns}x${keyLevel} ${note}`,
                    boostadv: user.id,
                    goldPot: goldPot,
                    boosters: "No Team yet",
                };
                await ordersCollection.insertOne(orderDetails);

            } catch (error) {
                console.error('Error creating new channel:', error);
                return message.reply('An error occurred while creating a new channel.');
            }

            // Get the finished log channel data
            const finishedLogChannelData = await channelsCollection.findOne({ key: 'mplusLogChannel' });
            if (finishedLogChannelData && finishedLogChannelData.channelId) {
                const finishedLogChannelId = finishedLogChannelData.channelId;
                const logChannel = client.channels.cache.get(finishedLogChannelId);
                // Send a log message
                logChannel.send({
                    content: `Boost created by ${message.author} - ${createdChannel.toString()}`,
                });
            }

            // Send a DM to the user with the channel URL
            user.send(`Your order has been created: ${createdChannel.url}`);
        } catch (error) {
            console.error('Error executing order command:', error);
            message.reply('An error occurred while processing your order.');
        } finally {
            await dbClient.close();
        }
    }
};
