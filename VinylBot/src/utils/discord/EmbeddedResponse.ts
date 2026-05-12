import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder, Message} from "discord.js";

interface EmbeddedResponseOptions<T> {
  message: Message;
  title: string;
  list: T[];
  pageSize?: number;
  color?: number; // Added this
  formatItem: (item: T, index: number) => string;
}

export const EmbeddedResponse = async <T>({message, title, list, pageSize = 10, formatItem, color = undefined}: EmbeddedResponseOptions<T>) => {
  if (!list.length) {
    await message.reply("❌ No items found.");
    return;
  }

  const totalPages = Math.ceil(list.length / pageSize);
  let currentPage = 0;

  const generateEmbed = (page: number) => {
    const start = page * pageSize;
    const description = list
      .slice(start, start + pageSize)
      .map((item, idx) => formatItem(item, start + idx))
      .join("\n");

    return new EmbedBuilder()
      .setTitle(`${title} (Page ${page + 1}/${totalPages})`)
      .setDescription(description || "No items found on this page.")
      .setColor(color ?? 0x1db954);
  };

  const generateRow = (page: number) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1)
    );

  const sentMessage = await message.reply({
    embeds: [generateEmbed(currentPage)],
    components: [generateRow(currentPage)],
  });

  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: "You can't control this pagination.", ephemeral: true });
      return;
    }

    if (interaction.customId === "prev") currentPage--;
    else if (interaction.customId === "next") currentPage++;

    await interaction.update({
      embeds: [generateEmbed(currentPage)],
      components: [generateRow(currentPage)],
    });
  });

  collector.on("end", () => {
    const disabledRow = generateRow(currentPage);
    disabledRow.components.forEach((btn) => btn.setDisabled(true));
    sentMessage.edit({ components: [disabledRow] }).catch(() => {});
  });
};