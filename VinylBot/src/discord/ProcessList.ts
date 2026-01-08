import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder, Message} from "discord.js";

import { SearchResponse } from "../interfaces/SearchResponse.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getVinylsByQuery } from "../services/vinyls.api.js";
import { getWantList } from "../services/wantlist.api.js";
import { parseCommand } from "../utils/parseCommand.js";

const generateEmbed = (list: SearchResponse[], page: number, totalPages: number, type: string, term: string, listType: 'want' | 'have', pageSize = 10) => {
  const start = page * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  const description = pageItems
    .map((item: SearchResponse, idx: number) => `${start + idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`)
    .join("\n");

  const listName = listType === "want" ? "Want List" : "Collection";
  const title = type === "full"
    ? `The ${listName} (Page ${page + 1}/${totalPages})`
    : `${listName} matches for "${term}" (Page ${page + 1}/${totalPages})`;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || "No items found on this page.")
    .setColor(listType === "want" ? 0x3498db : 0x1db954); // Blue for want, Green for have
};

const generateRow = (currentPage: number, totalPages: number) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1)
  );

export const ProcessList = async (message: Message, listType: 'want' | 'have') => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const { type, term } = await parseCommand(args);

  try {
    const list = listType === 'have' ? await getVinylsByQuery({ type, term }) : await getWantList({ type, term });

    if (!list.length) {
      await message.reply(`❌ Nothing found in the ${listType === 'have' ? 'collection' : 'want list'}.`);
      return;
    }

    // 2. Setup Pagination
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    let currentPage = 0;

    const sentMessage = await message.reply({
      embeds: [generateEmbed(list, currentPage, totalPages, type, term, listType, PAGE_SIZE)],
      components: [generateRow(currentPage, totalPages)],
    });

    // 3. Button Collector
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on("collect", async (interaction: ButtonInteraction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "You can't control this pagination.", ephemeral: true });
        return;
      }

      if (interaction.customId === "prev") currentPage--;
      else if (interaction.customId === "next") currentPage++;

      await interaction.update({
        embeds: [generateEmbed(list, currentPage, totalPages, type, term, listType, PAGE_SIZE)],
        components: [generateRow(currentPage, totalPages)],
      });
    });

    collector.on("end", () => {
      const disabledRow = generateRow(currentPage, totalPages);
      disabledRow.components.forEach((btn) => btn.setDisabled(true));
      sentMessage.edit({ components: [disabledRow] }).catch(() => {});
    });

  } catch (error) {
    console.error("Error in ProcessList:", error);
    await message.reply("⚠️ An error occurred while fetching the list from the database.");
  }
};