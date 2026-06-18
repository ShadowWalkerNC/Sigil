const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const W = 800, H = 280;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('namecard')
        .setDescription('Generate a shareable Discord identity card with your username, roles, and style')
        .addStringOption(opt => opt.setName('username').setDescription('Display name on the card').setRequired(true))
        .addStringOption(opt => opt.setName('tagline').setDescription('Short bio or status line'))
        .addStringOption(opt => opt.setName('role1').setDescription('Role badge 1 (e.g. Admin)'))
        .addStringOption(opt => opt.setName('role2').setDescription('Role badge 2'))
        .addStringOption(opt => opt.setName('role3').setDescription('Role badge 3'))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Accent color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addStringOption(opt => opt.setName('avatar_url').setDescription('Avatar image URL (leave blank to skip)')),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const username   = interaction.options.getString('username');
        const tagline    = interaction.options.getString('tagline')      ?? '';
        const role1      = interaction.options.getString('role1')        ?? '';
        const role2      = interaction.options.getString('role2')        ?? '';
        const role3      = interaction.options.getString('role3')        ?? '';
        const background = interaction.options.getString('background')   ?? 'solid-dark';
        const primary    = interaction.options.getString('primary_color') ?? '#39FF14';
        const font       = interaction.options.getString('font')         ?? getAllFontFamilies()[0] ?? 'Arial';
        const avatarURL  = interaction.options.getString('avatar_url')  ?? null;

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        // Background
        try { getBackgroundById(background).draw(ctx, W, H); } catch { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H); }

        // Accent bar on left
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, 6, H);

        // Avatar circle
        const AVATAR_X = 48, AVATAR_Y = H / 2, AVATAR_R = 72;
        ctx.save();
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
        ctx.clip();
        if (avatarURL) {
            try {
                const img = await loadImage(avatarURL);
                ctx.drawImage(img, AVATAR_X, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
            } catch {
                ctx.fillStyle = primary + '44';
                ctx.fill();
            }
        } else {
            // Default monogram
            ctx.fillStyle = primary + '33';
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.font = `bold 48px "${font}"`;
            ctx.fillStyle = primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(username.slice(0, 2).toUpperCase(), AVATAR_X + AVATAR_R, AVATAR_Y);
        }
        ctx.restore();

        // Avatar ring
        ctx.beginPath();
        ctx.arc(AVATAR_X + AVATAR_R, AVATAR_Y, AVATAR_R + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Username
        const textX = AVATAR_X + AVATAR_R * 2 + 32;
        ctx.font = `bold 38px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(username, textX, tagline ? H * 0.38 : H / 2 + 12);

        // Tagline
        if (tagline) {
            ctx.font = `20px "${font}"`;
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(tagline, textX, H * 0.38 + 32);
        }

        // Role badges
        const roles = [role1, role2, role3].filter(Boolean);
        if (roles.length) {
            let rx = textX;
            const ry = H * 0.72;
            for (const role of roles) {
                const pad = 14;
                ctx.font = `bold 15px "${font}"`;
                const rw = ctx.measureText(role).width + pad * 2;
                const rh = 26;
                ctx.fillStyle = primary + '33';
                ctx.beginPath();
                ctx.roundRect(rx, ry - rh / 2, rw, rh, 6);
                ctx.fill();
                ctx.strokeStyle = primary;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = primary;
                ctx.textAlign = 'center';
                ctx.fillText(role, rx + rw / 2, ry + 1);
                rx += rw + 10;
            }
        }

        // Sigil watermark
        ctx.font = `13px Arial`;
        ctx.fillStyle = '#ffffff22';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 16, H - 12);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'namecard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`\uD83C\uDD94 ${username}'s Name Card`)
            .setDescription('Share this anywhere \u2014 Discord, Twitter, Reddit, wherever.')
            .setImage('attachment://namecard.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil \u2022 namecard \u2014 800\u00d7280 px PNG' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'namecard', username, tagline, background,
            primary_color: primary, font,
        });
    },
};
