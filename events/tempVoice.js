import { Events, ChannelType, PermissionFlagsBits } from 'discord.js';

// ID du salon "Créer un salon" — change ça avec l'ID de ton salon spécial
const CREATE_CHANNEL_ID = process.env.TEMP_VOICE_ID;

const tempChannels = new Map(); // userId -> channelId

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {

    // ─── Quelqu'un rejoint le salon "Créer un salon" ───────────────────────
    if (newState.channelId === CREATE_CHANNEL_ID) {
      const guild = newState.guild;
      const member = newState.member;

      // Créer un salon temporaire
      const channel = await guild.channels.create({
        name: `🎙️ ${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: newState.channel.parentId,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
      });

      // Déplacer le membre dans son nouveau salon
      await member.voice.setChannel(channel).catch(console.error);
      tempChannels.set(member.id, channel.id);
    }

    // ─── Quelqu'un quitte un salon temporaire ─────────────────────────────
    if (oldState.channelId) {
      const channel = oldState.channel;
      if (!channel) return;

      // Si le salon est vide et c'est un salon temporaire → supprimer
      if (channel.members.size === 0 && [...tempChannels.values()].includes(channel.id)) {
        await channel.delete().catch(console.error);
        // Nettoyer la map
        for (const [userId, channelId] of tempChannels) {
          if (channelId === channel.id) tempChannels.delete(userId);
        }
      }
    }
  },
};
