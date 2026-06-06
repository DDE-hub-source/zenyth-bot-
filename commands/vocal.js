import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

const ALLOWED_ROLES = ['edit role', '🌙 Fondateur', '👑 Empereur', '🏴 Commandant'];

function hasPermission(member) {
  return member.roles.cache.some(r => ALLOWED_ROLES.includes(r.name));
}

// ─── /mv — Déplacer un membre ─────────────────────────────────────────────────
export const mv = {
  data: new SlashCommandBuilder()
    .setName('mv')
    .setDescription('Déplacer un membre dans un salon vocal')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à déplacer').setRequired(true))
    .addChannelOption(opt =>
      opt.setName('salon').setDescription('Salon vocal de destination').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission de déplacer des membres ! Utilise `/mv` avec le bon rôle.', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    const channel = interaction.options.getChannel('salon');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas dans un salon vocal.', ephemeral: true });
    await target.voice.setChannel(channel);
    await interaction.reply({ content: `✅ **${target.user.username}** déplacé vers **${channel.name}** !`, ephemeral: true });
  },
};

// ─── /join — Rejoindre un membre ──────────────────────────────────────────────
export const join = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Rejoindre le salon vocal d\'un membre')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à rejoindre').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande !', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas dans un salon vocal.', ephemeral: true });

    const member = interaction.member;
    if (!member.voice.channelId) return interaction.reply({ content: '❌ Tu dois être dans un salon vocal pour utiliser cette commande.', ephemeral: true });

    await member.voice.setChannel(target.voice.channel);
    await interaction.reply({ content: `✅ Tu as rejoint **${target.voice.channel.name}** !`, ephemeral: true });
  },
};

// ─── /vmute — Mute vocal un membre ───────────────────────────────────────────
export const vmute = {
  data: new SlashCommandBuilder()
    .setName('vmute')
    .setDescription('Mute/unmute un membre en vocal')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à mute/unmute').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Utilise `/vmute` avec le bon rôle ! Le clic droit est interdit.', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas dans un salon vocal.', ephemeral: true });

    const isMuted = target.voice.serverMute;
    await target.voice.setMute(!isMuted);
    await interaction.reply({
      content: `✅ **${target.user.username}** est maintenant **${!isMuted ? 'muté' : 'démuté'}** !`,
      ephemeral: true,
    });
  },
};

// ─── /vdeaf — Deafen un membre ────────────────────────────────────────────────
export const vdeaf = {
  data: new SlashCommandBuilder()
    .setName('vdeaf')
    .setDescription('Deafen/undeafen un membre en vocal')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande !', ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas dans un salon vocal.', ephemeral: true });

    const isDeafened = target.voice.serverDeaf;
    await target.voice.setDeaf(!isDeafened);
    await interaction.reply({
      content: `✅ **${target.user.username}** est maintenant **${!isDeafened ? 'deafened' : 'undeafened'}** !`,
      ephemeral: true,
    });
  },
};
