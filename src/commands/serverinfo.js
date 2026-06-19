const {
    SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
} = require('discord.js');
const { getConfig, countModCases } = require('../utils/db.js');

const VERIFICATION_LABELS = {
    0: 'None',
    1: 'Low — verified email',
    2: 'Medium — registered 5+ min',
    3: 'High — member 10+ min',
    4: 'Highest — phone verified',
};

const BOOST_TIERS = { 0: 'No Tier', 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View detailed information about this server'),

    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        await guild.fetch().catch(() => {});

        // ─ Members ───────────────────────────────────────────────────────────
        const totalMembers = guild.memberCount;
        const bots  = guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;

        // ─ Channels ──────────────────────────────────────────────────────────
        const channels   = guild.channels.cache;
        const textCount  = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageCount = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;
        const catCount   = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // ─ Roles ───────────────────────────────────────────────────────────────
        const roleCount  = guild.roles.cache.size - 1; // exclude @everyone

        // ─ Emojis / stickers ───────────────────────────────────────────────────
        const staticEmoji   = guild.emojis.cache.filter(e => !e.animated).size;
        const animatedEmoji = guild.emojis.cache.filter(e => e.animated).size;
        const stickerCount  = guild.stickers?.cache.size ?? 0;

        // ─ Boost ───────────────────────────────────────────────────────────────
        const boostTier  = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount ?? 0;

        // ─ Owner ───────────────────────────────────────────────────────────────
        const owner = await guild.fetchOwner().catch(() => null);

        // ─ Sigil config features ───────────────────────────────────────────────
        const cfg       = getConfig(guild.id);
        const features  = [];
        if (cfg.welcome_enabled)   features.push('👋 Welcome');
        if (cfg.xp_enabled)        features.push('⚡ XP/Levels');
        if (cfg.starboard_enabled) features.push('⭐ Starboard');
        if (cfg.automod_anti_spam || cfg.automod_anti_links || cfg.automod_anti_mentions || cfg.automod_anti_caps || cfg.automod_bad_words)
            features.push('🛡️ AutoMod');
        if (cfg.twitch_enabled)    features.push('🟣 Twitch');
        if (cfg.youtube_enabled)   features.push('🔴 YouTube');
        if (cfg.ticket_category_id) features.push('🎫 Tickets');
        const featureStr = features.length ? features.join('  ·  ') : '*None configured*';

        // ─ Dates ───────────────────────────────────────────────────────────────
        const createdTs = Math.floor(guild.createdTimestamp / 1000);

        // ─ Build embed ────────────────────────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined })
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setColor('#5865F2')
            .addFields(
                { name: '🆔 Server ID',       value: `\`${guild.id}\``,                                          inline: true },
                { name: '👑 Owner',           value: owner ? `<@${owner.id}>` : 'Unknown',                       inline: true },
                { name: '📅 Created',         value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`,                  inline: true },

                { name: '👥 Members',
                  value: `**${totalMembers.toLocaleString()}** total\n🙂 ${humans.toLocaleString()} humans · 🤖 ${bots} bots`,
                  inline: true },

                { name: '💬 Channels',
                  value: `📝 ${textCount} text · 🔊 ${voiceCount} voice${stageCount ? ` · 🎭 ${stageCount} stage` : ''}${forumCount ? ` · 📋 ${forumCount} forum` : ''}\n📁 ${catCount} categories`,
                  inline: true },

                { name: '🎭 Roles',           value: `${roleCount}`,                                              inline: true },

                { name: '😀 Emojis',
                  value: `${staticEmoji} static · ${animatedEmoji} animated${stickerCount ? ` · ${stickerCount} stickers` : ''}`,
                  inline: true },

                { name: '🚀 Boosts',
                  value: `**${BOOST_TIERS[boostTier]}** · ${boostCount} boosts`,
                  inline: true },

                { name: '🔒 Verification',
                  value: VERIFICATION_LABELS[guild.verificationLevel] ?? 'Unknown',
                  inline: true },

                { name: '⚙️ Sigil Features',  value: featureStr,                                                  inline: false },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        // Server banner
        if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

        await interaction.editReply({ embeds: [embed] });
    },
};
