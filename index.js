import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import 'dotenv/config';
import { startAPI } from './api.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = new Collection();
client.musicQueues = new Map();

async function main() {
  const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
  const allCommands = [];

  for (const file of commandFiles) {
    const filePath = pathToFileURL(join(__dirname, 'commands', file)).href;
    const mod = await import(filePath);
    for (const [name, cmd] of Object.entries(mod)) {
      if (cmd?.data && cmd?.execute) {
        client.commands.set(cmd.data.name, cmd);
        allCommands.push(cmd.data.toJSON());
      }
    }
  }

  const eventFiles = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = pathToFileURL(join(__dirname, 'events', file)).href;
    const event = await import(filePath);
    const ev = event.default;
    if (!ev) continue;
    if (ev.once) client.once(ev.name, (...args) => ev.execute(...args));
    else client.on(ev.name, (...args) => ev.execute(...args));
  }

  const rest = new REST().setToken(process.env.TOKEN);
  try {
    console.log('🔄 Déploiement des commandes slash...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: allCommands }
    );
    console.log(`✅ ${allCommands.length} commande(s) déployée(s) !`);
  } catch (err) {
    console.error('Erreur déploiement commandes:', err);
  }

  startAPI();
  client.login(process.env.TOKEN);
}

main();