import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { client } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data/users.json');

function loadDB() {
  if (!existsSync(DB_PATH)) return {};
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

const app = express();
app.use(cors());
app.use(express.json());

// Stats générales
app.get('/api/stats', (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json({ error: 'Bot non connecté' });
  const db = loadDB();
  const totalMessages = Object.values(db).reduce((a, u) => a + (u.messages || 0), 0);
  const totalVocal = Object.values(db).reduce((a, u) => a + (u.voiceMinutes || 0), 0);
  res.json({
    members: guild.memberCount,
    name: guild.name,
    messages: totalMessages,
    vocalHours: Math.floor(totalVocal / 60),
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
  });
});

// Liste des membres
app.get('/api/members', (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json([]);
  const db = loadDB();
  const members = [];
  guild.members.cache.forEach(m => {
    if (m.user.bot) return;
    const data = db[m.id] || { messages: 0, voiceMinutes: 0, warns: [], level: 1 };
    members.push({
      id: m.id,
      username: m.user.username,
      tag: m.user.tag,
      avatar: m.user.displayAvatarURL(),
      roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      level: data.level || 1,
      messages: data.messages || 0,
      vocalHours: Math.floor((data.voiceMinutes || 0) / 60),
      warns: data.warns || [],
      joinedAt: m.joinedAt,
    });
  });
  members.sort((a, b) => b.level - a.level);
  res.json(members);
});

// Liste des rôles
app.get('/api/roles', (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json([]);
  const roles = [];
  guild.roles.cache.forEach(r => {
    if (r.name === '@everyone') return;
    roles.push({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      members: r.members.size,
      permissions: r.permissions.toArray(),
      position: r.position,
    });
  });
  roles.sort((a, b) => b.position - a.position);
  res.json(roles);
});

// Créer un rôle
app.post('/api/roles', async (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json({ error: 'Bot non connecté' });
  const { name, color } = req.body;
  try {
    const role = await guild.roles.create({ name, color: color || '#7c3aed' });
    res.json({ success: true, role: { id: role.id, name: role.name, color: role.hexColor } });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Supprimer un rôle
app.delete('/api/roles/:id', async (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json({ error: 'Bot non connecté' });
  try {
    const role = guild.roles.cache.get(req.params.id);
    if (!role) return res.json({ error: 'Rôle introuvable' });
    await role.delete();
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Donner un rôle à un membre
app.post('/api/members/:id/roles', async (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json({ error: 'Bot non connecté' });
  const { roleId } = req.body;
  try {
    const member = await guild.members.fetch(req.params.id);
    await member.roles.add(roleId);
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Retirer un rôle
app.delete('/api/members/:id/roles/:roleId', async (req, res) => {
  const guild = client.guilds.cache.first();
  if (!guild) return res.json({ error: 'Bot non connecté' });
  try {
    const member = await guild.members.fetch(req.params.id);
    await member.roles.remove(req.params.roleId);
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Ban
app.post('/api/members/:id/ban', async (req, res) => {
  const guild = client.guilds.cache.first();
  const { reason } = req.body;
  try {
    await guild.members.ban(req.params.id, { reason });
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Kick
app.post('/api/members/:id/kick', async (req, res) => {
  const guild = client.guilds.cache.first();
  try {
    const member = await guild.members.fetch(req.params.id);
    await member.kick(req.body.reason);
    res.json({ success: true });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Logs
app.get('/api/logs', (req, res) => {
  const logFile = join(__dirname, 'data/logs.json');
  if (!existsSync(logFile)) return res.json([]);
  res.json(JSON.parse(readFileSync(logFile, 'utf-8')));
});

// Lancer le serveur
export function startAPI() {
  app.listen(3000, () => {
    console.log('🌐 Panel API démarré sur http://localhost:3000');
  });
}