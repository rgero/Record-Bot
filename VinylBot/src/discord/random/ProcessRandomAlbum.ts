import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, MessageActionRowComponentBuilder } from "discord.js";
import { getUnplayedVinyls, getVinyls, getVinylsByQuery, getVinylsByTags, getVinylsLikedByUserID } from "../../services/vinyls.api.js";
import { getUserById, getUserByName } from "../../services/users.api.js";

import { PlayLog } from "../../interfaces/PlayLog.js";
import { SearchResponse } from "../../interfaces/SearchResponse.js";
import { User } from "../../interfaces/User.js";
import { addPlayLog } from "../../services/plays.api.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { parseCommand } from "../../utils/parseCommand.js";

const buildEmbed = (artist: string, album: string, title?: string) => {
  const description = `🎵 **${artist}**\n💿 *${album}*`;
  
  return {
    // If title exists, add a space then the title; otherwise, add nothing.
    title: `🎲 Random Pick${title ? ` ${title}` : ""}`,
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

  buttons.push(
    new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  )

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);
};

const getRandomVinyl = (list: SearchResponse[]): SearchResponse => {
  return list[Math.floor(Math.random() * list.length)];
};

export const ProcessRandomAlbum = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;

    const { mentions, flags, query } = context;

    let targetUser: User | null = null;
    let vinyls: SearchResponse[] = [];

    let titleSuffix = "";

    targetUser = await getUserByName(getDropdownValue(message.author.username));
    if (flags.indexOf("unplayed") !== -1) {
      vinyls = (await getUnplayedVinyls(targetUser!.id)) as SearchResponse[];
      titleSuffix = "from Your Unplayed";
    } else if (flags.indexOf("tag") !== -1) {
      vinyls = await getVinylsByTags(query.split(','))
      titleSuffix = "by Tags"
    } else if (mentions.length === 1) {
      targetUser = await getUserById(mentions[0]); 
      titleSuffix = `liked by ${targetUser ? targetUser.name : "Unknown User"}`;
      if (targetUser) {
        vinyls = (await getVinylsLikedByUserID(mentions[0])) as SearchResponse[];
      }
    } else if (query) {
      vinyls = await getVinylsByQuery({ type: "search", term: query });
      targetUser = await getUserByName(getDropdownValue(message.author.username));
    } else {
      vinyls = (await getVinyls()) as SearchResponse[];
      targetUser = await getUserByName(getDropdownValue(message.author.username));
    }

    if (!targetUser) {
      return message.reply("❌ No matching user profile found for logging.");
    }

    if (!vinyls || vinyls.length === 0) {
      const msg = query ? `❌ No entries found matching "${query}".` : "❌ The requested collection is empty.";
      return message.reply(msg);
    }

    let currentVinyl = getRandomVinyl(vinyls);
    const sentMessage = await message.reply({
      embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album, titleSuffix)],
      components: [buildRow({ showPlay: true })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, 
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the person who rolled this can use the buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "play") {
        collector.stop("played");

        await interaction.update({ components: [] });

        if (!currentVinyl?.id) {
          await interaction.followUp({ content: "⚠️ Album data missing, couldn't log play." });
          return;
        }

        const newPlay: PlayLog = {
          album_id: currentVinyl.id,
          listeners: [targetUser!.id],
          date: new Date(),
        };

        try {
          await addPlayLog(newPlay);
          await interaction.followUp({
            content: `▶️ **Play logged for ${targetUser!.name}:** ${currentVinyl.artist} — *${currentVinyl.album}*`,
          });
        } catch (playErr) {
          console.error("Failed to log play:", playErr);
          await interaction.followUp({ content: "⚠️ Failed to log play to database." });
        }
      }

      if (interaction.customId === "reroll") {
        if (vinyls.length > 1) {
          let nextVinyl;
          do {
            nextVinyl = getRandomVinyl(vinyls);
          } while (nextVinyl.album === currentVinyl.album);
          currentVinyl = nextVinyl;
        }

        await interaction.update({
          embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album, titleSuffix)],
          components: [buildRow({ showPlay: true })],
        });
      }

      if (interaction.customId === "cancel")
      {
        collector.stop("cancelled");

        return await interaction.update({
          content: "🎲 Random pick cancelled.",
          embeds: [],
          components: [],
        });
      }
    });

    collector.on("end", (_collected, reason) => {
      if (reason === "played" || reason === "cancelled") return;
      sentMessage.edit({
        components: [buildRow({ showPlay: true, disabled: true })],
      }).catch(() => {});
    });

  } catch (err) {
    console.error("Error in ProcessRandomAlbum:", err);
    await message.reply("❌ An unexpected error occurred.");
  }
};