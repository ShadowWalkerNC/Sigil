const { createCanvas } = require('canvas');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { registerAllFonts } = require('../utils/canvas.js');
const { getConfig } = require('../utils/db.js');

registerAllFonts();

const W = 900, H = 300;

async function renderRecapCard({ title, attendees, duration, primary, bg, font }) {
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    try { getBackgroundById(bg).draw(ctx, W, H); }
    catch { ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0, 0, W, H); }

    ctx.fillStyle = '#00000055'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = primary; ctx.fillRect(0, 0, 6, H);

    ctx.font = 'bold 12px Arial'; ctx.fillStyle = primary;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('E V E N T  R E C A P', 36, H * 0.22);

    ctx.font = `bold 38px "${font}"`, ctx.fillStyle = '#ffffff';
    ctx.shadowColor = primary; ctx.shadowBlur = 8;
    let t = title;
    while (ctx.measureText(t).width > W - 80 && t.length > 4) t = t.slice(0, -1);
    if (t !== title) t = t.trim() + '…';
    ctx.fillText(t, 36, H * 0.22 + 52); ctx.shadowBlur = 0;

    ctx.font = `bold 22px "${font}"`; ctx.fillStyle = primary;
    ctx.fillText(`👥 ${attendees} attended`, 36, H * 0.72);
    if (duration) {
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`⏱ ${duration}`, 36 + 260, H * 0.72);
    }

    ctx.font = `16px "${font}"`; ctx.fillStyle = '#888888';
    ctx.fillText('Thanks to everyone who joined!', 36, H * 0.88);

    ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff14';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('made with Sigil', W - 12, H - 8);

    return canvas.toBuffer('image/png');
}

async function handleEventEnd(scheduledEvent) {
    try {
        const config = getConfig(scheduledEvent.guild.id);
        if (!config.event_banner_enabled || !config.event_banner_channel) return;

        const channel = scheduledEvent.guild.channels.cache.get(config.event_banner_channel);
        if (!channel) return;

        const attendees = scheduledEvent.userCount ?? '?';

        let duration = null;
        if (scheduledEvent.scheduledStartAt && scheduledEvent.scheduledEndAt) {
            const mins = Math.round(
                (scheduledEvent.scheduledEndAt - scheduledEvent.scheduledStartAt) / 60000
            );
            duration = mins >= 60
                ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                : `${mins}m`;
        }

        const buf = await renderRecapCard({
            title:    scheduledEvent.name,
            attendees,
            duration,
            primary:  config.welcome_color || '#7B61FF',
            bg:       config.welcome_bg    || 'gradient-purple',
            font:     config.welcome_font  || 'Arial',
        });

        const attachment = new AttachmentBuilder(buf, { name: 'event-recap.png' });
        const embed = new EmbedBuilder()
            .setTitle(`✅ Event Ended — ${scheduledEvent.name}`)
            .setDescription('Thanks to everyone who attended!')
            .setImage('attachment://event-recap.png')
            .setColor(config.welcome_color || '#7B61FF')
            .addFields(
                { name: 'Attendees', value: `${attendees}`, inline: true },
                { name: 'Duration',  value: duration || 'N/A', inline: true }
            );

        await channel.send({ embeds: [embed], files: [attachment] });
    } catch (e) {
        console.error('[eventRecapHandler]', e);
    }
}

module.exports = { handleEventEnd };
