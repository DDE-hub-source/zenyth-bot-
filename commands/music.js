import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  entersState,
} from '@discordjs/voice';
import play from 'play-dl';
import { client } from '../index.js';

// ─── FILE D'ATTENTE ────────────────────────────────────────────────────────────
function getQueue(guildId) {
  if (!client.musicQueues.has(guildId)) {
    client.musicQueues.set(guildId, {
      songs: [],
      player: null,
      connection: null,
      volume: 0.5,
      loop: false,
    });
  }
  return client.musicQueues.get(guildId);
}

async function playSong(queue, guildId, textChannel) {
  if (!queue.songs.length) {
    queue.connection?.destroy();
    client.musicQueues.delete(guildId);
    textChannel.send('🎵 File d\'attente vide, déconnexion.');
    return;
  }

  const song = queue.songs[0];
  const stream = await play.stream(song.url, { quality: 2 }).catch(() => null);
  if (!stream) {
    textChannel.send('❌ Impossible de lire cette piste, passage à la suivante.');
    queue.songs.shift();
    return playSong(queue, guildId, textChannel);
  }

  const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
  resource.volume?.setVolume(queue.volume);
  queue.player.play(resource);

  queue.player.once(AudioPlayerStatus.Idle, () => {
    if (!queue.loop) queue.songs.shift();
    playSong(queue, guildId, textChannel);
  });

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('🎵 En cours de lecture')
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields(
      { name: '⏱️ Durée', value: song.duration, inline: true },
      { name: '👤 Demandé par', value: song.requestedBy, inline: true },
      { name: '🔁 Boucle', value: queue.loop ? 'Activée' : 'Désactivée', inline: true },
    )
    .setThumbnail(song.thumbnail);
  textChannel.send({ embeds: [embed] });
}

// ─── COMMANDE : /play ─────────────────────────────────────────────────────────
export const play_cmd = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Jouer une musique YouTube')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Titre ou lien YouTube').setRequired(true)),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: '❌ Rejoins un salon vocal d\'abord !', ephemeral: true });

    await interaction.deferReply();
    const query = interaction.options.getString('query');

    let songInfo;
    try {
      const isUrl = play.yt_validate(query) === 'video';
      if (isUrl) {
        const info = await play.video_info(query);
        songInfo = info.video_details;
      } else {
        const results = await play.search(query, { source: { youtube: 'video' }, limit: 1 });
        if (!results.length) return interaction.editReply('❌ Aucun résultat trouvé.');
        songInfo = results[0];
      }
    } catch {
      return interaction.editReply('❌ Erreur lors de la recherche.');
    }

    const song = {
      title: songInfo.title,
      url: songInfo.url,
      duration: songInfo.durationRaw || 'Inconnue',
      thumbnail: songInfo.thumbnails?.[0]?.url || '',
      requestedBy: interaction.user.username,
    };

    const queue = getQueue(interaction.guildId);

    // Connexion vocale
    if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch(() => null);
      queue.connection = connection;
      queue.player = createAudioPlayer();
      connection.subscribe(queue.player);
    }

    queue.songs.push(song);

    if (queue.songs.length === 1) {
      await playSong(queue, interaction.guildId, interaction.channel);
      await interaction.editReply(`🎵 Lecture de **${song.title}**`);
    } else {
      await interaction.editReply(`✅ **${song.title}** ajouté à la file d'attente (position ${queue.songs.length}).`);
    }
  },
};

// ─── COMMANDE : /skip ─────────────────────────────────────────────────────────
export const skip = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Passer à la musique suivante'),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue?.songs.length) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    queue.player.stop();
    await interaction.reply('⏭️ Musique passée !');
  },
};

// ─── COMMANDE : /stop ─────────────────────────────────────────────────────────
export const stop = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stopper la musique et déconnecter'),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    queue.songs = [];
    queue.player?.stop();
    queue.connection?.destroy();
    client.musicQueues.delete(interaction.guildId);
    await interaction.reply('⏹️ Musique stoppée, déconnexion.');
  },
};

// ─── COMMANDE : /pause ────────────────────────────────────────────────────────
export const pause = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Mettre en pause / Reprendre'),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue?.player) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
      queue.player.unpause();
      await interaction.reply('▶️ Reprise de la lecture.');
    } else {
      queue.player.pause();
      await interaction.reply('⏸️ Lecture en pause.');
    }
  },
};

// ─── COMMANDE : /volume ───────────────────────────────────────────────────────
export const volume = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Changer le volume (1-100)')
    .addIntegerOption(opt =>
      opt.setName('niveau').setDescription('Volume entre 1 et 100').setRequired(true).setMinValue(1).setMaxValue(100)),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    const vol = interaction.options.getInteger('niveau') / 100;
    queue.volume = vol;
    await interaction.reply(`🔊 Volume réglé à **${interaction.options.getInteger('niveau')}%**`);
  },
};

// ─── COMMANDE : /file ─────────────────────────────────────────────────────────
export const file = {
  data: new SlashCommandBuilder().setName('file').setDescription('Afficher la file d\'attente'),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue?.songs.length) return interaction.reply({ content: '❌ File d\'attente vide.', ephemeral: true });

    const list = queue.songs.map((s, i) =>
      `${i === 0 ? '▶️' : `${i}.`} **${s.title}** (${s.duration}) — par ${s.requestedBy}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('🎵 File d\'attente')
      .setDescription(list.slice(0, 4000));
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── COMMANDE : /loop ─────────────────────────────────────────────────────────
export const loop = {
  data: new SlashCommandBuilder().setName('loop').setDescription('Activer/désactiver la boucle'),
  async execute(interaction) {
    const queue = client.musicQueues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    queue.loop = !queue.loop;
    await interaction.reply(`🔁 Boucle **${queue.loop ? 'activée' : 'désactivée'}**.`);
  },
};
