const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getXP, setXP, getUserRank } = require('../utils/db.js');
const { calculateLevel, totalXpForLevel } = require('../utils/xp.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpadmin')
        .setDescription('Admin XP controls')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('give')
            .setDescription('Add XP to a member')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('XP to add').setRequired(true).setMinValue(1))
        )
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Set a member\'s total XP directly')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('New total XP').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub => sub
            .setName('setlevel')
            .setDescription('Set a member\'s level directly')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
            .addIntegerOption(opt => opt.setName('level').setDescription('New level').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset a member\'s XP to zero')
            .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        ),

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const target  = interaction.options.getUser('user');
        const guildId = interaction.guild.id;
        const row     = getXP(guildId, target.id);

        let newXp, newLevel, desc;

        if (sub === 'give') {
            const amount = interaction.options.getInteger('amount');
            newXp = row.xp + amount;
            const calc = calculateLevel(newXp);
            newLevel = calc.level;
            desc = `➕ Added **${amount.toLocaleString()} XP** to <@${target.id}>.\nTotal: **${newXp.toLocaleString()} XP** • Level **${newLevel}**`;
        } else if (sub === 'set') {
            newXp = interaction.options.getInteger('amount');
            const calc = calculateLevel(newXp);
            newLevel = calc.level;
            desc = `✏️ Set <@${target.id}> to **${newXp.toLocaleString()} XP** • Level **${newLevel}**`;
        } else if (sub === 'setlevel') {
            newLevel = interaction.options.getInteger('level');
            newXp    = totalXpForLevel(newLevel);
            desc = `✏️ Set <@${target.id}> to **Level ${newLevel}** (**${newXp.toLocaleString()} XP**)`;
        } else if (sub === 'reset') {
            newXp = 0; newLevel = 0;
            desc = `🔄 Reset <@${target.id}>'s XP to **0**.`;
        }

        setXP(guildId, target.id, newXp, newLevel);

        const embed = new EmbedBuilder()
            .setTitle('✅ XP Admin')
            .setDescription(desc)
            .setColor('#39FF14')
            .setFooter({ text: 'Sigil • xpadmin' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
