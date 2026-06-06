import { Events, EmbedBuilder } from 'discord.js';
import { handleTicketButton, handleTicketClose } from '../commands/tickets.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {

    // ─── Boutons ───────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_') && interaction.customId !== 'ticket_close' && interaction.customId !== 'ticket_close_confirm' && interaction.customId !== 'ticket_close_cancel') {
        return handleTicketButton(interaction);
      }
      if (interaction.customId === 'ticket_close') {
        return handleTicketClose(interaction);
      }
      return;
    }

    // ─── Commandes slash ───────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Erreur commande /${interaction.commandName}:`, error);
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Une erreur est survenue')
        .setDescription('Une erreur interne s\'est produite.');
      const reply = { embeds: [embed], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};
