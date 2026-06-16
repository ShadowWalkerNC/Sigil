/**
 * /saveme — save the icon params you just used into your personal history.
 *
 * Usage:
 *   /saveme text:Nova size:80 color:#FF4500 glow:High background:starfield
 *   /saveme text:Nova size:80 color:#FF4500 glow:High background:starfield label:"my red icon"
 *
 * The command does NOT regenerate the image — it just stores the parameters
 * so /history can replay them instantly.
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder }        = require('discord.js');
const { saveEntry, MAX_ITEMS } = require('../utils/history');

function buildCopyCommand(cmd, params) {
    const parts = [`/${cmd}`];
    const order = ['text','size','color','glow','background','color2','opacity','border','font','position','circular','subtitle','align','shape','seed'];
    for (const key of order) {
        if (params[key] !== undefined && params[key] !== null) {
            parts.push(`${key}:${params[key]}`);
        }
    }
    return parts.join(' ');
}

module.exports = {
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName('saveme')
        .setDescription(`Save your current icon params to history (keeps last ${MAX_ITEMS}).`)
        .addStringOption(o => o.setName('command').setDescription('Which command produced this icon (icon / banner / logo / avatar / random)').setRequired(true)
            .addChoices(
                { name: '/icon',   value: 'icon'   },
                { name: '/banner', value: 'banner' },
                { name: '/logo',   value: 'logo'   },
                { name: '/avatar', value: 'avatar' },
                { name: '/random', value: 'random' }
            ))
        .addStringOption(o => o.setName('text')      .setDescription('Text you used')                          .setRequired(true))
        .addIntegerOption(o => o.setName('size')      .setDescription('Font size you used')                    .setRequired(true))
        .addStringOption(o => o.setName('color')      .setDescription('Primary colour (hex)')                  .setRequired(true))
        .addStringOption(o => o.setName('glow')       .setDescription('Glow level (Low/Medium/High)').setRequired(true)
            .addChoices({ name:'Low',value:'Low'},{ name:'Medium',value:'Medium'},{ name:'High',value:'High' }))
        .addStringOption(o => o.setName('background') .setDescription('Background key (e.g. starfield)')       .setRequired(false))
        .addStringOption(o => o.setName('color2')     .setDescription('Second colour if gradient')             .setRequired(false))
        .addIntegerOption(o => o.setName('opacity')   .setDescription('Opacity 10-100')                        .setRequired(false).setMinValue(10).setMaxValue(100))
        .addStringOption(o => o.setName('border')     .setDescription('Border style')                         .setRequired(false)
            .addChoices({ name:'None',value:'none'},{ name:'Solid',value:'solid'},{ name:'Glow Ring',value:'glow'},{ name:'Gradient Ring',value:'gradient'}))
        .addStringOption(o => o.setName('font')       .setDescription('Font key')                              .setRequired(false))
        .addStringOption(o => o.setName('label')      .setDescription('Friendly name for this save (e.g. \'red fire icon\')')  .setRequired(false)),

    async execute(interaction) {
        const command = interaction.options.getString('command');
        const label   = interaction.options.getString('label') || null;

        const params = {
            text:       interaction.options.getString('text'),
            size:       interaction.options.getInteger('size'),
            color:      interaction.options.getString('color'),
            glow:       interaction.options.getString('glow'),
            background: interaction.options.getString('background') || undefined,
            color2:     interaction.options.getString('color2')     || undefined,
            opacity:    interaction.options.getInteger('opacity')   || undefined,
            border:     interaction.options.getString('border')     || undefined,
            font:       interaction.options.getString('font')       || undefined,
        };

        // Strip undefined values
        Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

        saveEntry(interaction.user.id, { label, command, params });

        const copyCmd = buildCopyCommand(command, params);

        const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('\u2705 Saved to your history')
            .setDescription(`Use \`/history\` to view and replay all your saved icons.`)
            .addFields(
                { name: 'Label',   value: label || '*(auto-timestamped)*', inline: true  },
                { name: 'Command', value: `\`/${command}\``,                inline: true  },
                { name: 'Replay',  value: `\`\`\`\n${copyCmd}\n\`\`\``,   inline: false },
            )
            .setFooter({ text: `Discord Icon Gen \u2022 history capped at ${MAX_ITEMS} entries per user` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
