import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageActionRowComponentBuilder } from "discord.js";
import { getUnplayedVinyls, getVinyls, getVinylsByQuery, getVinylsByTags, getVinylsLikedByUserID } from "../../services/vinyls.api.js";
import { getUserById, getUserByName } from "../../services/users.api.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { PlayLog } from "../../interfaces/PlayLog.js";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js"; // Import Vinyl interface
import { addPlayLog } from "../../services/plays.api.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";

// --- Helper from ProcessInfo ---
const limit = (str: string | undefined | null, max: number) => {
  if (!str) return "—";
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
};

// --- Replicated Rich Embed Builder ---
const buildVinylEmbed = async (vinyl: Vinyl, titleSuffix: string) => {
  return new EmbedBuilder()
    .setTitle(`🎲 Random Pick ${titleSuffix}`.trim())
    .setDescription(`**${escapeColons(vinyl.artist)} — ${escapeColons(vinyl.album)}**`)
    .setColor(0x8b5cf6) // Matching ProcessInfo's purple
    .setThumbnail(vinyl.imageUrl || null)
    .addFields(
      {
        name: "Length",
        value: vinyl.length ? `${vinyl.length} min` : "Unknown",
        inline: true,
      },
    )
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
  );
  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);
};

const getRandomVinyl = (list: Vinyl[]): Vinyl => {
  return list[Math.floor(Math.random() * list.length)];
};

export const ProcessRandomAlbum = async (message: Message, context: CommandContext) => {
  try {
    const { mentions, flags, query } = context;
    let targetUser: User | null = null;
    let vinyls: Vinyl[] = [];
    let titleSuffix = "";

    if (mentions && mentions.length > 1) {
      return message.reply("❌ Can only have 1 mention");
    }

    // Logic for fetching the list remains the same...
    targetUser = await getUserByName(getDropdownValue(message.author.username));
    if (flags.indexOf("unplayed") !== -1) {
      vinyls = (await getUnplayedVinyls(targetUser!.id, mentions[0], query)) as Vinyl[];
      titleSuffix = "from Your Unplayed";
    } else if (flags.indexOf("tag") !== -1) {
      vinyls = await getVinylsByTags(query.split(','));
      titleSuffix = "by Tags";
    } else if (mentions.length === 1) {
      targetUser = await getUserById(mentions[0]); 
      titleSuffix = `liked by ${targetUser ? targetUser.name : "Unknown User"}`;
      if (targetUser) {
        vinyls = (await getVinylsLikedByUserID(mentions[0])) as Vinyl[];
      }
    } else if (query) {
      vinyls = await getVinylsByQuery({ type: "search", term: query });
    } else {
      vinyls = (await getVinyls()) as Vinyl[];
    }

    if (!targetUser) return message.reply("❌ No matching user profile found for logging.");
    if (!vinyls || vinyls.length === 0) return message.reply("❌ No entries found.");

    let currentSelection = getRandomVinyl(vinyls);

    let currentEmbed = await buildVinylEmbed(currentSelection, titleSuffix);

    const sentMessage = await message.reply({
      embeds: [currentEmbed],
      components: [buildRow({ showPlay: true })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, 
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "Only the person who rolled this can use the buttons.", ephemeral: true });
      }

      if (interaction.customId === "play") {
        collector.stop("played");
        await interaction.update({ components: [] });

        const newPlay: PlayLog = {
          album_id: currentSelection.id!,
          listeners: [targetUser!.id],
          date: new Date(),
        };

        try {
          await addPlayLog(newPlay);
          await interaction.followUp({
            content: `▶️ **Play logged for ${targetUser!.name}:** ${currentSelection.artist} — *${currentSelection.album}*`,
          });
        } catch (playErr) {
          await interaction.followUp({ content: "⚠️ Failed to log play to database." });
        }
      }

      if (interaction.customId === "reroll") {
        if (vinyls.length > 1) {
          let nextVinyl;
          do {
            nextVinyl = getRandomVinyl(vinyls);
          } while (nextVinyl.album === currentSelection.album);
          
          currentSelection = nextVinyl;
        }

        currentEmbed = await buildVinylEmbed(currentSelection, titleSuffix);
        await interaction.update({
          embeds: [currentEmbed],
          components: [buildRow({ showPlay: true })],
        });
      }

      if (interaction.customId === "cancel") {
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