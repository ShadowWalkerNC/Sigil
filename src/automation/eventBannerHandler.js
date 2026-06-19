const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { registerAllFonts } = require('../utils/canvas.js');
const { getConfig } = require('../utils/db.js');

registerAllFonts();

const W = 1200, H = 400;

async function renderEventBanner({ title, description, startTime, primary, bg, font }) {
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    try { getBackgroundById(bg).draw(ctx, W, H); }
    catch { ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0, 0, W, H); }

    ctx.fillStyle = '#00000066'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = primary; ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = primary + '55'; ctx.fillRect(0, H - 4, W, 4);

    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = primary;
    ctx.textAlign = 'center';
    ctx.fillText('S C H E D U L E D  E V E N T', W / 2, 56);

    ctx.font = `bold 62px "${font}"`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = primary; ctx.shadowBlur = 16;
    let t = title;
    while (ctx.measureText(t).width > W - 120 && t.length > 4) t = t.slice(0, -1);
    if (t !== title) t = t.trim() + '…';
    ctx.fillText(t, W / 2, H / 2 + 10);
    ctx.shadowBlur = 0;

    if (description) {
        ctx.font = `20px "${font}"`;
        ctx.fillStyle = '#cccccc';
        let d = description.length > 90 ? description.slice(0, 87) + '…' : description;
        ctx.fillText(d, W / 2, H / 2 + 54);
    }

    if (startTime) {
        const dateStr = new Date(startTime).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });
        ctx.font = `bold 16px Arial`;
        ctx.fillStyle = primary + 'cc';
        ctx.fillText('🗓  ' + dateStr, W / 2, H - 36);
    }

    ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff14';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('made with Sigil', W - 12, H - 8);

    return canvas.toBuffer('image/png');
}

async function handleEventCreate(scheduledEvent) {
    try {
        const config = getConfig(scheduledEvent.guild.id);
        if (!config.event_banner_enabled || !config.event_banner_channel) return;

        const channel = scheduledEvent.guild.channels.cache.get(config.event_banner_channel);
        if (!channel) return;

        const buf = await renderEventBanner({
            title:       scheduledEvent.name,
            description: scheduledEvent.description || '',
            startTime:   scheduledEvent.scheduledStartAt,
            primary:     config.welcome_color || '#7B61FF',
            bg:          config.welcome_bg    || 'gradient-purple',
            font:        config.welcome_font  || 'Arial',
        });

        const attachment = new AttachmentBuilder(buf, { name: 'event-banner.png' });
        const embed = new EmbedBuilder()
            .setTitle(`📅 ${scheduledEvent.name}`)
            .setDescription(scheduledEvent.description || 'A new event has been scheduled!')
            .setImage('attachment://event-banner.png')
            .setColor(config.welcome_color || '#7B61FF')
            .addFields(
                { name: 'Starts', value: scheduledEvent.scheduledStartAt
                    ? `<t:${Math.floor(scheduledEvent.scheduledStartAt.getTime() / 1000)}:F>`
                    : 'TBD', inline: true },
                { name: 'Location', value: scheduledEvent.entityMetadata?.location || scheduledEvent.channel?.name || 'Discord', inline: true }
            )
            .setFooter({ text: 'React or click Interested to get notified!' });

        await channel.send({ embeds: [embed], files: [attachment] });
    } catch (e) {
        console.error('[eventBannerHandler]', e);
    }
}

module.exports = { handleEventCreate };
