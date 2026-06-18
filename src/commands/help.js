const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CATEGORIES = [
    {
        emoji: '🎨',
        name: 'Branding & Icons',
        commands: [
            {
                name: '/icon',
                desc: 'Generate a server icon',
                params: [
                    '`text` *(required)* — up to 4 characters, e.g. `SW`',
                    '`shape` — `circle` · `rounded` · `square` · `hexagon` · `diamond`',
                    '`background` — 32 presets: gradients, solids, patterns, named themes',
                    '`border` — `none` · `solid` · `glow` · `gradient` · `double` · `dashed` · `neon` · `rainbow`',
                    '`primary_color` / `secondary_color` — any hex color, autocompletes 50+ named colors',
                    '`font` — Arial Black · Impact · Bebas Neue · Oswald · Playfair Display · Source Code Pro · Dancing Script',
                    '`glow` — blur intensity 0–25 · `opacity` — transparency 0.0–1.0',
                ].join('\n'),
                tip: '💡 Try `/icon text:SW shape:hexagon border:neon primary_color:#00FFFF`',
            },
            {
                name: '/banner',
                desc: 'Generate a wide 960×240 server banner',
                params: [
                    '`text` *(required)* — main heading on the banner',
                    '`subtitle` — smaller line below the main text',
                    '`align` — `left` · `center` · `right`',
                    '`background`, `border`, `primary_color`, `secondary_color`, `font`, `glow`, `opacity`',
                ].join('\n'),
                tip: '💡 Try `/banner text:My Server subtitle:Est. 2025 align:center`',
            },
            {
                name: '/logo',
                desc: 'Logo-style icon with optional transparent background',
                params: [
                    '`text` *(required)*',
                    '`transparent` — `true` for transparent PNG (great for overlays)',
                    '`shape`, `background`, `primary_color`, `secondary_color`, `font`, `glow`',
                ].join('\n'),
                tip: '💡 Use `transparent:true` for overlaying on stream scenes',
            },
            {
                name: '/avatar',
                desc: 'Server avatar / profile icon',
                params: [
                    '`text` *(required)*',
                    '`overlay_url` — URL of an image to blend over the background',
                    '`shape`, `primary_color`, `secondary_color`, `background`, `border`, `font`, `glow`',
                ].join('\n'),
                tip: '💡 Use `overlay_url` to combine a logo image with your brand colors',
            },
            {
                name: '/compare',
                desc: 'Side-by-side comparison of two icon designs',
                params: [
                    '`text_a` *(required)* · `text_b` *(required)*',
                    'Each side supports: `shape_a/b`, `primary_a/b`, `secondary_a/b`, `background_a/b`, `border_a/b`',
                ].join('\n'),
                tip: '💡 Great for A/B testing color combos before committing',
            },
            {
                name: '/brand kit',
                desc: 'Build a full brand kit manually (icon + banner + palette)',
                params: [
                    '`brand_name` *(required)* · `icon_text` — defaults to first 2 chars of brand name',
                    '`tagline`, `primary_color`, `secondary_color`, `background`, `border`, `font`, `glow`, `shape`',
                ].join('\n'),
                tip: '💡 Use `/brand share` after to get a GUI link with your kit pre-loaded',
            },
            {
                name: '/brand ai',
                desc: 'AI-designed brand kit from a description (requires Gemini key)',
                params: [
                    '`description` *(required)* — describe your server in plain language',
                    'e.g. `a dark fantasy RPG server for hardcore players`',
                ].join('\n'),
                tip: '💡 Be specific — mention genre, mood, and colors for best results',
            },
            {
                name: '/brand share',
                desc: 'Get a GUI link pre-loaded with your last kit settings',
                params: ['No parameters — uses your most recent `/brand kit` or `/brand ai` output'],
                tip: '💡 Share the link with your team so everyone can see the brand live',
            },
            {
                name: '/template',
                desc: 'Load a built-in brand template instantly',
                params: [
                    '`name` *(required)* — Demonfall · Cyber Nexus · Arcane Order · Cozy Den · Neon Drift · Polar Ops · Emerald Fang · Void Protocol',
                    '`icon_text` — override the icon initials · `brand_name` — override the brand name on the banner',
                ].join('\n'),
                tip: '💡 Templates are fully themed kits — fastest way to get a polished look',
            },
        ],
    },
    {
        emoji: '🚀',
        name: 'Nitro-Free Features',
        commands: [
            {
                name: '/sticker',
                desc: 'Discord sticker (320×320 PNG) — upload free to any server, no Nitro needed',
                params: [
                    '`text` *(required)* — sticker text or emoji label',
                    '`primary_color`, `secondary_color`, `background`, `font`, `style` — `standard` · `outlined` · `bubble`',
                ].join('\n'),
                tip: '💡 Download the PNG and upload it in Server Settings → Emoji → Stickers',
            },
            {
                name: '/emote',
                desc: 'Custom emoji (128×128 PNG) — upload free to any server',
                params: [
                    '`text` *(required)* — label for the emoji',
                    '`primary_color`, `background`, `font`, `transparent`',
                ].join('\n'),
                tip: '💡 Download and drag into Server Settings → Emoji',
            },
            {
                name: '/reactionpack',
                desc: 'Generate 5 themed reaction emojis + ZIP download',
                params: [
                    '`emoji1`–`emoji5` *(required)* — text or emoji for each of the 5 reactions',
                    '`theme` — color theme for the pack',
                ].join('\n'),
                tip: '💡 Upload all 5 at once from the ZIP for a consistent reaction set',
            },
            {
                name: '/rolebadge',
                desc: 'Styled role badge graphic',
                params: [
                    '`text` *(required)* — role name',
                    '`style` — `pill` · `rounded` · `hex` · `diamond`',
                    '`primary_color`, `secondary_color`, `font`',
                ].join('\n'),
                tip: '💡 Use in role-selection channels to show what each role looks like',
            },
            {
                name: '/resize',
                desc: 'Resize any image URL to Discord-optimal dimensions',
                params: [
                    '`url` *(required)* — direct link to any image',
                    '`preset` — Server Icon (512×512) · Banner (960×540) · Splash (1920×1080) · Emoji (128×128) · Sticker (320×320) · Avatar (256×256) · Profile Banner (600×240) · Thumbnail (320×180)',
                ].join('\n'),
                tip: '💡 Paste any image link — gets resized and returned as an optimized PNG',
            },
            {
                name: '/splash',
                desc: 'Invite splash / discovery banner (up to 1920×1080)',
                params: [
                    '`server_name` *(required)*',
                    '`subtitle`, `background`, `primary_color`, `secondary_color`, `font`, `glow`',
                ].join('\n'),
                tip: '💡 Upload in Server Settings → Overview → Server Invite Background',
            },
            {
                name: '/namecard',
                desc: 'Shareable identity card — username, tagline, roles, avatar',
                params: [
                    '`username` *(required)* · `tagline`',
                    '`role1`–`role3`, `primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Great for team introduction posts or staff spotlights',
            },
            {
                name: '/servercard',
                desc: 'Shareable server preview card',
                params: [
                    '`server_name` *(required)* · `description` · `members`',
                    '`primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Post in partner servers or social media to recruit members',
            },
            {
                name: '/profilecard',
                desc: 'Nitro-style profile card with banner, avatar, bio, badge',
                params: [
                    '`username` *(required)* · `bio` · `badge` — text label for the badge',
                    '`primary_color`, `secondary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Replicates the Nitro profile card look without needing Nitro',
            },
            {
                name: '/texteffect',
                desc: 'Stylised text PNG — 8 visual effects',
                params: [
                    '`text` *(required)*',
                    '`effect` — `neon` · `chrome` · `fire` · `glitch` · `ice` · `gold` · `shadow` · `outline`',
                    '`primary_color`, `font`',
                ].join('\n'),
                tip: '💡 Use `neon` or `glitch` for channel banners and announcement headers',
            },
            {
                name: '/themepreview',
                desc: 'Full Discord UI mockup with your color scheme applied',
                params: [
                    '`server_name` *(required)*',
                    '`accent_color` · `background_color` · `text_color`',
                ].join('\n'),
                tip: '💡 See exactly how your color choices look inside a real Discord layout',
            },
        ],
    },
    {
        emoji: '🏆',
        name: 'Community Tools',
        commands: [
            {
                name: '/welcomecard',
                desc: 'Custom welcome image — free alternative to MEE6 Pro ($5.99/mo)',
                params: [
                    '`username` *(required)* — new member\'s name',
                    '`message` — custom welcome text, default: `Welcome to the server!`',
                    '`member_count` — e.g. `You are member #1,042`',
                    '`avatar_url` — member\'s avatar URL for the card',
                    '`primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Use `/sigilconfig welcome` to make this fire automatically on every join',
            },
            {
                name: '/rankcard',
                desc: 'XP rank card — free alternative to MEE6 Pro / Tatsu Premium',
                params: [
                    '`username` *(required)* · `level` *(required)* · `rank` *(required)*',
                    '`current_xp` · `required_xp` — fills the XP progress bar',
                    '`avatar_url` — member\'s avatar for the card',
                    '`primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Pair with MEE6/Tatsu webhooks to auto-post on level-up',
            },
            {
                name: '/announcebanner',
                desc: 'Professional announcement graphic',
                params: [
                    '`title` *(required)* · `body` — body text',
                    '`type` — `announcement` · `alert` · `update` · `event` · `maintenance` · `celebration`',
                    '`primary_color`, `secondary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Use `type:alert` for rule changes, `type:celebration` for milestones',
            },
            {
                name: '/eventbanner',
                desc: 'Event banner with title, date, description, host',
                params: [
                    '`title` *(required)* · `date` *(required)* — e.g. `Saturday June 21 8PM EST`',
                    '`description` · `host` · `type` — `gaming` · `music` · `art` · `education` · `social` · `tournament`',
                    '`primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Post in your events channel and pin it — also works with Discord\'s Scheduled Events',
            },
            {
                name: '/certificate',
                desc: 'Achievement or award certificate (8 types)',
                params: [
                    '`recipient` *(required)* · `type` — `achievement` · `completion` · `staff_of_month` · `tournament_winner` · `top_contributor` · `anniversary` · `custom` · `milestone`',
                    '`reason` — what the award is for · `issued_by` — name of the issuer',
                    '`primary_color`, `secondary_color`, `font`',
                ].join('\n'),
                tip: '💡 Use `type:staff_of_month` monthly and pin in a hall-of-fame channel',
            },
            {
                name: '/invitecard',
                desc: 'Branded invite card with QR code — shareable on social media',
                params: [
                    '`server_name` *(required)* · `invite_url` *(required)* — your discord.gg link',
                    '`description` · `member_count`',
                    '`primary_color`, `background`, `font`',
                ].join('\n'),
                tip: '💡 Post on Reddit, Twitter, or print IRL — the QR code is scannable',
            },
        ],
    },
    {
        emoji: '⚙️',
        name: 'Automation (v2.0)',
        commands: [
            {
                name: '/sigilconfig welcome',
                desc: 'Enable automatic welcome cards on every member join',
                params: [
                    '`enabled` *(required)* — `true` or `false`',
                    '`channel` — channel to post welcome cards in',
                    '`color` — accent color hex · `background` · `font`',
                ].join('\n'),
                tip: '💡 Set once and Sigil handles every new member automatically',
            },
            {
                name: '/sigilconfig goodbye',
                desc: 'Enable automatic goodbye cards when members leave',
                params: [
                    '`enabled` *(required)* · `channel` — channel to post goodbye cards in',
                ].join('\n'),
                tip: '💡 Good for logging departures in a mod or log channel',
            },
            {
                name: '/sigilconfig milestone',
                desc: 'Auto-celebrate when member count hits 50, 100, 500, 1K, 5K…',
                params: [
                    '`enabled` *(required)* · `channel` — channel to post milestone cards in',
                ].join('\n'),
                tip: '💡 Point to your #general or #announcements channel',
            },
            {
                name: '/sigilconfig boost',
                desc: 'Auto-thank members when they boost the server',
                params: [
                    '`enabled` *(required)* · `channel` — channel to post boost thank-you cards in',
                ].join('\n'),
                tip: '💡 Makes boosters feel seen — great for retention',
            },
            {
                name: '/sigilconfig status',
                desc: 'Show all automation settings for this server',
                params: ['No parameters — shows a status embed with all toggles and channels'],
                tip: '💡 Run this any time to check what\'s active',
            },
        ],
    },
    {
        emoji: '📊',
        name: 'Analytics',
        commands: [
            {
                name: '/serverstats',
                desc: 'Visual server health card — members, channels, roles, emoji, age, boosts',
                params: ['No parameters — reads directly from your server'],
                tip: '💡 Post weekly in #announcements to show growth',
            },
        ],
    },
    {
        emoji: '🧠',
        name: 'AI & Utilities',
        commands: [
            {
                name: '/mood',
                desc: 'Generate a 5-color palette from a mood or vibe description',
                params: [
                    '`description` *(required)* — e.g. `cozy autumn evening` or `aggressive cyberpunk neon`',
                ].join('\n'),
                tip: '💡 Use the output colors in any other Sigil command',
            },
            {
                name: '/palette export',
                desc: 'Export your palette as CSS variables, Tailwind config, or hex list',
                params: [
                    '`format` *(required)* — `css` · `tailwind` · `hex`',
                    '`primary`–`color5` — hex inputs (uses last kit if omitted)',
                ].join('\n'),
                tip: '💡 Paste the CSS variables straight into your website or stream overlay',
            },
            {
                name: '/saveme',
                desc: 'Save your most recent design as a named kit',
                params: ['`name` *(required)* — a label for this saved kit'],
                tip: '💡 Save multiple variations then compare with `/compare`',
            },
            {
                name: '/history',
                desc: 'View your recent command history with copy-paste commands',
                params: ['No parameters'],
                tip: '💡 Quickly re-run a previous design without remembering all the options',
            },
            {
                name: '/gui open',
                desc: 'Get the link to the Visual Brand Builder GUI',
                params: ['No parameters — opens the 4-step visual builder with live preview'],
                tip: '💡 The GUI is the easiest way to build a brand kit — no slash command knowledge needed',
            },
            {
                name: '/gui status',
                desc: 'Check if the GUI server is online',
                params: ['No parameters'],
                tip: null,
            },
            {
                name: '/status',
                desc: 'Bot uptime, version, and server count',
                params: ['No parameters'],
                tip: null,
            },
        ],
    },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all Sigil commands, options, and tips')
        .addStringOption(opt =>
            opt.setName('category')
                .setDescription('Jump to a specific category')
                .addChoices(
                    { name: '🎨 Branding & Icons',     value: 'branding' },
                    { name: '🚀 Nitro-Free Features',  value: 'nitrofree' },
                    { name: '🏆 Community Tools',      value: 'community' },
                    { name: '⚙️ Automation',           value: 'automation' },
                    { name: '📊 Analytics',            value: 'analytics' },
                    { name: '🧠 AI & Utilities',       value: 'ai' },
                )
        ),

    async execute(interaction) {
        const categoryMap = {
            branding:   0,
            nitrofree:  1,
            community:  2,
            automation: 3,
            analytics:  4,
            ai:         5,
        };

        const choice = interaction.options.getString('category');
        const targets = choice !== null ? [CATEGORIES[categoryMap[choice]]] : CATEGORIES;

        const embeds = targets.map(cat => {
            const fields = cat.commands.map(cmd => ({
                name: `${cmd.name} — ${cmd.desc}`,
                value: [
                    cmd.params,
                    cmd.tip ? `\n${cmd.tip}` : '',
                ].filter(Boolean).join('\n').slice(0, 1020),
            }));

            return new EmbedBuilder()
                .setTitle(`${cat.emoji} ${cat.name}`)
                .setColor('#5865F2')
                .addFields(fields)
                .setFooter({ text: 'Sigil v2.0.0 • /help category:<name> to jump to a section • /gui open for visual builder' });
        });

        // Discord allows max 10 embeds per message
        await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
    },
};
