const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const W = 860, H = 540;

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('themepreview')
        .setDescription('Preview how a color scheme looks applied to a Discord-style server UI mockup')
        .addStringOption(opt => opt.setName('server_name').setDescription('Server name to display').setRequired(true))
        .addStringOption(opt => opt.setName('accent_color').setDescription('Main accent color (hex)').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary / role color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const serverName = interaction.options.getString('server_name');
        const accent     = interaction.options.getString('accent_color');
        const secondary  = interaction.options.getString('secondary_color') ?? '#5865F2';
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0] ?? 'Arial';

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        // ── Discord Dark theme base ────────────────────────────────────
        // Server list sidebar (72px)
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(0, 0, 72, H);

        // Channel sidebar (240px)
        ctx.fillStyle = '#2b2d31';
        ctx.fillRect(72, 0, 240, H);

        // Main chat area
        ctx.fillStyle = '#313338';
        ctx.fillRect(312, 0, W - 312, H);

        // Member list (200px right)
        ctx.fillStyle = '#2b2d31';
        ctx.fillRect(W - 200, 0, 200, H);

        // ── Server icon in sidebar ─────────────────────────────────────
        const grad = ctx.createLinearGradient(0, 8, 0, 56);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, secondary);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(12, 8, 48, 48, 16);
        ctx.fill();
        ctx.font = `bold 18px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(serverName.slice(0,2).toUpperCase(), 36, 32);

        // Active server indicator
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(0, 20, 4, 24, [0,4,4,0]);
        ctx.fill();

        // Other server dots
        for (let i = 1; i <= 4; i++) {
            ctx.fillStyle = '#36393f';
            ctx.beginPath();
            ctx.arc(36, 72 + i * 56, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Channel sidebar content ────────────────────────────────────
        // Server name header
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(72, 0, 240, 48);
        ctx.font = `bold 15px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(serverName, 88, 24);

        // Category labels
        const cats = ['TEXT CHANNELS', 'VOICE CHANNELS', 'ANNOUNCEMENTS'];
        cats.forEach((cat, i) => {
            const cy = 68 + i * 110;
            ctx.font = `bold 11px Arial`;
            ctx.fillStyle = '#949ba4';
            ctx.fillText(cat, 88, cy);

            // Channels under category
            const channels = ['# general', '# off-topic', '# showcase'];
            channels.slice(0, 2).forEach((ch, j) => {
                const isActive = i === 0 && j === 0;
                if (isActive) {
                    ctx.fillStyle = `rgba(${hexToRgb(accent)},0.15)`;
                    ctx.beginPath();
                    ctx.roundRect(76, cy + 14 + j * 28, 228, 26, 4);
                    ctx.fill();
                }
                ctx.font = `${isActive ? 'bold ' : ''}14px "${font}"`;
                ctx.fillStyle = isActive ? '#ffffff' : '#949ba4';
                ctx.fillText(ch, 92, cy + 28 + j * 28);
                if (isActive) {
                    ctx.fillStyle = accent;
                    ctx.beginPath();
                    ctx.roundRect(73, cy + 16 + j * 28, 3, 22, 2);
                    ctx.fill();
                }
            });
        });

        // ── Chat area ─────────────────────────────────────────────────
        // Top bar
        ctx.fillStyle = '#2b2d31';
        ctx.fillRect(312, 0, W - 312 - 200, 48);
        ctx.font = `bold 15px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('# general', 332, 24);

        // Message bubbles
        const msgs = [
            { user: 'ShadowWalker', color: accent,    text: 'Welcome to the server! 🎉', time: 'Today at 10:00 AM' },
            { user: 'Sigil Bot',    color: secondary, text: 'Hello! Type /help to see all commands.', time: 'Today at 10:01 AM' },
            { user: 'Member',       color: '#949ba4', text: 'This theme looks amazing btw 👀', time: 'Today at 10:02 AM' },
        ];

        msgs.forEach((msg, i) => {
            const my = 72 + i * 80;
            // Avatar dot
            ctx.beginPath();
            ctx.arc(336, my + 16, 16, 0, Math.PI * 2);
            ctx.fillStyle = msg.color + '55';
            ctx.fill();
            ctx.font = `bold 11px Arial`;
            ctx.fillStyle = msg.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(msg.user.slice(0,2).toUpperCase(), 336, my + 16);
            // Username
            ctx.font = `bold 14px "${font}"`;
            ctx.fillStyle = msg.color;
            ctx.textAlign = 'left';
            ctx.fillText(msg.user, 360, my + 8);
            // Timestamp
            ctx.font = `11px Arial`;
            ctx.fillStyle = '#72767d';
            ctx.fillText(msg.time, 360 + ctx.measureText(msg.user).width + 8, my + 8);
            // Message text
            ctx.font = `14px "${font}"`;
            ctx.fillStyle = '#dbdee1';
            ctx.fillText(msg.text, 360, my + 28);
        });

        // Message input box
        ctx.fillStyle = '#383a40';
        ctx.beginPath();
        ctx.roundRect(324, H - 56, W - 324 - 208, 36, 8);
        ctx.fill();
        ctx.font = `14px "${font}"`;
        ctx.fillStyle = '#72767d';
        ctx.textBaseline = 'middle';
        ctx.fillText('Message #general', 344, H - 38);

        // ── Member list ───────────────────────────────────────────────
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(W - 200, 0, 200, 48);
        ctx.font = `bold 11px Arial`;
        ctx.fillStyle = '#949ba4';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('ONLINE — 3', W - 188, 70);

        const members = [
            { name: 'ShadowWalker', color: accent },
            { name: 'Sigil Bot',    color: secondary },
            { name: 'Member',       color: '#949ba4' },
        ];
        members.forEach((m, i) => {
            const my = 90 + i * 44;
            ctx.beginPath();
            ctx.arc(W - 180, my, 14, 0, Math.PI * 2);
            ctx.fillStyle = m.color + '55';
            ctx.fill();
            // Online dot
            ctx.beginPath();
            ctx.arc(W - 170, my + 10, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#23a55a';
            ctx.fill();
            ctx.font = `13px "${font}"`;
            ctx.fillStyle = '#dbdee1';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(m.name, W - 162, my);
        });

        // ── Color palette strip at bottom ──────────────────────────────
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(312, H - 8, W - 312, 8);
        const grad2 = ctx.createLinearGradient(312, 0, W, 0);
        grad2.addColorStop(0, accent);
        grad2.addColorStop(1, secondary);
        ctx.fillStyle = grad2;
        ctx.fillRect(312, H - 8, W - 312, 8);

        // Watermark
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff18';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 8, H - 12);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'themepreview.png' });

        const embed = new EmbedBuilder()
            .setTitle(`\uD83C\uDFA8 Theme Preview — ${serverName}`)
            .setDescription(`A Discord UI mockup with your **${accent}** / **${secondary}** color scheme applied.`)
            .setImage('attachment://themepreview.png')
            .setColor(accent)
            .addFields(
                { name: 'Accent',    value: accent,    inline: true },
                { name: 'Secondary', value: secondary, inline: true },
                { name: 'Size',      value: '860 × 540 px', inline: true },
            )
            .setFooter({ text: 'Sigil • themepreview — Discord UI mockup' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, { command: 'themepreview', serverName, accent, secondary, font });
    },
};
