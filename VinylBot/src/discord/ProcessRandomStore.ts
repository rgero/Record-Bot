import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, MessageActionRowComponentBuilder } from "discord.js";

import { Location } from "../interfaces/Location.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getPhysicalLocations } from "../services/locations.api.js"

const buildEmbed = (storeName: string, address: string|null) => {
  const description = `**${storeName}**\n${address || "Address not available"}`;
  return {
    title: "🎲 Random Pick",
    description: escapeColons(description),
    color: 0x5865f2,
  };
};

const buildRow = ({ disabled = false }) => {
  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("reroll")
      .setLabel("🔁 Reroll")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
};

const getRandomStore = (list: Location[]): Location => list[Math.floor(Math.random() * list.length)];

export const ProcessRandomStore = async (message: Message) => {
  try {
    const stores = await getPhysicalLocations();

    if (!stores || stores.length === 0) {
      await message.reply("❌ No matching entries found.");
      return;
    }

    let store: Location = getRandomStore(stores);

    const sentMessage = await message.reply({
      embeds: [buildEmbed(store.name, store.address)],
      components: [buildRow({ disabled: false })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "You can't use these buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "reroll") {
        let nextStore = getRandomStore(stores);
        
        // Prevent picking the same store twice in a row
        if (stores.length > 1) {
          while (nextStore.name === store.name) {
            nextStore = getRandomStore(stores);
          }
        }
        
        store = nextStore;

        await interaction.update({
          embeds: [buildEmbed(store.name, store.address)],
          components: [buildRow({ disabled: false })],
        });
      }
    });

    collector.on("end", () => {
      sentMessage
        .edit({
          components: [buildRow({ disabled: true })],
        })
        .catch(() => { /* Message likely deleted */ });
    });
  } catch (err) {
    console.error("Error in ProcessRandomStore:", err);
    await message.reply("❌ Failed to fetch random entry.");
  }
}