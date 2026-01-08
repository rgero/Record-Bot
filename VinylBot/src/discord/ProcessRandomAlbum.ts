import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, MessageActionRowComponentBuilder} from "discord.js";
import { getVinyls, getVinylsLikedByUserID } from "../services/vinyls.api.js";

import { PlayLog } from "../interfaces/PlayLog.js";
import { User } from "../interfaces/User.js";
import { Vinyl } from "../interfaces/Vinyl.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getUserByName } from "../services/users.api.js";
import { processNewPlay } from "../actions/processNewPlay.js";

const buildEmbed = (artist: string, album: string) => {
  const description = `🎵 **${artist}**\n💿 *${album}*`;
  return {
    title: "🎲 Random Pick",
    description: escapeColons(description),
    color: 0x5865f2,
  };
};

const buildRow = ({ showPlay, disabled = false }: { showPlay: boolean; disabled?: boolean }) => {
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

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);
};


const getRandomVinyl = (list: Vinyl[]): Vinyl => {
  return list[Math.floor(Math.random() * list.length)];
};

export const ProcessRandomAlbum = async (message: Message) => {
  try {
    const args = message.content.split(/\s+/).slice(1);
    const param = args[0]?.toLowerCase().trim();

    let user: User | null = await getUserByName(getDropdownValue(message.author?.username || "Unknown"))
    if (!user) {
      await message.reply("❌ No matching user found.");
      return;
    }

    let vinyls: Vinyl[] = [];

    if (param) {
      user = await getUserByName(param);
      if (!user) {
        await message.reply("❌ No matching user found.");
        return;
      }
      vinyls = await getVinylsLikedByUserID(user.id);
    } else {
      vinyls = await getVinyls();
    }

    if (!vinyls || vinyls.length === 0) {
      await message.reply("❌ No matching entries found.");
      return;
    }

    let currentVinyl = getRandomVinyl(vinyls);

    const sentMessage = await message.reply({
      embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album)],
      components: [buildRow({ showPlay: true })],
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
        collector.stop("played");

        // Remove buttons and update embed
        await interaction.update({
          embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album)],
          components: [],
        });

        const newPlay: PlayLog =
        {
          artist: currentVinyl.artist,
          album: currentVinyl.album,
          listeners: [user.id],
          date: new Date()
        }
        await processNewPlay(newPlay);

        await interaction.followUp({
          content: `▶️ **Play logged:** ${currentVinyl.artist} — *${currentVinyl.album}*`,
        });
      }

      if (interaction.customId === "reroll") {
        let nextVinyl = getRandomVinyl(vinyls);
        if (vinyls.length > 1) {
          while (nextVinyl.album === currentVinyl.album) {
            nextVinyl = getRandomVinyl(vinyls);
          }
        }
        currentVinyl = nextVinyl;

        await interaction.update({
          embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album)],
          components: [buildRow({ showPlay: true })],
        });
      }
    });

    collector.on("end", (_collected, reason) => {
      if (reason === "played") return;
      sentMessage
        .edit({
          components: [buildRow({ showPlay: true, disabled: true })],
        })
        .catch(() => {
          // Ignore this. Message likely deleted.
         });
    });
  } catch (err) {
    console.error("Error in ProcessRandomAlbum:", err);
    await message.reply("❌ Failed to fetch random entry.");
  }
};