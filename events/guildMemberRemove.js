import { Events, EmbedBuilder } from 'discord.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const logChannel = member.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('📤 Membre parti')
      .setDescription(`**${member.user.tag}** a quitté le serveur.`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  },
};
