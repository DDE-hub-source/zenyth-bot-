import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';

// ─── /sondage ─────────────────────────────────────────────────────────────────
export const sondage = {
  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Créer un sondage')
    .addStringOption(opt => opt.setName('question').setDescription('Ta question').setRequired(true))
    .addStringOption(opt => opt.setName('choix1').setDescription('Choix 1').setRequired(true))
    .addStringOption(opt => opt.setName('choix2').setDescription('Choix 2').setRequired(true))
    .addStringOption(opt => opt.setName('choix3').setDescription('Choix 3'))
    .addStringOption(opt => opt.setName('choix4').setDescription('Choix 4')),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const choix = [
      interaction.options.getString('choix1'),
      interaction.options.getString('choix2'),
      interaction.options.getString('choix3'),
      interaction.options.getString('choix4'),
    ].filter(Boolean);

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const desc = choix.map((c, i) => `${emojis[i]} ${c}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`📊 ${question}`)
      .setDescription(desc)
      .setFooter({ text: `Sondage créé par ${interaction.user.tag}` })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < choix.length; i++) {
      await msg.react(emojis[i]);
    }
  },
};

// ─── /serverinfo ──────────────────────────────────────────────────────────────
export const serverinfo = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Informations sur le serveur'),
  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.members.fetch();

    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humains = guild.memberCount - bots;
    const salonsTexte = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const salonsVocal = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '👑 Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '🌍 Région', value: 'Europe', inline: true },
        { name: '👥 Membres', value: `${humains} humains / ${bots} bots`, inline: true },
        { name: '💬 Salons texte', value: `${salonsTexte}`, inline: true },
        { name: '🎙️ Salons vocal', value: `${salonsVocal}`, inline: true },
        { name: '🎭 Rôles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: '🔒 Niveau de vérification', value: `${guild.verificationLevel}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

// ─── /avatar ──────────────────────────────────────────────────────────────────
export const avatar = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Voir l\'avatar d\'un membre en grand')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre')),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const avatarURL = target.displayAvatarURL({ size: 1024, extension: 'png' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Ouvrir en plein écran')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL),
    );

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`🖼️ Avatar de ${target.username}`)
      .setImage(avatarURL);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
