import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder} from "discord.js";

import { getWantList } from "../google/GetWantList.js";
import { isInList } from "../utils/userParser.js";

const parseCommand = (messageArgs) => {
  const words = messageArgs.split(/\s+/).filter(Boolean);

  if (words.length === 0) return { type: "full", term: "" };
  if (words.length === 1 && isInList(words[0])) return { type: "user", term: words[0] };
  return { type: "artist", term: messageArgs };
};

const generateEmbed = (wantList, page, totalPages, type, term, pageSize = 10) => {
  const start = page * pageSize;
  const pageItems = wantList.slice(start, start + pageSize);

  const description = pageItems
    .map((item, idx) => `${start + idx + 1}. ${item[0]} - ${item[1]}`)
    .join("\n");

  const title =
    type === "full"
      ? `The Want List (Page ${page + 1}/${totalPages})`
      : `The Want List for "${term}" (Page ${page + 1}/${totalPages})`;

  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x1db954);
};

const generateRow = (currentPage, totalPages) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1)
  );

export const ProcessWantList = async (message) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const { type, term } = parseCommand(args);

  const wantList = await getWantList({ type, term });

  if (!wantList.length) {
    message.reply("❌ There's nothing on the list.");
    return;
  }

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(wantList.length / PAGE_SIZE);
  let currentPage = 0;

  // Send initial message
  const sentMessage = await message.reply({
    embeds: [generateEmbed(wantList, currentPage, totalPages, type, term, PAGE_SIZE)],
    components: [generateRow(currentPage, totalPages)],
  });

  // Create a collector for button interactions
  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000, // 5 minutes timeout
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      interaction.reply({ content: "You can't control this pagination.", ephemeral: true });
      return;
    }

    if (interaction.customId === "prev") currentPage--;
    else if (interaction.customId === "next") currentPage++;

    await interaction.update({
      embeds: [generateEmbed(wantList, currentPage, totalPages, type, term, PAGE_SIZE)],
      components: [generateRow(currentPage, totalPages)],
    });
  });

  collector.on("end", () => {
    // Disable buttons after collector ends
    const disabledRow = generateRow(currentPage, totalPages).setComponents(
      generateRow(currentPage, totalPages).components.map((btn) => btn.setDisabled(true))
    );

    sentMessage.edit({ components: [disabledRow] }).catch(() => {});
  });
};
