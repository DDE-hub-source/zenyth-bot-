import { Events, EmbedBuilder } from 'discord.js';

const AUTO_ROLE_NAME = 'Membre';
const WELCOME_CHANNEL_NAME = 'bienvenue';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guild = member.guild;
    const welcomeChannel = guild.channels.cache.find(
      ch => ch.name.toLowerCase().includes(WELCOME_CHANNEL_NAME)
    );
    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`👋 Bienvenue sur ${guild.name} !`)
        .setDescription(`Salut ${member} ! Tu es le **${guild.memberCount}ème** membre !\n\n📋 Lis les règles et amuse-toi bien 🎉`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();
      welcomeChannel.send({ embeds: [embed] });
    }
    const role = guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
    if (role) await member.roles.add(role).catch(console.error);

    const logChannel = guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('📥 Nouveau membre')
        .setDescription(`${member.user.tag} a rejoint le serveur.`)
        .setTimestamp();
      logChannel.send({ embeds: [logEmbed] });
    }
  },
};
