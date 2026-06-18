const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const W = 600, H = 340;
const BANNER_H = 160;
const AVATAR_R = 52;
const AVATAR_X = 48;
const AVATAR_Y = BANNER_H;

const BADGE_CHOICES = [
    { name: 'None',              value: 'none'         },
    { name: '⚡ Early Supporter', value: 'early'        },
    { name: '🐛 Bug Hunter',      value: 'bughunter'    },
    { name: '🌟 Server Booster',  value: 'booster'      },
    { name: '🎨 Active Developer',value: 'developer'    },
    { name: '✨ Nitro',           value: 'nitro'        },
    { name: '🛡️ Moderator',       value: 'moderator'    },
];

const BADGE_LABELS = {
    none:      null,
    early:     '⚡ Early Supporter',
    bughunter: '🐛 Bug Hunter',
    booster:   '🌟 Server Booster',
    developer: '🎨 Active Developer',
    nitro:     '✨ Nitro',
    moderator: '🛡️ Moderator',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profilecard')
        .setDescription('Generate a Nitro-style Discord profile card mockup')
        .addStringOption(opt => opt.setName('username').setDescription('Display name').setRequired(true))
        .addStringOption(opt => opt.setName('bio').setDescription('About me / bio text'))
        .addStringOption(opt => opt.setName('badge').setDescription('Profile badge').addChoices(...BADGE_CHOICES))
        .addStringOption(opt => opt.setName('banner_background').setDescription('Banner background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('banner_color').setDescription('Banner accent color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('avatar_color').setDescription('Avatar ring color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('avatar_url').setDescription('Avatar image URL (optional)'))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const username   = interaction.options.getString('username');
        const bio        = interaction.options.getString('bio')              ?? 'No bio set.';
        const badgeKey   = interaction.options.getString('badge')           ?? 'none';
        const bannerBg   = interaction.options.getString('banner_background') ?? 'gradient-purple';
        const bannerColor = interaction.options.getString('banner_color')   ?? '#5865F2';
        const avatarColor = interaction.options.getString('avatar_color')   ?? '#ffffff';
        const avatarURL  = interaction.options.getString('avatar_url')      ?? null;
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0] ?? 'Arial';

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        // Base card background (Discord dark)
        ctx.fillStyle = '#2b2d31';
        ctx.beginPath();
        ctx.roundRect(0, 0, W, H, 12);
        ctx.fill();

        // Banner
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, W, BANNER_H, [12, 12, 0, 0]);
        ctx.clip();
        try { getBackgroundById(bannerBg).draw(ctx, W, BANNER_H); }
        catch { ctx.fillStyle = bannerColor; ctx.fillRect(0, 0, W, BANNER_H); }
        ctx.restore();

        // Avatar circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R, AVATAR_Y, AVATAR_R + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#2b2d31';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
        ctx.clip();
        if (avatarURL) {
            try {
                const img = await loadImage(avatarURL);
                ctx.drawImage(img, AVATAR_X, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
            } catch {
                ctx.fillStyle = avatarColor + '33'; ctx.fill();
            }
        } else {
            ctx.fillStyle = avatarColor + '33'; ctx.fill();
            ctx.restore(); ctx.save();
            ctx.font = `bold 36px "${font}"`;
            ctx.fillStyle = avatarColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(username.slice(0, 2).toUpperCase(), AVATAR_X + AVATAR_R, AVATAR_Y);
        }
        ctx.restore();

        // Online status dot
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R * 2 - 10, AVATAR_Y + AVATAR_R - 10, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#2b2d31';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R * 2 - 10, AVATAR_Y + AVATAR_R - 10, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#23a55a';
        ctx.fill();

        // Username
        const textX = AVATAR_X + AVATAR_R * 2 + 20;
        const nameY  = BANNER_H + 32;
        ctx.font = `bold 26px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(username, textX, nameY);

        // Badge pill
        const badgeLabel = BADGE_LABELS[badgeKey];
        if (badgeLabel) {
            ctx.font = `13px "${font}"`;
            const bw = ctx.measureText(badgeLabel).width + 20;
            const bx = W - bw - 20;
            const by = nameY - 18;
            ctx.fillStyle = bannerColor + '44';
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, 22, 11);
            ctx.fill();
            ctx.strokeStyle = bannerColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(badgeLabel, bx + bw / 2, by + 15);
        }

        // Divider
        ctx.fillStyle = '#ffffff22';
        ctx.fillRect(textX, nameY + 10, W - textX - 20, 1);

        // About me section
        ctx.font = `bold 11px Arial`;
        ctx.fillStyle = '#b5bac1';
        ctx.textAlign = 'left';
        ctx.fillText('ABOUT ME', textX, nameY + 30);

        ctx.font = `15px "${font}"`;
        ctx.fillStyle = '#dbdee1';
        // Word wrap bio
        const maxW = W - textX - 24;
        const words = bio.split(' ');
        let line = '', lines = [], ly = nameY + 50;
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > maxW) { lines.push(line); line = w; }
            else line = t;
        }
        if (line) lines.push(line);
        lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, textX, ly + i * 22));

        // Sigil watermark
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff18';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 8);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'profilecard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`\uD83D\uDC64 ${username}'s Profile Card`)
            .setDescription('A Nitro-style Discord profile card mockup — share it anywhere.')
            .setImage('attachment://profilecard.png')
            .setColor(bannerColor)
            .addFields(
                { name: 'Badge',  value: badgeLabel ?? 'None', inline: true },
                { name: 'Size',   value: '600 × 340 px',       inline: true },
            )
            .setFooter({ text: 'Sigil • profilecard — 600×340 PNG' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, { command: 'profilecard', username, bio, badge: badgeKey, bannerBg, bannerColor, avatarColor, font });
    },
};
