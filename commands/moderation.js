import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/users.json');

// ─── BASE DE DONNÉES UTILISATEURS (JSON simple) ───────────────────────────────
function loadDB() {
  if (!existsSync(DB_PATH)) writeFileSync(DB_PATH, '{}');
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function getUser(db, id) {
  if (!db[id]) db[id] = { xp: 0, level: 1, warns: [], messages: 0 };
  return db[id];
}

// ─── HIÉRARCHIE DES RÔLES ────────────────────────────────────────────────────
// Définissez les noms de vos rôles par ordre croissant dans votre .env ou ici
const HIERARCHY_ROLES = [
  { name: 'Membre',     minLevel: 1  },
  { name: 'Actif',      minLevel: 5  },
  { name: 'Vétéran',    minLevel: 15 },
  { name: 'Élite',      minLevel: 30 },
  { name: 'Légende',    minLevel: 50 },
];

export async function handleXP(message) {
  if (message.author.bot) return;
  const db = loadDB();
  const user = getUser(db, message.author.id);

  const gained = Math.floor(Math.random() * 10) + 5;
  user.xp += gained;
  user.messages += 1;

  // Calcul du niveau (formule : niveau * 100 XP par niveau)
  const xpRequired = user.level * 100;
  if (user.xp >= xpRequired) {
    user.xp -= xpRequired;
    user.level += 1;

    // Envoi d'un message de level up
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('🎉 Level Up !')
      .setDescription(`${message.author} est passé au **niveau ${user.level}** !`)
      .setThumbnail(message.author.displayAvatarURL());
    message.channel.send({ embeds: [embed] });

    // Attribution du rôle hiérarchique
    const guild = message.guild;
    const member = await guild.members.fetch(message.author.id);
    for (const roleInfo of HIERARCHY_ROLES) {
      if (user.level >= roleInfo.minLevel) {
        const role = guild.roles.cache.find(r => r.name === roleInfo.name);
        if (role && !member.roles.cache.has(role.id)) {
          // Retirer les anciens rôles de hiérarchie
          for (const old of HIERARCHY_ROLES) {
            const oldRole = guild.roles.cache.find(r => r.name === old.name);
            if (oldRole && member.roles.cache.has(oldRole.id)) {
              await member.roles.remove(oldRole).catch(() => {});
            }
          }
          await member.roles.add(role).catch(() => {});
          message.channel.send(
            `✨ ${message.author} a obtenu le rôle **${roleInfo.name}** !`
          );
        }
      }
    }
  }

  saveDB(db);
}

// ─── COMMANDE : /rang ─────────────────────────────────────────────────────────
export const rang = {
  data: new SlashCommandBuilder()
    .setName('rang')
    .setDescription('Affiche ton niveau et ton XP')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Voir le rang d\'un autre membre')),
  async execute(interaction) {
    const target = interaction.options.getUser('membre') || interaction.user;
    const db = loadDB();
    const user = getUser(db, target.id);
    const xpRequired = user.level * 100;
    const progress = Math.floor((user.xp / xpRequired) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    // Rang dans la hiérarchie
    let currentRole = HIERARCHY_ROLES[0];
    for (const r of HIERARCHY_ROLES) {
      if (user.level >= r.minLevel) currentRole = r;
    }
    let nextRole = null;
    for (const r of HIERARCHY_ROLES) {
      if (user.level < r.minLevel) { nextRole = r; break; }
    }

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
      .setTitle(`Profil de ${target.username}`)
      .addFields(
        { name: '🏅 Rôle actuel', value: currentRole.name, inline: true },
        { name: '📊 Niveau', value: `${user.level}`, inline: true },
        { name: '✉️ Messages', value: `${user.messages}`, inline: true },
        { name: `⚡ XP [${bar}]`, value: `${user.xp} / ${xpRequired}` },
        nextRole
          ? { name: '🎯 Prochain rôle', value: `${nextRole.name} (niveau ${nextRole.minLevel})` }
          : { name: '🎯 Rang max', value: 'Vous avez atteint le rang maximum !' }
      );
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── COMMANDE : /classement ───────────────────────────────────────────────────
export const classement = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Top 10 des membres les plus actifs'),
  async execute(interaction) {
    const db = loadDB();
    const sorted = Object.entries(db)
      .sort(([, a], [, b]) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    const medals = ['🥇','🥈','🥉'];
    let desc = '';
    for (let i = 0; i < sorted.length; i++) {
      const [id, data] = sorted[i];
      const medal = medals[i] || `**${i + 1}.**`;
      desc += `${medal} <@${id}> — Niveau ${data.level} (${data.messages} msgs)\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('🏆 Classement du serveur')
      .setDescription(desc || 'Aucune donnée encore.');
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── COMMANDE : /ban ─────────────────────────────────────────────────────────
export const ban = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison du ban'))
    .addIntegerOption(opt =>
      opt.setName('jours').setDescription('Jours de messages à supprimer (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
    const jours = interaction.options.getInteger('jours') ?? 0;

    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ Je ne peux pas bannir ce membre.', ephemeral: true });

    // Bouton de confirmation
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ban_confirm').setLabel('✅ Confirmer').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ban_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
    );
    const reply = await interaction.reply({
      content: `⚠️ Confirmer le ban de **${target.user.tag}** pour : *${raison}* ?`,
      components: [row],
      ephemeral: true,
    });

    const collector = reply.createMessageComponentCollector({ time: 15000 });
    collector.on('collect', async btn => {
      if (btn.customId === 'ban_confirm') {
        await target.ban({ deleteMessageSeconds: jours * 86400, reason: raison });
        await logAction(interaction.guild, '🔨 Ban', target.user, interaction.user, raison);
        await btn.update({ content: `✅ **${target.user.tag}** a été banni.`, components: [] });
      } else {
        await btn.update({ content: '❌ Ban annulé.', components: [] });
      }
    });
  },
};

// ─── COMMANDE : /kick ─────────────────────────────────────────────────────────
export const kick = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre du serveur')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
    if (!target?.kickable) return interaction.reply({ content: '❌ Impossible de kick ce membre.', ephemeral: true });
    await target.kick(raison);
    await logAction(interaction.guild, '👢 Kick', target.user, interaction.user, raison);
    await interaction.reply({ content: `✅ **${target.user.tag}** a été expulsé.`, ephemeral: true });
  },
};

// ─── COMMANDE : /mute (timeout) ───────────────────────────────────────────────
export const mute = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mettre un membre en timeout')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à mute').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('duree').setDescription('Durée en minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('membre');
    const duree = interaction.options.getInteger('duree');
    const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
    if (!target) return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    await target.timeout(duree * 60 * 1000, raison);
    await logAction(interaction.guild, `🔇 Mute (${duree}min)`, target.user, interaction.user, raison);
    await interaction.reply({ content: `✅ **${target.user.tag}** est muté pour **${duree} minute(s)**.` });
  },
};

// ─── COMMANDE : /warn ─────────────────────────────────────────────────────────
export const warn = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption(opt =>
      opt.setName('raison').setDescription('Raison').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const raison = interaction.options.getString('raison');
    const db = loadDB();
    const user = getUser(db, target.id);
    user.warns.push({ raison, date: new Date().toISOString(), par: interaction.user.tag });
    saveDB(db);

    await logAction(interaction.guild, '⚠️ Warn', target, interaction.user, raison);

    // Action automatique selon le nb de warns
    let autoAction = '';
    if (user.warns.length >= 5) autoAction = ' — **5 warns : Vérifiez si un ban est nécessaire**';
    else if (user.warns.length >= 3) autoAction = ' — **3 warns : Envisagez un timeout**';

    await interaction.reply({
      content: `⚠️ **${target.tag}** a reçu un avertissement (**${user.warns.length} total**).${autoAction}`,
    });

    // Notif en DM
    target.send(
      `⚠️ Tu as reçu un avertissement sur **${interaction.guild.name}**.\nRaison : *${raison}*\nTotal de warns : ${user.warns.length}`
    ).catch(() => {});
  },
};

// ─── COMMANDE : /warns ────────────────────────────────────────────────────────
export const warns = {
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Voir les avertissements d\'un membre')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const db = loadDB();
    const user = getUser(db, target.id);
    if (!user.warns.length) return interaction.reply({ content: `✅ **${target.tag}** n'a aucun avertissement.` });

    const list = user.warns.map((w, i) =>
      `**${i + 1}.** ${w.raison} — par ${w.par} (${new Date(w.date).toLocaleDateString('fr-FR')})`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`⚠️ Warns de ${target.tag}`)
      .setDescription(list);
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── COMMANDE : /clearwarn ────────────────────────────────────────────────────
export const clearwarn = {
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('Effacer les avertissements d\'un membre')
    .addUserOption(opt =>
      opt.setName('membre').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const db = loadDB();
    const user = getUser(db, target.id);
    user.warns = [];
    saveDB(db);
    await interaction.reply({ content: `✅ Warns de **${target.tag}** effacés.` });
  },
};

// ─── COMMANDE : /purge ────────────────────────────────────────────────────────
export const purge = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Supprimer des messages en masse')
    .addIntegerOption(opt =>
      opt.setName('nombre').setDescription('Nombre de messages à supprimer (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const n = interaction.options.getInteger('nombre');
    const deleted = await interaction.channel.bulkDelete(n, true);
    await interaction.reply({ content: `🗑️ **${deleted.size}** message(s) supprimé(s).`, ephemeral: true });
  },
};

// ─── COMMANDE : /userinfo ─────────────────────────────────────────────────────
export const userinfo = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informations sur un membre')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre')),
  async execute(interaction) {
    const member = interaction.options.getMember('membre') || interaction.member;
    const user = member.user;
    const db = loadDB();
    const userData = getUser(db, user.id);

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🪪 ID', value: user.id, inline: true },
        { name: '📅 Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '📥 A rejoint le', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: '🏅 Rôles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `${r}`).join(' ') || 'Aucun' },
        { name: '📊 Niveau', value: `${userData.level}`, inline: true },
        { name: '⚡ XP', value: `${userData.xp}`, inline: true },
        { name: '⚠️ Warns', value: `${userData.warns.length}`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── HELPER LOGS ──────────────────────────────────────────────────────────────
async function logAction(guild, action, target, mod, raison) {
  const channel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(action.includes('Ban') ? 0xef4444 : action.includes('Kick') ? 0xf97316 : action.includes('Warn') ? 0xf59e0b : 0x6b7280)
    .setTitle(action)
    .addFields(
      { name: '👤 Cible', value: `${target.tag} (${target.id})`, inline: true },
      { name: '🛡️ Modérateur', value: `${mod.tag}`, inline: true },
      { name: '📝 Raison', value: raison },
    )
    .setTimestamp();
  await channel.send({ embeds: [embed] });
}
