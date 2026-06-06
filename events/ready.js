import { Events, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n✅ Bot connecté en tant que ${client.user.tag}`);
    console.log(`📡 Sur ${client.guilds.cache.size} serveur(s)\n`);

    const statuses = [
      { name: '/help | Serveur prêt !', type: ActivityType.Watching },
      { name: 'la modération 🛡️', type: ActivityType.Watching },
      { name: 'de la musique 🎵', type: ActivityType.Listening },
    ];
    let i = 0;
    setInterval(() => {
      client.user.setActivity(statuses[i % statuses.length]);
      i++;
    }, 15000);
    client.user.setActivity(statuses[0]);
  },
};
