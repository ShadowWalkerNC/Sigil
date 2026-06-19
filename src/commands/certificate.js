const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const W = 900, H = 620;

const TYPE_CHOICES = [
    { name: '🏆 Achievement',       value: 'achievement'   },
    { name: '⭐ Staff of the Month',  value: 'staff'         },
    { name: '👑 Best Member',       value: 'member'        },
    { name: '🏅 Tournament Winner', value: 'tournament'    },
    { name: '👀 Most Active',       value: 'active'        },
    { name: '🎨 Creative Award',    value: 'creative'      },
    { name: '🛡️ Moderator Award',   value: 'moderator'     },
    { name: '✨ Custom',             value: 'custom'        },
];

const TYPE_TITLES = {
    achievement: 'Certificate of Achievement',
    staff:       'Staff of the Month',
    member:      'Best Member Award',
    tournament:  'Tournament Champion',
    active:      'Most Active Member',
    creative:    'Creative Excellence Award',
    moderator:   'Moderator Recognition',
    custom:      'Certificate of Recognition',
};

const TYPE_ICONS = {
    achievement: '🏆', staff: '⭐', member: '👑',
    tournament: '🏅', active: '👀', creative: '🎨',
    moderator: '🛡️', custom: '✨',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('certificate')
        .setDescription('Generate a custom achievement or award certificate for a server member')
        .addStringOption(opt => opt.setName('recipient').setDescription('Recipient name').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('Certificate type').setRequired(true).addChoices(...TYPE_CHOICES))
        .addStringOption(opt => opt.setName('reason').setDescription('Award reason or achievement description'))
        .addStringOption(opt => opt.setName('server_name').setDescription('Your server name (shown as issuer)'))
        .addStringOption(opt => opt.setName('date').setDescription('Date to show (default: today)'))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Accent color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const recipient   = interaction.options.getString('recipient');
        const type        = interaction.options.getString('type');
        const reason      = interaction.options.getString('reason')      ?? 'For outstanding contributions to the community.';
        const serverName  = interaction.options.getString('server_name') ?? interaction.guild?.name ?? 'The Server';
        const dateStr     = interaction.options.getString('date')        ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const primary     = interaction.options.getString('primary_color') ?? '#ffd700';
        const font        = interaction.options.getString('font')        ?? getAllFontFamilies()[0] ?? 'Arial';

        const certTitle = TYPE_TITLES[type];
        const icon      = TYPE_ICONS[type];

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, W, H);
        const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.7);
        bgGrad.addColorStop(0, '#1a1506');
        bgGrad.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = primary;
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.strokeStyle = primary + '55';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(30, 30, W - 60, H - 60);

        const corners = [[36,36],[W-36,36],[36,H-36],[W-36,H-36]];
        corners.forEach(([cx, cy]) => {
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.fillStyle = primary;
            ctx.fill();
        });

        ctx.font = `52px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(icon, W / 2, 110);

        ctx.font = `bold 13px Arial`;
        ctx.fillStyle = primary + 'aa';
        ctx.fillText('C E R T I F I C A T E', W / 2, 140);

        ctx.font = `bold 38px "${font}"`;
        ctx.fillStyle = primary;
        ctx.shadowColor = primary; ctx.shadowBlur = 12;
        ctx.fillText(certTitle, W / 2, 188);
        ctx.shadowBlur = 0;

        const dg = ctx.createLinearGradient(120, 0, W - 120, 0);
        dg.addColorStop(0, 'transparent'); dg.addColorStop(0.5, primary); dg.addColorStop(1, 'transparent');
        ctx.fillStyle = dg;
        ctx.fillRect(120, 204, W - 240, 1.5);

        ctx.font = `18px "${font}"`;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('This certificate is proudly awarded to', W / 2, 248);

        ctx.font = `bold 54px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = primary; ctx.shadowBlur = 16;
        ctx.fillText(recipient, W / 2, 318);
        ctx.shadowBlur = 0;

        ctx.font = `17px "${font}"`;
        ctx.fillStyle = '#cccccc';
        const words = reason.split(' ');
        let line = '', lines = [], ry = 360;
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > W - 200) { lines.push(line); line = w; }
            else line = t;
        }
        if (line) lines.push(line);
        lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, ry + i * 26));

        ctx.fillStyle = dg;
        ctx.fillRect(120, H - 160, W - 240, 1.5);

        ctx.font = `bold 16px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(serverName, 100, H - 120);
        ctx.font = `13px Arial`;
        ctx.fillStyle = '#888888';
        ctx.fillText('Issued by', 100, H - 138);

        ctx.textAlign = 'right';
        ctx.font = `bold 16px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateStr, W - 100, H - 120);
        ctx.font = `13px Arial`;
        ctx.fillStyle = '#888888';
        ctx.fillText('Date awarded', W - 100, H - 138);

        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W / 2, H - 8);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'certificate.png' });

        const embed = new EmbedBuilder()
            .setTitle(`${icon} ${certTitle} — ${recipient}`)
            .setDescription(reason)
            .setImage('attachment://certificate.png')
            .setColor(primary)
            .addFields(
                { name: 'Recipient', value: recipient,  inline: true },
                { name: 'Issued by', value: serverName, inline: true },
                { name: 'Date',      value: dateStr,    inline: true },
            )
            .setFooter({ text: 'Sigil • certificate — 900×620 PNG' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'certificate', recipient, type, reason, serverName, date: dateStr, primary_color: primary, font });
    },
};
