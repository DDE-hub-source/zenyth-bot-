import { Events } from 'discord.js';
import { handleXP } from '../commands/moderation.js';

const xpCooldown = new Set();

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const key = `${message.guild.id}-${message.author.id}`;
    if (!xpCooldown.has(key)) {
      xpCooldown.add(key);
      setTimeout(() => xpCooldown.delete(key), 60000);
      await handleXP(message).catch(console.error);
    }
  },
};
