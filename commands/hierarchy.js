import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/users.json');
const EDIT_ROLE_ID = '1510748943435436083';

function loadDB() {
  if (!existsSync(DB_PATH)) writeFileSync(DB_PATH, '{}');
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function getUser(db, id) {
  if (!db[id]) db[id] = { xp: 0, level: 1, warns: [], messages: 0, voiceMinutes: 0 };
  return db[id];
}

export const HIERARCHY = [
  { name: '🌱 Assistant',  minVoiceHours: 10,  minMessages: 250,  perms: 1 },
  { name: '🏅 Gouverneur', minVoiceHours: 20,  minMessages: 500,  perms: 1 },
  { name: '🛡️ Modérateur', minVoiceHours: 35,  minMessages: 750,  perms: 1 },
  { name: '⚔️ Templier',   minVoiceHours: 50,  minMessages: 1000, perms: 2 },
  { name: '🏛️ Pilier',     minVoiceHours: 65,  minMessages: 1250, perms: 2 },
  { name: '🚀 Matrixé',    minVoiceHours: 80,  minMessages: 1500, perms: 2 },
  { name: '🔑 Parrain',    minVoiceHours: 100, minMessages: 0,    perms: 3 },
  { name: '⚜️ Conseiller', minVoiceHours: 125, minMessages: 0,    perms: 3 },
  { name: '⭐ Légende',    minVoiceHours: 150, minMessages: 0,    perms: 3 },
  { name: '♟️ Cavalier',   minVoiceHours: 170, minMessages: 0,    perms: 4 },
  { name: '🏆 Maître',     minVoiceHours: 185, minMessages: 0,    perms: 4 },
  { name: '👑 Royauté',    minVoiceHours: 200, minMessages: 0,    perms: 4 },
];

export function getCurrentRole(voiceHours, messages) {
  let current = null;
  for (const role of HIERARCHY) {
    const voiceOk = voiceHours >= role.minVoiceHours;
    const msgOk = role.minMessages === 0 || messages >= role.minMessages;
    if (voiceOk && msgOk) current = role;
  }
  return current;
}

export async function updateMemberRole(member, voiceHours, messages) {
  const earned = getCurrentRole(voiceHours, messages);
  if (!earned) return null;
  const allRoleNames = HIERARCHY.map(r => r.name);
  const currentRoles = member.roles.cache.filter(r => allRoleNames.includes(r.name));
  const hasRole = member.roles.cache.find(r => r.name === earned.name);
  if (hasRole && currentRoles.size === 1) return null;
  for (const role of currentRoles.values()) await member.roles.remove(role).catch(() => {});
  const newRole = member.guild.roles.cache.find(r => r.name === earned.name);
  if (newRole) { await member.roles.add(newRole).catch(() => {}); return earned; }
  return null;
}

const voiceSessions = new Map();
export function startVoiceSession(userId) { voiceSessions.set(userId, Date.now()); }
export function endVoiceSession(userId) {
  const start = voiceSessions.get(userId);
  if (!start) return 0;
  voiceSessions.delete(userId);
  return Math.floor((Date.now() - start) / 60000);
}

export async function handleVoiceUpdate(oldState, newState) {
  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  if (!oldState.channelId && newState.channelId) { startVoiceSession(userId); }
  if (oldState.channelId && !newState.channelId) {
    const minutes = endVoiceSession(userId);
    if (minutes <= 0) return;
    const db = loadDB();
    const user = getUser(db, userId);
    user.voiceMinutes = (user.voiceMinutes || 0) + minutes;
    saveDB(db);
    const voiceHours = user.voiceMinutes / 60;
    const newRole = await updateMemberRole(member, voiceHours, user.messages || 0);
    if (newRole) {
      const channel = member.guild.systemChannel ||
        member.guild.channels.cache.find(c => c.name.includes('général') || c.name.includes('general'));
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle('🎉 Nouveau rang !')
          .setDescription(`${member} a atteint le rang **${newRole.name}** !`)
          .setThumbnail(member.user.displayAvatarURL());
        channel.send({ embeds: [embed] });
      }
    }
  }
}

