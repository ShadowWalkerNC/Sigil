const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const EFFECT_CHOICES = [
    { name: 'Neon',    value: 'neon'    },
    { name: 'Chrome',  value: 'chrome'  },
    { name: 'Fire',    value: 'fire'    },
    { name: 'Glitch',  value: 'glitch'  },
    { name: 'Ice',     value: 'ice'     },
    { name: 'Gold',    value: 'gold'    },
    { name: 'Shadow',  value: 'shadow'  },
    { name: 'Outline', value: 'outline' },
];

function renderTextEffect({ text, effect, font, color }) {
    const FONT_SIZE = 96;
    const PAD = 40;

    const tmp = createCanvas(1, 1);
    const tctx = tmp.getContext('2d');
    tctx.font = `bold ${FONT_SIZE}px "${font}"`;
    const tw = tctx.measureText(text).width;

    const W = Math.ceil(tw + PAD * 2);
    const H = FONT_SIZE + PAD * 2;

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    ctx.font = `bold ${FONT_SIZE}px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = W / 2, cy = H / 2;

    switch (effect) {
        case 'neon': {
            const c = color || '#39FF14';
            for (const [blur, alpha] of [[60,'33'],[30,'66'],[15,'99'],[8,'cc']]) {
                ctx.shadowColor = c; ctx.shadowBlur = blur;
                ctx.fillStyle = c + alpha;
                ctx.fillText(text, cx, cy);
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, cx, cy);
            break;
        }
        case 'chrome': {
            const g = ctx.createLinearGradient(0, cy - FONT_SIZE/2, 0, cy + FONT_SIZE/2);
            g.addColorStop(0.0, '#ffffff');
            g.addColorStop(0.2, '#aaaaaa');
            g.addColorStop(0.5, '#ffffff');
            g.addColorStop(0.8, '#555555');
            g.addColorStop(1.0, '#cccccc');
            ctx.fillStyle = g;
            ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
            ctx.fillText(text, cx, cy);
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            break;
        }
        case 'fire': {
            for (const [off, c] of [[6,'#ff000066'],[3,'#ff660099'],[1,'#ffaa00cc']]) {
                ctx.shadowColor = c; ctx.shadowBlur = 20;
                ctx.fillStyle = c;
                ctx.fillText(text, cx, cy + off);
            }
            ctx.shadowBlur = 0;
            const g = ctx.createLinearGradient(0, cy - FONT_SIZE/2, 0, cy + FONT_SIZE/2);
            g.addColorStop(0, '#ffee00');
            g.addColorStop(0.4, '#ff6600');
            g.addColorStop(1, '#cc0000');
            ctx.fillStyle = g;
            ctx.fillText(text, cx, cy);
            break;
        }
        case 'glitch': {
            ctx.fillStyle = '#ff003366'; ctx.fillText(text, cx - 3, cy - 2);
            ctx.fillStyle = '#00ffff66'; ctx.fillText(text, cx + 3, cy + 2);
            ctx.fillStyle = '#00000033';
            for (let y = 0; y < H; y += 4) { ctx.fillRect(0, y, W, 2); }
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, cx, cy);
            const sliceY = cy - 10 + Math.floor(Math.random() * 20);
            ctx.save();
            ctx.beginPath(); ctx.rect(0, sliceY, W, 8); ctx.clip();
            ctx.fillStyle = '#00ffff';
            ctx.fillText(text, cx + 6, cy);
            ctx.restore();
            break;
        }
        case 'ice': {
            const g = ctx.createLinearGradient(0, cy - FONT_SIZE/2, 0, cy + FONT_SIZE/2);
            g.addColorStop(0, '#e0f7ff');
            g.addColorStop(0.4, '#80d4f7');
            g.addColorStop(1, '#0099cc');
            ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 20;
            ctx.fillStyle = g;
            ctx.fillText(text, cx, cy);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1.5;
            ctx.strokeText(text, cx, cy);
            break;
        }
        case 'gold': {
            const g = ctx.createLinearGradient(0, cy - FONT_SIZE/2, 0, cy + FONT_SIZE/2);
            g.addColorStop(0.0, '#fff3a0');
            g.addColorStop(0.3, '#ffd700');
            g.addColorStop(0.6, '#b8860b');
            g.addColorStop(1.0, '#ffd700');
            ctx.shadowColor = '#ffd70088'; ctx.shadowBlur = 12;
            ctx.fillStyle = g;
            ctx.fillText(text, cx, cy);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1;
            ctx.strokeText(text, cx, cy);
            break;
        }
        case 'shadow': {
            for (let i = 8; i >= 1; i--) {
                ctx.fillStyle = `rgba(0,0,0,${0.15 * i})`;
                ctx.fillText(text, cx + i, cy + i);
            }
            ctx.fillStyle = color || '#ffffff';
            ctx.fillText(text, cx, cy);
            break;
        }
        case 'outline': {
            ctx.strokeStyle = color || '#39FF14';
            ctx.lineWidth = 4;
            ctx.strokeText(text, cx, cy);
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1;
            ctx.strokeText(text, cx, cy);
            break;
        }
    }

    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('texteffect')
        .setDescription('Render stylised text as a downloadable PNG — neon, fire, chrome, glitch, and more')
        .addStringOption(opt => opt.setName('text').setDescription('Text to render').setRequired(true))
        .addStringOption(opt => opt.setName('effect').setDescription('Visual effect').setRequired(true).addChoices(...EFFECT_CHOICES))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addStringOption(opt => opt.setName('color').setDescription('Base color for neon/shadow/outline effects (hex)').setAutocomplete(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text   = interaction.options.getString('text');
        const effect = interaction.options.getString('effect');
        const font   = interaction.options.getString('font')  ?? getAllFontFamilies()[0] ?? 'Arial';
        const color  = interaction.options.getString('color') ?? null;

        const buf = renderTextEffect({ text, effect, font, color });
        const attachment = new AttachmentBuilder(buf, { name: `texteffect-${effect}.png` });

        const effectLabel = EFFECT_CHOICES.find(e => e.value === effect)?.name ?? effect;

        const embed = new EmbedBuilder()
            .setTitle(`✨ ${effectLabel} Text Effect`)
            .setDescription(`**"${text}"** rendered with the **${effectLabel}** effect.`)
            .setImage(`attachment://texteffect-${effect}.png`)
            .setColor(color ?? '#39FF14')
            .addFields(
                { name: 'Effect', value: effectLabel, inline: true },
                { name: 'Font',   value: font,        inline: true },
            )
            .setFooter({ text: 'Sigil • texteffect — use in banners, intros, or anywhere outside Discord' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, { command: 'texteffect', text, effect, font, color });
    },
};
