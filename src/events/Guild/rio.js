const {
    ChannelType,
    Message
} = require("discord.js");
const config = require("../../config");
const {
    log
} = require("../../functions");
const GuildSchema = require("../../schemas/GuildSchema");
const ExtendedClient = require("../../class/ExtendedClient");
const {
    MongoClient
} = require('mongodb');
const commands = require("../../handlers/commands");

const cooldown = new Map();

module.exports = {
    event: "messageCreate",
    /**
     *
     * @param {ExtendedClient} client
     * @param {Message<true>} message
     * @returns
     */
    run: async (client, message) => {
        if (message.author.bot || message.channel.type === ChannelType.DM) return;
        if (message.content.includes("raider.io/")) {
            const link = message.content.includes('?utm_source=addon') ?
                message.content.split('?')[0] : message.content;

            const [_, realmAndName] = link.split('/eu/');
            const [realm, name] = realmAndName.split('/');
            const url = `https://raider.io/api/v1/characters/profile?region=eu&realm=${realm}&name=${name}&fields=gear%2Cmythic_plus_scores_by_season%3Acurrent%2Craid_progression`;
            const idChannl = await getRioChannelId()
            console.log('message.channelId:', message.channelId); // debug
            console.log('rioChannelId:', idChannl); // debug
            console.log(message.channelId === await idChannl); // debug
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
                const data = await response.json();
                const IOembed = {
                    color: 16711680,
                    title: 'Nightmare BOT',
                    //url: process.env.URL,
                    thumbnail: {
                        url: data.thumbnail_url,
                    },
                    fields: [{
                            name: '**Name**',
                            value: data.name,
                            inline: true
                        },
                        {
                            name: '**Realm**',
                            value: data.realm,
                            inline: true
                        },
                        {
                            name: '**Race & Class**',
                            value: data.race + " " + data.class,
                            inline: true
                        },
                        {
                            name: '**Faction**',
                            value: data.faction,
                            inline: true
                        },
                        {
                            name: '**Active Role**',
                            value: data.active_spec_role,
                            inline: true
                        },
                        {
                            name: '**ilvl**',
                            value: `${data.gear.item_level_equipped}`,
                            inline: true
                        },
                        {
                            name: '**Profile url**',
                            value: data.profile_url
                        },
                        {
                            name: '**raid progress (Amirdrassil)**',
                            value: data.raid_progression["amirdrassil-the-dreams-hope"].summary,
                            inline: true
                        },
                        {
                            name: '**MythicPlus score**',
                            value: `Dps: ${data.mythic_plus_scores_by_season[0].scores.dps} \nTank: ${data.mythic_plus_scores_by_season[0].scores.tank}\nHealer: ${data.mythic_plus_scores_by_season[0].scores.healer}`,
                            inline: true
                        },
                        {
                            name: '**Last Update**',
                            value: data.last_crawled_at
                        },
                    ],
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Developed By M3yt1',
                        icon_url: message.author.displayAvatarURL(),
                    },
                };
                if (message.channelId === idChannl ) {
                    const ioScore = data.mythic_plus_scores_by_season[0].scores.all;
                    assignRoleBasedOnScore(ioScore, message, client, data);
                    await message.channel.send({
                        embeds: [IOembed]
                    });
                    message.channel.send(`${message.member} Your Request Approved✔`)
                        .then(msg => setTimeout(() => msg.delete(), 3000));
                }
                const dbClient = new MongoClient(process.env.MONGODB_URI);
                dbClient.connect();
                const db = dbClient.db('boostingcommunity'); // Replace with your database name
                const rolesCollection = db.collection('roles');
                const channelsCollection = db.collection('channels');
                const verifyLogChannelData = await channelsCollection.findOne({ key: 'verifyLogChannel' });
                if (verifyLogChannelData && verifyLogChannelData.channelId) {
                    const verifyLogChannelId = verifyLogChannelData.channelId;
                    const logChannel = client.channels.cache.get(verifyLogChannelId);
                    logChannel.send({
                        content: `user Verifid ${message.author}`,
                    });
                }
            } catch (error) {
                await message.reply('Error fetching data. Please check the link or try again later.');
                console.error(error); // Improved error handling
            }
        }

    },
};



