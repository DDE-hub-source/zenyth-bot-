import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { HIERARCHY } from './hierarchy.js';

const STAFF_ROLES = [
  { name: '🌙 Fondateur',    color: 0xfbbf24 },
  { name: '👑 Empereur',     color: 0xf59e0b },
  { name: '🏴 Commandant',   color: 0xef4444 },
  { name: '⚜️ Duc',          color: 0xdc2626 },
  { name: '👁️ Oracle',       color: 0xa855f7 },
  { name: '🌟 Ascendant',    color: 0x8b5cf6 },
  { name: '🔥 Warlord',      color: 0x7c3aed },
  { name: '💎 Seigneur',     color: 0x6d28d9 },
  { name: '🌀 Archonte',     color: 0x4c1d95 },
  { name: '🗡️ Sentinelle',   color: 0x3730a3 },
];

const HIERARCHY_COLORS = { 1: 0x22c55e, 2: 0x3b82f6, 3: 0xa855f7, 4: 0xf59e0b, 5: 0xef4444 };

const PERMS_PERMISSIONS = {
  1: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
  2: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.Stream],
  3: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.Stream, PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.UseApplicationCommands, PermissionFlagsBits.CreatePublicThreads],
  4: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.Stream, PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.UseApplicationCommands, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers],
  5: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.Stream, PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.UseApplicationCommands, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageNicknames],
};

const STAFF_PERMISSIONS = [
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ViewAuditLog],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageEmojisAndStickers],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageEmojisAndStickers, PermissionFlagsBits.ManageEvents],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageEmojisAndStickers, PermissionFlagsBits.ManageEvents, PermissionFlagsBits.ManageThreads],
  [...PERMS_PERMISSIONS[5], PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.ManageEmojisAndStickers, PermissionFlagsBits.ManageEvents, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.PrioritySpeaker],
  [PermissionFlagsBits.Administrator],
];

export const setup = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Créer automatiquement tous les rôles avec leurs permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    let created = 0;
    let skipped = 0;

    for (const role of HIERARCHY) {
      const exists = guild.roles.cache.find(r => r.name === role.name);
      if (exists) { await exists.setPermissions(PERMS_PERMISSIONS[role.perms]).catch(console.error); skipped++; continue; }
      await guild.roles.create({ name: role.name, color: HIERARCHY_COLORS[role.perms], permissions: PERMS_PERMISSIONS[role.perms], reason: 'Setup Zenyth' }).catch(console.error);
      created++;
      await new Promise(r => setTimeout(r, 600));
    }

    for (let i = 0; i < STAFF_ROLES.length; i++) {
      const roleInfo = STAFF_ROLES[i];
      const exists = guild.roles.cache.find(r => r.name === roleInfo.name);
      if (exists) { await exists.setPermissions(STAFF_PERMISSIONS[i]).catch(console.error); skipped++; continue; }
      await guild.roles.create({ name: roleInfo.name, color: roleInfo.color, permissions: STAFF_PERMISSIONS[i], reason: 'Setup staff Zenyth' }).catch(console.error);
      created++;
      await new Promise(r => setTimeout(r, 600));
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('✅ Setup terminé !')
      .setDescription(`**${created}** rôle(s) créé(s)\n**${skipped}** rôle(s) mis à jour`)
      .addFields(
        { name: '⚠️ Important', value: 'Va dans **Paramètres > Rôles** et ordonne les rôles du plus haut au plus bas !' }
      );
    await interaction.editReply({ embeds: [embed] });
  },
};