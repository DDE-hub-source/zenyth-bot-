import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';

// ─── COMMANDE : /ticket-panel ─────────────────────────────────────────────────
// Envoie le panel avec les 3 boutons dans le salon courant
export const ticketpanel = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Envoyer le panel de tickets dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('🎫 Ouvrir un ticket')
      .setDescription(
        'Choisis la catégorie de ton ticket en cliquant sur un bouton ci-dessous.\n\n' +
        '❓ **Question** — Tu as une question générale\n' +
        '📈 **Rank Up** — Tu veux demander une montée de grade\n' +
        '⚠️ **Problème** — Tu rencontres un problème'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_question')
        .setLabel('❓ Question')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_rankup')
        .setLabel('📈 Rank Up')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_probleme')
        .setLabel('⚠️ Problème')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panel envoyé !', ephemeral: true });
  },
};

// ─── GESTIONNAIRE DE BOUTONS ──────────────────────────────────────────────────
const TICKET_TYPES = {
  ticket_question: { label: 'Question',  emoji: '❓', color: 0x3b82f6 },
  ticket_rankup:   { label: 'Rank Up',   emoji: '📈', color: 0x22c55e },
  ticket_probleme: { label: 'Problème',  emoji: '⚠️', color: 0xef4444 },
};

export async function handleTicketButton(interaction) {
  const type = TICKET_TYPES[interaction.customId];
  if (!type) return;

  const guild = interaction.guild;
  const member = interaction.member;

  // Vérifier si le membre a déjà un ticket ouvert
  const existing = guild.channels.cache.find(
    c => c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  );
  if (existing) {
    return interaction.reply({
      content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
      ephemeral: true,
    });
  }

  // Trouver ou créer la catégorie "Tickets"
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets'
  );
  if (!category) {
    category = await guild.channels.create({
      name: 'Tickets',
      type: ChannelType.GuildCategory,
    });
  }

  // Créer le salon privé
  const ticketChannel = await guild.channels.create({
    name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  // Message dans le ticket
  const ticketEmbed = new EmbedBuilder()
    .setColor(type.color)
    .setTitle(`${type.emoji} Ticket — ${type.label}`)
    .setDescription(
      `Bienvenue ${member} !\n\n` +
      `Un membre du staff va te répondre rapidement.\n` +
      `Explique ton problème en détail ci-dessous.\n\n` +
      `Pour fermer ce ticket, clique sur le bouton **Fermer** ci-dessous.`
    )
    .setFooter({ text: `Ticket ouvert par ${interaction.user.tag}` })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({ content: `${member}`, embeds: [ticketEmbed], components: [closeRow] });

  await interaction.reply({
    content: `✅ Ton ticket a été créé : ${ticketChannel}`,
    ephemeral: true,
  });
}

// ─── FERMETURE DU TICKET ──────────────────────────────────────────────────────
export async function handleTicketClose(interaction) {
  if (interaction.customId !== 'ticket_close') return;

  const channel = interaction.channel;

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close_confirm')
      .setLabel('✅ Confirmer la fermeture')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_close_cancel')
      .setLabel('❌ Annuler')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: '⚠️ Tu es sûr de vouloir fermer ce ticket ?',
    components: [confirmRow],
    ephemeral: true,
  });

  const collector = interaction.channel.createMessageComponentCollector({ time: 15000 });
  collector.on('collect', async btn => {
    if (btn.user.id !== interaction.user.id) return;
    if (btn.customId === 'ticket_close_confirm') {
      await btn.update({ content: '🔒 Fermeture du ticket...', components: [] });
      await channel.send('🔒 Ce ticket va être supprimé dans 5 secondes...');
      setTimeout(() => channel.delete().catch(console.error), 5000);
    } else {
      await btn.update({ content: '❌ Fermeture annulée.', components: [] });
    }
    collector.stop();
  });
}