export const progression = {
  data: new SlashCommandBuilder()
    .setName('progression')
    .setDescription('Voir ta progression vers le prochain rang')
    .addUserOption(opt => opt.setName('membre').setDescription('Voir la progression d\'un autre membre')),
  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('membre') || interaction.user;
    const db = loadDB();
    const user = getUser(db, target.id);
    const voiceHours = (user.voiceMinutes || 0) / 60;
    const messages = user.messages || 0;
    const current = getCurrentRole(voiceHours, messages);
    let next = null;
    for (const role of HIERARCHY) {
      const voiceOk = voiceHours >= role.minVoiceHours;
      const msgOk = role.minMessages === 0 || messages >= role.minMessages;
      if (!voiceOk || !msgOk) { next = role; break; }
    }
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
      .setTitle('📊 Progression')
      .addFields(
        { name: '🎖️ Rang actuel', value: current ? current.name : 'Aucun', inline: true },
        { name: '🎙️ Heures vocal', value: `${voiceHours.toFixed(1)}h`, inline: true },
        { name: '✉️ Messages', value: `${messages}`, inline: true },
      );
    if (next) {
      const voiceLeft = Math.max(0, next.minVoiceHours - voiceHours).toFixed(1);
      const msgLeft = Math.max(0, next.minMessages - messages);
      let nextInfo = `**${next.name}**\n`;
      if (voiceLeft > 0) nextInfo += `🎙️ Encore **${voiceLeft}h** de vocal\n`;
      if (msgLeft > 0) nextInfo += `✉️ Encore **${msgLeft}** messages`;
      embed.addFields({ name: '🎯 Prochain rang', value: nextInfo });
    } else {
      embed.addFields({ name: '🎯 Rang max', value: 'Tu as atteint le rang maximum !' });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};

export const rank = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Donner un rôle à un membre')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true))
    .addStringOption(opt => opt.setName('role').setDescription('Nom du rôle').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.member.roles.cache.has(EDIT_ROLE_ID)) {
      return interaction.editReply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande !' });
    }
    const target = interaction.options.getMember('membre');
    const roleName = interaction.options.getString('role');
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return interaction.editReply({ content: `❌ Le rôle **${roleName}** n'existe pas !` });
    await target.roles.add(role);
    const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle('⭐ Rôle attribué').setDescription(`${target} a reçu le rôle **${roleName}** !`);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const derank = {
  data: new SlashCommandBuilder()
    .setName('derank')
    .setDescription('Retirer un rôle à un membre')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre').setRequired(true))
    .addStringOption(opt => opt.setName('role').setDescription('Nom du rôle').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.member.roles.cache.has(EDIT_ROLE_ID)) {
      return interaction.editReply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande !' });
    }
    const target = interaction.options.getMember('membre');
    const roleName = interaction.options.getString('role');
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return interaction.editReply({ content: `❌ Rôle introuvable.` });
    await target.roles.remove(role);
    const embed = new EmbedBuilder().setColor(0xef4444).setTitle('🔻 Rôle retiré').setDescription(`Le rôle **${roleName}** a été retiré à ${target}.`);
    await interaction.editReply({ embeds: [embed] });
  },
};

export const hierarchie = {
  data: new SlashCommandBuilder()
    .setName('hierarchie')
    .setDescription('Afficher tous les rangs et leurs conditions'),
  async execute(interaction) {
    await interaction.deferReply();
    const perms = [1, 2, 3, 4];
    const colors = [0x22c55e, 0x3b82f6, 0xa855f7, 0xf59e0b];
    const embeds = [];
    for (const p of perms) {
      const roles = HIERARCHY.filter(r => r.perms === p);
      const desc = roles.map(r => {
        let cond = `🎙️ ${r.minVoiceHours}h vocal`;
        if (r.minMessages > 0) cond += ` + ✉️ ${r.minMessages} msgs`;
        return `${r.name} — ${cond}`;
      }).join('\n');
      embeds.push(new EmbedBuilder().setColor(colors[p - 1]).setTitle(`PERMS ${p}`).setDescription(desc));
    }
    await interaction.editReply({ embeds });
  },
};