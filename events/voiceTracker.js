import { Events, EmbedBuilder } from 'discord.js';
import { handleVoiceUpdate } from '../commands/hierarchy.js';

const EDIT_ROLE_ID = '1510748943435436083';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {

    await handleVoiceUpdate(oldState, newState).catch(console.error);

    // Détection move clic droit
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId && newState.member && !newState.member.user.bot) {
      try {
        const guild = newState.guild;
        const auditLogs = await guild.fetchAuditLogs({ type: 26, limit: 1 });
        const log = auditLogs.entries.first();
        if (!log) return;
        if (Date.now() - log.createdTimestamp > 3000) return;
        const executor = await guild.members.fetch(log.executor.id).catch(() => null);
        if (!executor || executor.user.bot) return;
        if (executor.roles.cache.has(EDIT_ROLE_ID)) return;
        await executor.kick('Move clic droit non autorisé').catch(console.error);
        const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (logChannel) {
          const embed = new EmbedBuilder().setColor(0xef4444).setTitle('🚫 Kick — Move non autorisé').setDescription(`**${executor.user.tag}** kické pour move clic droit.`).setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
      } catch (err) { console.error('Erreur move:', err); }
    }

    // Détection mute clic droit
    if (!oldState.serverMute && newState.serverMute && newState.member && !newState.member.user.bot) {
      try {
        const guild = newState.guild;
        const auditLogs = await guild.fetchAuditLogs({ type: 24, limit: 1 });
        const log = auditLogs.entries.first();
        if (!log) return;
        if (Date.now() - log.createdTimestamp > 3000) return;
        const executor = await guild.members.fetch(log.executor.id).catch(() => null);
        if (!executor || executor.user.bot) return;
        if (executor.roles.cache.has(EDIT_ROLE_ID)) return;
        await newState.member.voice.setMute(false).catch(() => {});
        await executor.kick('Mute clic droit non autorisé').catch(console.error);
        const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (logChannel) {
          const embed = new EmbedBuilder().setColor(0xef4444).setTitle('🚫 Kick — Mute non autorisé').setDescription(`**${executor.user.tag}** kické pour mute clic droit.`).setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
      } catch (err) { console.error('Erreur mute:', err); }
    }
  },
};