/**
 * Assigns role based on the ioScore.
 * @param {number} ioScore 
 * @param {Message} message 
 * @param {ExtendedClient} client 
 * @param {Object} data 
 */
async function assignRoleBasedOnScore(ioScore, message, client, data) {
    const dbClient = new MongoClient(process.env.MONGODB_URI);
    let roleThresholds = [];

    try {
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity'); // Replace with your database name
        const rolesCollection = db.collection('roles');
        const channelsCollection = db.collection('channels');

        // Fetching role IDs from the database
        const roleKeys = ['3700ioRole','3600ioRole', '3500ioRole', '3400ioRole', '3300ioRole', '3200ioRole', '3100ioRole', '3000ioRole', '2750ioRole', '2500ioRole'];
        for (const key of roleKeys) {
            const role = await rolesCollection.findOne({ key: key });
            console.log(`Fetched role for key ${key}:`, role); // Debugging
            if (role) {
                roleThresholds.push({ key: key, role: role.roleId });
            }
        }

        // Convert key to threshold. Example: '3600ioRole' -> 3600
        const convertKeyToThreshold = (key) => {
            if (!key) {
                console.error('Key is undefined');
                return null;
            }
            const match = key.match(/(\d+)/);
            return match ? parseInt(match[1]) : null;
        };

        // Update roleThresholds with correct thresholds
        roleThresholds = roleThresholds.map(rt => ({
            threshold: convertKeyToThreshold(rt.key),
            role: rt.role
        })).filter(rt => rt.threshold !== null);

        console.log('Updated Role Thresholds:', roleThresholds); // Debugging
    } catch (error) {
        console.error('Error fetching role IDs:', error);
        return;
    } finally {
        await dbClient.close();
    }

    // Assigning roles based on ioScore
    const memberRoles = message.member.roles.cache;
    let assignedRole = null;
    
    for (const roleInfo of roleThresholds) {
        console.log(`Checking if ${ioScore} >= ${roleInfo.threshold}`); // Debugging
        if (ioScore >= roleInfo.threshold) {
            assignedRole = roleInfo.role;
            console.log(`Assigning role: ${assignedRole}`); // Debugging
            break; // Exit the loop when a role is assigned
        }
    }

    if (!assignedRole) {
        console.log("No role assigned, score doesn't meet any threshold");
        return;
    }

    // Remove any roles that are no longer applicable
    for (const roleInfo of roleThresholds) {
        if (memberRoles.has(roleInfo.role) && roleInfo.role !== assignedRole) {
            console.log(`Removing role: ${roleInfo.role}`); // Debugging
            await message.member.roles.remove(roleInfo.role);
        }
    }

    // Add the new role
    await message.member.roles.add(assignedRole);
    message.member.setNickname(`${data.name}-${data.realm}`);
    console.log(`Added new role: ${assignedRole}`); // Debugging

}

async function getRioChannelId() {
    const dbClient = new MongoClient(process.env.MONGODB_URI);

    try {
        await dbClient.connect();
        const db = dbClient.db('boostingcommunity'); // Replace with your database name
        const channelsCollection = db.collection('channels'); // Assuming you store configuration data in a "config" collection

        // Fetch the rioChannel ID from the database
        const channelsData = await channelsCollection.findOne({ key: 'rioChannel' });
        if (!channelsData) {
            console.error('rioChannel not found in the database');
            return null;
        }
        
        if (!channelsData.channelId) {
            console.error('channelId not found in the rioChannel data');
            return null;
        }
        
        return channelsData.channelId.toString();
    } catch (error) {
        console.error('Error fetching configuration data:', error);
        return null;
    } finally {
        await dbClient.close();
    }
}