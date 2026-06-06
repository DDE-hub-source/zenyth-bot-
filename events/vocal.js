import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const EDIT_ROLE_ID = '1510748943435436083';

function hasPermission(member) {
  return member.roles.cache.has(EDIT_ROLE_ID);
}

export const mv = {
  data: new SlashCommandBuilder()
    .setName('mv')
    .setDescription('Déplacer un membre dans un salon vocal')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à déplacer').setRequired(true))
    .addChannelOption(opt => opt.setName('salon').setDescription('Salon vocal de destination').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    const target = interaction.options.getMember('membre');
    const channel = interaction.options.getChannel('salon');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas en vocal.', ephemeral: true });
    await target.voice.setChannel(channel);
    await interaction.reply({ content: `✅ **${target.user.username}** déplacé vers **${channel.name}** !`, ephemeral: true });
  },
};

export const join = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Rejoindre le salon vocal d\'un membre')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre à rejoindre').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas en vocal.', ephemeral: true });
    if (!interaction.member.voice.channelId) return interaction.reply({ content: '❌ Tu dois être en vocal.', ephemeral: true });
    await interaction.member.voice.setChannel(target.voice.channel);
    await interaction.reply({ content: `✅ Tu as rejoint **${target.voice.channel.name}** !`, ephemeral: true });
  },
};

export const vmute = {
  data: new SlashCommandBuilder()
    .setName('vmute')
    .setDescription('Mute/unmute un membre en vocal')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas en vocal.', ephemeral: true });
    const isMuted = target.voice.serverMute;
    await target.voice.setMute(!isMuted);
    await interaction.reply({ content: `✅ **${target.user.username}** est **${!isMuted ? 'muté' : 'démuté'}** !`, ephemeral: true });
  },
};

export const vdeaf = {
  data: new SlashCommandBuilder()
    .setName('vdeaf')
    .setDescription('Deafen/undeafen un membre en vocal')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true)),
  async execute(interaction) {
    if (!hasPermission(interaction.member)) return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    const target = interaction.options.getMember('membre');
    if (!target.voice.channelId) return interaction.reply({ content: '❌ Ce membre n\'est pas en vocal.', ephemeral: true });
    const isDeafened = target.voice.serverDeaf;
    await target.voice.setDeaf(!isDeafened);
    await interaction.reply({ content: `✅ **${target.user.username}** est **${!isDeafened ? 'deafened' : 'undeafened'}** !`, ephemeral: true });
  },
};