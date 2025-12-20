import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType} from "discord.js";

import { LogPlay } from "../google/LogPlay.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getRandomRow } from "../google/GetRandomRow.js";

const buildEmbed = (row, param) => {
  const description = param === "store" ? `${row[0]}\n${row[1]}` : `🎵 **${row[0]}**\n💿 *${row[1]}*`;
  return {
    title: "🎲 Random Pick",
    description: escapeColons(description),
    color: 0x5865f2,
  };
};

const buildRow = ({ showPlay, disabled = false }) => {
  const buttons = [];

  if (showPlay) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("play")
        .setLabel("▶️ Play")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("reroll")
      .setLabel("🔁 Reroll")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );

  return new ActionRowBuilder().addComponents(buttons);
};

export const ProcessRandom = async (message) => {
  const args = message.content.split(" ").slice(1);
  const param = args[0]?.toLowerCase();
  const isStore = param === "store";

  let sheetName = process.env.ALBUM_SHEET_NAME;
  let filterColumnIndex = null;
  let filterValue = null;

  if (isStore) {
    sheetName = process.env.LOCATIONS_SHEET_NAME;
  } else if (param) {
    filterColumnIndex = 9; // column J
    filterValue = param;
  }

  const fetchRow = async () =>
    getRandomRow({
      sheetName,
      filterColumnIndex,
      filterValue,
    });

  try {
    let row = await fetchRow();

    if (!row) {
      await message.reply("❌ No matching entries found.");
      return;
    }

    const sentMessage = await message.reply({
      embeds: [buildEmbed(row, param)],
      components: [buildRow({ showPlay: !isStore })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: "You can't use these buttons.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.customId === "play") {
        const username = getDropdownValue(message.author.username);
        const [artist, album] = row;

        await LogPlay(artist, album, username);

        // Remove buttons from original embed
        await interaction.update({
          embeds: [buildEmbed(row, param)],
          components: [],
        });

        // Public confirmation in chat
        await interaction.followUp({
          content: `▶️ **Play logged:** ${artist} — *${album}*`,
        });

        collector.stop();
        return;
      }

      if (interaction.customId === "reroll") {
        row = await fetchRow();

        if (!row) {
          await interaction.reply({
            content: "❌ No matching entries found.",
            ephemeral: true,
          });
          return;
        }

        await interaction.update({
          embeds: [buildEmbed(row, param)],
          components: [buildRow({ showPlay: !isStore })],
        });
      }
    });

    collector.on("end", () => {
      sentMessage
        .edit({
          components: [
            buildRow({
              showPlay: !isStore,
              disabled: true,
            }),
          ],
        })
        .catch(() => {});
    });
  } catch (err) {
    console.error(err);
    await message.reply("❌ Failed to fetch random entry.");
  }
};
